import wol from 'wake_on_lan'
import { spawn } from 'child_process'
import { logger } from '../utils/logger.js'

export interface WakeOptions {
  mac: string
  ip?: string
  timeout?: number
  wait?: boolean  // default true; false = send packet only, don't wait for NAS to boot
}

function getBroadcastAddress(ip: string): string {
  const parts = ip.split('.')
  if (parts.length !== 4) return '255.255.255.255'
  parts[3] = '255'
  return parts.join('.')
}

export async function wakeNAS(options: WakeOptions): Promise<void> {
  const timeout = options.timeout ?? 300000
  const broadcastAddress = options.ip ? getBroadcastAddress(options.ip) : '255.255.255.255'

  await new Promise<void>((resolve, reject) => {
    logger.info(`Sending Wake-on-LAN magic packet to ${options.mac} via ${broadcastAddress}`)
    wol.wake(options.mac, { address: broadcastAddress }, (error: Error | null) => {
      if (error) {
        logger.error(`Wake-on-LAN failed: ${error.message}`)
        reject(error)
        return
      }
      logger.info('Wake-on-LAN packet sent successfully')
      resolve()
    })
  })

  if (options.ip && (options.wait ?? true)) {
    await waitForHost(options.ip, timeout)
    logger.info(`NAS ${options.ip} is now online`)
  }
}

function waitForHost(ip: string, timeout: number): Promise<void> {
  const start = Date.now()
  const interval = 5000

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for NAS ${ip} to respond`))
        return
      }

      const ping = spawn('ping', ['-c', '1', '-W', '2', ip])
      ping.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          setTimeout(check, interval)
        }
      })
      ping.on('error', () => setTimeout(check, interval))
    }

    check()
  })
}
