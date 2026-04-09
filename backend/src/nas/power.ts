import { wakeNAS, waitForHostOffline } from './wol.js'
import { testSSHConnection, shutdownNAS, type SSHConfig } from './ssh.js'
import { logger } from '../utils/logger.js'

export interface NASPowerConfig {
  enabled: boolean
  mac: string
  ip: string
  sshConfig: SSHConfig
  autoShutdown: boolean
}

const SHUTDOWN_VERIFY_TIMEOUT_MS = 120_000

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
    const result = await shutdownNAS(config.sshConfig)
    if (!result.success) {
      logger.error(`NAS ${config.ip} shutdown command failed: ${result.error ?? 'unknown error'}`)
      return
    }
    logger.info(`NAS ${config.ip} shutdown command dispatched, verifying host goes offline...`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Failed to issue NAS shutdown to ${config.ip}: ${msg}`)
    return
  }

  const wentOffline = await waitForHostOffline(config.ip, SHUTDOWN_VERIFY_TIMEOUT_MS)
  if (wentOffline) {
    logger.info(`NAS ${config.ip} powered off`)
  } else {
    logger.error(
      `NAS ${config.ip} shutdown command accepted but host is still reachable after ${SHUTDOWN_VERIFY_TIMEOUT_MS / 1000}s`,
    )
  }
}
