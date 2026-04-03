import { executeRclone } from '../../tools/rclone.js'
import { JobExecutionEngine } from '../engine.js'

export interface CloudBackupConfig {
  source: string
  remote: string
  destination: string
  configPath?: string
}

export async function executeCloudBackup(
  config: CloudBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'network', `Starting cloud backup to ${config.remote}`)

  try {
    await executeRclone({
      source: config.source,
      destination: config.destination,
      remote: config.remote,
      configPath: config.configPath,
      onProgress: (data) => {
        engine.log('info', 'network', `Upload: ${data.percent}% - ${data.speed}`, undefined, {
          progress: {
            current: parseInt(data.transferred.replace(/\s+/g, '')),
            total: 0,
            unit: 'bytes',
            speed: parseFloat(data.speed) * 1024 * 1024,
            eta_seconds: parseInt(data.eta.replace(/[^\d]/g, '')),
          },
        })
      },
      onLog: (msg) => {
        engine.log('debug', 'network', msg.trim())
      },
    })

    engine.log('info', 'network', 'Cloud backup completed successfully')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    engine.log('error', 'network', `Cloud backup failed: ${message}`, undefined, {
      error: { code: 'CLOUD_BACKUP_FAILED', stack, suggestion: 'Check rclone config and network connection' },
    })
    throw err
  }
}
