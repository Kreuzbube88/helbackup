import path from 'path'
import { db } from '../../db/database.js'
import { executeRsync } from '../../tools/rsync.js'
import type { JobExecutionEngine } from '../engine.js'

interface TargetRow {
  id: string
  config: string
}

interface TargetConfig {
  path: string
}

export interface FlashBackupConfig {
  source: string   // /unraid/boot (mounted /boot)
  targetId: string
}

export async function executeFlashBackup(
  config: FlashBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Flash Drive backup')

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  const targetConfig = JSON.parse(target.config) as TargetConfig
  const destPath = path.join(targetConfig.path, 'flash', new Date().toISOString().split('T')[0])

  engine.log('info', 'system', `Destination: ${destPath}`)

  const result = await executeRsync({
    source: config.source,
    destination: destPath,
    bwLimit: 51200, // 50 MB/s
    excludePatterns: ['previous/', 'System Volume Information/', '*.tmp'],
    onProgress: ({ percent, speed }) => {
      engine.log('info', 'system', `Progress: ${percent}% — ${speed}`)
    },
    onLog: msg => {
      const line = msg.trim()
      if (line) engine.log('debug', 'file', line)
    },
  })

  engine.log('info', 'system', `Flash backup done: ${result.bytesTransferred} bytes transferred`)
}
