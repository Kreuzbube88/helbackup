import { createSocket, type Socket } from 'dgram'
import { spawn } from 'child_process'
import { networkInterfaces } from 'os'
import { logger } from '../utils/logger.js'

export interface WakeOptions {
  mac: string
  ip?: string
  timeout?: number
  wait?: boolean  // default true; false = send packet only, don't wait for NAS to boot
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

function ipInSubnet(ip: string, addr: string, netmask: string): boolean {
  const ipP = ip.split('.').map(Number)
  const aP = addr.split('.').map(Number)
  const mP = netmask.split('.').map(Number)
  if (ipP.length !== 4 || aP.length !== 4 || mP.length !== 4) return false
  for (let i = 0; i < 4; i++) {
    if ((ipP[i]! & mP[i]!) !== (aP[i]! & mP[i]!)) return false
  }
  return true
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

export async function wakeNAS(options: WakeOptions): Promise<void> {
  const timeout = options.timeout ?? 300000
  const mac = normalizeMac(options.mac)
  const magic = buildMagicPacket(mac)

  const senders = enumerateSenders(options.ip)
  if (senders.length === 0) {
    throw new Error('Wake-on-LAN: no usable IPv4 network interfaces found')
  }

  // Bind a socket per sender; tolerate individual failures
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

  const sendBurst = async (): Promise<{ ok: number; total: number }> => {
    let okSum = 0
    let totalSum = 0
    for (let i = 0; i < PACKET_COUNT; i++) {
      const { ok, total } = await runBurst(active, magic)
      okSum += ok
      totalSum += total
      if (i < PACKET_COUNT - 1) await new Promise(r => setTimeout(r, PACKET_INTERVAL_MS))
    }
    return { ok: okSum, total: totalSum }
  }

  try {
    const { ok, total } = await sendBurst()
    logger.info(`Wake-on-LAN: sent ${ok}/${total} packets to ${mac}`)
    if (ok === 0) throw new Error('Wake-on-LAN: all packet sends failed')

    if (options.ip && (options.wait ?? true)) {
      const resend = () => sendBurst().catch(err => logger.warn(`WOL retry failed: ${err instanceof Error ? err.message : String(err)}`))
      await waitForHost(options.ip, timeout, resend)
      logger.info(`NAS ${options.ip} is now online`)
    }
  } finally {
    for (const s of active) {
      try { s.socket?.close() } catch { /* ignore */ }
    }
  }
}

function waitForHost(ip: string, timeout: number, onWolRetry: () => void): Promise<void> {
  const start = Date.now()
  let lastWol = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      const elapsed = Date.now() - start
      if (elapsed > timeout) {
        reject(new Error(`Timeout waiting for NAS ${ip} to respond`))
        return
      }

      // Aggressive in first 30s, calmer after
      const pingInterval = elapsed < 30000 ? 2000 : 5000
      const wolRetryInterval = elapsed < 30000 ? 3000 : 10000

      if (Date.now() - lastWol >= wolRetryInterval) {
        lastWol = Date.now()
        logger.info(`Resending Wake-on-LAN (NAS ${ip} not yet online)`)
        onWolRetry()
      }

      const ping = spawn('ping', ['-c', '1', '-W', '2', ip])
      ping.on('close', (code) => { if (code === 0) resolve(); else setTimeout(check, pingInterval) })
      ping.on('error', () => setTimeout(check, pingInterval))
    }

    check()
  })
}
