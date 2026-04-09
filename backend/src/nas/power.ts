import { spawn } from 'child_process'
import { wakeNAS } from './wol.js'
import { testSSHConnection, shutdownNAS, type SSHConfig } from './ssh.js'
import { logger } from '../utils/logger.js'

export interface NASPowerConfig {
  enabled: boolean
  mac: string
  ip: string
  sshConfig: SSHConfig
  autoShutdown: boolean
  nasType?: string
}

export async function ensureNASOnline(config: NASPowerConfig): Promise<void> {
  if (!config.enabled) {
    logger.info('NAS power management disabled, skipping wake')
    return
  }

  logger.info(`Checking if NAS ${config.ip} is already online...`)
  const isOnline = await testSSHConnection(config.sshConfig)

  if (isOnline) {
    logger.info(`NAS ${config.ip} is already online`)
    return
  }

  logger.info(`NAS ${config.ip} is offline, sending Wake-on-LAN...`)
  try {
    await wakeNAS({ mac: config.mac, ip: config.ip, maxAttempts: 5, attemptTimeoutMs: 30_000 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`NAS ${config.ip} could not be woken up via Wake-on-LAN: ${msg}`)
  }

  // NAS responds to ping before SSH daemon is ready — retry SSH for up to 60s
  let sshReady = false
  for (let i = 0; i < 6; i++) {
    sshReady = await testSSHConnection(config.sshConfig)
    if (sshReady) break
    logger.info(`NAS ${config.ip} SSH not ready yet, retrying in 10s... (${i + 1}/6)`)
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  if (!sshReady) {
    throw new Error(`NAS ${config.ip} is online but SSH connection failed after 60s`)
  }
}

export async function shutdownNASIfEnabled(config: NASPowerConfig): Promise<void> {
  if (!config.enabled || !config.autoShutdown) {
    logger.info('NAS auto-shutdown disabled, skipping')
    return
  }

  logger.info(`Shutting down NAS ${config.ip}...`)
  try {
    const result = await shutdownNAS(config.sshConfig, config.nasType)
    if (!result.success) {
      logger.error(`NAS shutdown command returned non-zero: ${result.error ?? 'unknown'}`)
      return
    }
    // Verify: NAS should stop responding to ping within ~120s.
    const wentOffline = await waitForOffline(config.ip, 120_000)
    if (wentOffline) {
      logger.info(`NAS ${config.ip} powered off successfully`)
    } else {
      logger.error(`NAS ${config.ip} shutdown command accepted but host is still reachable after 120s`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Failed to shutdown NAS ${config.ip}: ${msg}`)
  }
}

/**
 * Poll ping every 5s, resolve true on first non-zero exit (host unreachable)
 * or false on overall timeout. Symmetric to pingUntilOnline in wol.ts.
 */
function waitForOffline(ip: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  const POLL_MS = 5000

  return new Promise((resolve) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) { resolve(false); return }
      const ping = spawn('ping', ['-c', '1', '-W', '2', ip])
      ping.on('close', (code) => {
        if (code !== 0) resolve(true)
        else setTimeout(check, POLL_MS)
      })
      ping.on('error', () => resolve(true))
    }
    check()
  })
}
