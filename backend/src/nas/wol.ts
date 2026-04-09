import { createSocket } from 'dgram'
import { spawn } from 'child_process'
import { logger } from '../utils/logger.js'

export interface WakeOptions {
  mac: string
  ip?: string
  timeout?: number
  wait?: boolean  // default true; false = send packet only, don't wait for NAS to boot
}

function normalizeMac(mac: string): string {
  const hex = mac.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length !== 12) throw new Error(`Invalid MAC address: "${mac}"`)
  return hex.match(/.{2}/g)!.join(':').toUpperCase()
}

function getBroadcastAddress(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return '255.255.255.255'
  parts[3] = '255'
  return parts.join('.')
}

function sendMagicPacket(mac: string, address: string): Promise<void> {
  const macBytes = Buffer.from(mac.replace(/:/g, ''), 'hex')
  const magic = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(macBytes)])
  return new Promise((resolve, reject) => {
    const socket = createSocket({ type: 'udp4', reuseAddr: true })
    socket.on('error', (err) => { socket.close(); reject(err) })
    socket.bind(() => {
      socket.setBroadcast(true)
      socket.send(magic, 0, magic.length, 9, address, (err) => {
        socket.close()
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

export async function wakeNAS(options: WakeOptions): Promise<void> {
  const timeout = options.timeout ?? 300000
  const mac = normalizeMac(options.mac)
  const broadcastAddress = options.ip ? getBroadcastAddress(options.ip) : '255.255.255.255'

  const sendBurst = async (): Promise<void> => {
    logger.info(`Sending Wake-on-LAN to ${mac} via ${broadcastAddress} (10 packets)`)
    for (let i = 0; i < 10; i++) {
      await sendMagicPacket(mac, broadcastAddress)
      if (i < 9) await new Promise(r => setTimeout(r, 200))
    }
    logger.info(`Wake-on-LAN burst sent to ${mac}`)
  }

  await sendBurst()

  if (options.ip && (options.wait ?? true)) {
    const resend = () => sendBurst().catch(err => logger.warn(`WOL retry failed: ${err instanceof Error ? err.message : String(err)}`))
    await waitForHost(options.ip, timeout, resend)
    logger.info(`NAS ${options.ip} is now online`)
  }
}

function waitForHost(ip: string, timeout: number, onWolRetry?: () => void): Promise<void> {
  const start = Date.now()
  const pingInterval = 5000
  const wolRetryInterval = 10000
  let lastWol = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for NAS ${ip} to respond`))
        return
      }

      if (onWolRetry && Date.now() - lastWol >= wolRetryInterval) {
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
