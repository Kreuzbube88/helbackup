import { createSocket, type Socket } from 'dgram'
import { spawn } from 'child_process'
import { networkInterfaces } from 'os'
import { logger } from '../utils/logger.js'

export type PowerLogCallback = (level: 'info' | 'warn' | 'error', message: string) => void

export interface WakeOptions {
  mac: string
  ip?: string
  wait?: boolean             // default true when ip is set; false = fire packets only
  maxAttempts?: number       // default 5
  attemptTimeoutMs?: number  // default 30_000
  timeout?: number           // kept for API back-compat, unused by attempt loop
  onLog?: PowerLogCallback   // receives progress messages in parallel with container logger
}

interface Sender {
  iface: string
  localAddr: string
  destinations: string[]
  socket?: Socket
}

const PORTS = [9, 7]
const PACKET_COUNT = 16
const PACKET_INTERVAL_MS = 150

export function normalizeMac(mac: string): string {
  const hex = mac.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length !== 12) throw new Error(`Invalid MAC address: "${mac}"`)
  return hex.match(/.{2}/g)!.join(':').toUpperCase()
}

export function computeSubnetBroadcast(addr: string, netmask: string): string {
  const a = addr.split('.').map(Number)
  const m = netmask.split('.').map(Number)
  if (a.length !== 4 || m.length !== 4) return '255.255.255.255'
  const b = a.map((oct, i) => (oct & m[i]!) | (~m[i]! & 0xff))
  return b.join('.')
}

export function enumerateSenders(targetIp?: string): Sender[] {
  const ifaces = networkInterfaces()
  const senders: Sender[] = []

  for (const [name, infos] of Object.entries(ifaces)) {
    if (!infos) continue
    for (const info of infos) {
      if (info.internal) continue
      if (info.family !== 'IPv4') continue
      if (!info.netmask) continue

      const subnetBroadcast = computeSubnetBroadcast(info.address, info.netmask)
      const destinations = new Set<string>([subnetBroadcast, '255.255.255.255'])
      if (targetIp) destinations.add(targetIp)

      senders.push({
        iface: name,
        localAddr: info.address,
        destinations: Array.from(destinations),
      })
    }
  }
  return senders
}

function buildMagicPacket(mac: string): Buffer {
  const macBytes = Buffer.from(mac.replace(/:/g, ''), 'hex')
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(macBytes)])
}

function createBoundSocket(localAddr: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createSocket({ type: 'udp4', reuseAddr: true })
    const onError = (err: Error) => { socket.close(); reject(err) }
    socket.once('error', onError)
    socket.bind({ address: localAddr, exclusive: false }, () => {
      socket.removeListener('error', onError)
      try {
        socket.setBroadcast(true)
      } catch (err) {
        socket.close()
        reject(err as Error)
        return
      }
      resolve(socket)
    })
  })
}

function sendMagic(socket: Socket, magic: Buffer, dst: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    socket.send(magic, 0, magic.length, port, dst, (err) => {
      if (err) {
        logger.debug(`WOL send failed dst=${dst}:${port}: ${err.message}`)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

async function runBurst(senders: Sender[], magic: Buffer): Promise<{ ok: number; total: number }> {
  let ok = 0
  let total = 0
  const ops: Promise<boolean>[] = []
  for (const s of senders) {
    if (!s.socket) continue
    for (const dst of s.destinations) {
      for (const port of PORTS) {
        total++
        ops.push(sendMagic(s.socket, magic, dst, port))
      }
    }
  }
  const results = await Promise.all(ops)
  for (const r of results) if (r) ok++
  return { ok, total }
}

/**
 * Sends one full multi-interface magic-packet burst (16 × 150ms) and closes
 * all sockets before returning. Throws if no interface could be bound or
 * every single packet send failed.
 */
async function sendBurstOnce(mac: string, targetIp?: string): Promise<void> {
  const magic = buildMagicPacket(mac)

  const senders = enumerateSenders(targetIp)
  if (senders.length === 0) {
    throw new Error('Wake-on-LAN: no usable IPv4 network interfaces found')
  }

  for (const s of senders) {
    try {
      s.socket = await createBoundSocket(s.localAddr)
    } catch (err) {
      logger.warn(`WOL bind failed on ${s.iface} (${s.localAddr}): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const active = senders.filter(s => s.socket)
  if (active.length === 0) {
    throw new Error('Wake-on-LAN: failed to bind any interface')
  }

  const ifaceSummary = active.map(s => `${s.iface} ${s.localAddr}`).join(', ')
  const dstSummary = Array.from(new Set(active.flatMap(s => s.destinations))).join(', ')
  logger.info(`Wake-on-LAN ${mac} senders=[${ifaceSummary}] dst=[${dstSummary}] ports=[${PORTS.join(',')}]`)

  try {
    let okSum = 0
    let totalSum = 0
    for (let i = 0; i < PACKET_COUNT; i++) {
      const { ok, total } = await runBurst(active, magic)
      okSum += ok
      totalSum += total
      if (i < PACKET_COUNT - 1) await new Promise(r => setTimeout(r, PACKET_INTERVAL_MS))
    }
    logger.info(`Wake-on-LAN: sent ${okSum}/${totalSum} packets to ${mac}`)
    if (okSum === 0) throw new Error('Wake-on-LAN: all packet sends failed')
  } finally {
    for (const s of active) {
      try { s.socket?.close() } catch { /* ignore */ }
    }
  }
}

/** Single ICMP ping — resolves true on exit 0, false on any other outcome. */
function pingOnce(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('ping', ['-c', '1', '-W', '2', ip])
    p.on('close', (code) => resolve(code === 0))
    p.on('error', () => resolve(false))
  })
}

/**
 * Polls ICMP ping every 2s and resolves true on the first successful reply,
 * or false if timeoutMs is exceeded. Does not send WOL packets — the outer
 * attempt loop owns retries.
 */
async function pingUntilOnline(ip: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  const POLL_MS = 2000
  while (Date.now() - start < timeoutMs) {
    if (await pingOnce(ip)) return true
    await new Promise(r => setTimeout(r, POLL_MS))
  }
  return false
}

/**
 * Polls ICMP ping every 5s and resolves true as soon as the host stops
 * responding (shutdown verification), or false if timeoutMs is exceeded.
 */
export async function waitForHostOffline(ip: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  const POLL_MS = 5000
  while (Date.now() - start < timeoutMs) {
    if (!(await pingOnce(ip))) return true
    await new Promise(r => setTimeout(r, POLL_MS))
  }
  return false
}

export async function wakeNAS(options: WakeOptions): Promise<void> {
  const mac = normalizeMac(options.mac)
  const maxAttempts = options.maxAttempts ?? 5
  const attemptTimeoutMs = options.attemptTimeoutMs ?? 30_000
  const wait = options.wait ?? true
  const onLog = options.onLog

  const report = (level: 'info' | 'warn' | 'error', msg: string): void => {
    if (level === 'info') logger.info(msg)
    else if (level === 'warn') logger.warn(msg)
    else logger.error(msg)
    onLog?.(level, msg)
  }

  // No-verify mode: either no IP to ping, or caller explicitly asked for fire-and-forget.
  if (!options.ip || !wait) {
    await sendBurstOnce(mac, options.ip)
    return
  }

  const startedAt = Date.now()
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    report('info', `WOL attempt ${attempt}/${maxAttempts} for ${options.ip}, waiting up to ${attemptTimeoutMs / 1000}s for ping reply...`)
    try {
      await sendBurstOnce(mac, options.ip)
    } catch (err) {
      report('warn', `WOL attempt ${attempt}/${maxAttempts} burst failed: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    if (await pingUntilOnline(options.ip, attemptTimeoutMs)) {
      const elapsed = Math.round((Date.now() - startedAt) / 1000)
      report('info', `NAS ${options.ip} online after ${attempt} attempt(s), ${elapsed}s`)
      return
    }
    report('warn', `WOL attempt ${attempt}/${maxAttempts} failed — NAS ${options.ip} did not respond within ${attemptTimeoutMs / 1000}s`)
  }
  throw new Error(`Wake-on-LAN failed: NAS ${options.ip} did not respond after ${maxAttempts} attempts`)
}
