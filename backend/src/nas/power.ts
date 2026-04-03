import { wakeNAS } from './wol.js'
import { testSSHConnection, shutdownNAS, type SSHConfig } from './ssh.js'
import { logger } from '../utils/logger.js'

export interface NASPowerConfig {
  enabled: boolean
  mac: string
  ip: string
  sshConfig: SSHConfig
  autoShutdown: boolean
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
  await wakeNAS({ mac: config.mac, ip: config.ip, timeout: 300000 })

  const verifyOnline = await testSSHConnection(config.sshConfig)
  if (!verifyOnline) {
    throw new Error('NAS woke up but SSH connection failed')
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
    if (result.success) {
      logger.info(`NAS ${config.ip} shutdown command sent successfully`)
    } else {
      logger.error(`NAS shutdown failed: ${result.error}`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`Failed to shutdown NAS: ${msg}`)
  }
}
