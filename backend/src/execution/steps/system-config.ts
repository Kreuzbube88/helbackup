import { executeRsync } from '../../tools/rsync.js'
import { JobExecutionEngine } from '../engine.js'
import path from 'path'
import fs from 'fs/promises'

export interface SystemConfigBackupConfig {
  destination: string
  targetId: string
  includeItems: string[]
}

const CONFIG_PATHS: Record<string, string> = {
  boot_config: '/unraid/boot/config',
  network: '/etc/network',
  users: '/etc/passwd,/etc/shadow,/etc/group',
  plugins: '/unraid/boot/config/plugins',
}

export async function executeSystemConfigBackup(
  config: SystemConfigBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting system config backup')

  const { db } = await import('../../db/database.js')
  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as { config: string } | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  const targetConfig = JSON.parse(target.config) as { path: string }
  const destPath = path.join(targetConfig.path, 'system-config', new Date().toISOString().split('T')[0])
  await fs.mkdir(destPath, { recursive: true })

  engine.log('info', 'system', `Backing up system config to ${destPath}`)

  for (const item of config.includeItems) {
    try {
      const sourcePaths = CONFIG_PATHS[item]
      if (!sourcePaths) {
        engine.log('warn', 'system', `Unknown config item: ${item}`)
        continue
      }

      engine.log('info', 'system', `Backing up: ${item}`)

      for (const sourcePath of sourcePaths.split(',')) {
        try {
          const exists = await fs.access(sourcePath).then(() => true).catch(() => false)

          if (!exists) {
            engine.log('warn', 'file', `Path not found: ${sourcePath}`, undefined, {
              file: { path: sourcePath, size: 0, result: 'skipped', reason: 'not_found' },
            })
            continue
          }

          const itemDestPath = path.join(destPath, item)
          await fs.mkdir(itemDestPath, { recursive: true })

          const stats = await fs.stat(sourcePath)

          if (stats.isDirectory()) {
            await executeRsync({
              source: sourcePath,
              destination: itemDestPath,
              onProgress: (data) => {
                engine.log('debug', 'system', `Progress: ${data.percent}%`)
              },
            })
          } else {
            const destFile = path.join(itemDestPath, path.basename(sourcePath))
            await fs.copyFile(sourcePath, destFile)
            engine.log('info', 'file', `Copied: ${sourcePath}`, undefined, {
              file: { path: destFile, size: stats.size, result: 'copied' },
            })
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          const stack = err instanceof Error ? err.stack : undefined
          engine.log('error', 'file', `Failed to backup ${sourcePath}: ${message}`, undefined, {
            error: { code: 'CONFIG_BACKUP_FAILED', stack, suggestion: 'Check path and permissions' },
          })
        }
      }

      engine.log('info', 'system', `Completed: ${item}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Failed to backup ${item}: ${message}`)
    }
  }

  const manifest = {
    items: config.includeItems,
    backupDate: new Date().toISOString(),
    destination: destPath,
  }

  await fs.writeFile(path.join(destPath, 'manifest.json'), JSON.stringify(manifest, null, 2))

  engine.log('info', 'system', 'System config backup completed')
}
