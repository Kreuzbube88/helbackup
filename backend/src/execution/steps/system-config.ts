import { spawn } from 'node:child_process'
import { executeRsync } from '../../tools/rsync.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup, finalizeLocalBackup } from './nasTransfer.js'
import type { JobExecutionEngine } from '../engine.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import { getSettingInt } from '../../utils/settings.js'
import path from 'path'
import fs from 'fs/promises'

export interface SystemConfigBackupConfig {
  destination: string
  targetId: string
  includeItems: string[]
  useEncryption: boolean
  bwlimitKb?: number
  dryRun?: boolean
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
  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as { type: string; config: string } | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: { path: string }
  try {
    targetConfig = JSON.parse(target.config) as { path: string }
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'system-config', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('system-config') : destPath + '.partial'
  if (!nasConfig) await fs.mkdir(workDir, { recursive: true })
  engine.registerWorkDir(workDir)

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

          const itemDestPath = path.join(workDir, item)
          await fs.mkdir(itemDestPath, { recursive: true })

          const stats = await fs.stat(sourcePath)

          if (stats.isDirectory()) {
            // Per-step limit takes precedence over global setting
            const bwLimit = config.bwlimitKb ?? getSettingInt('rsync_bwlimit_kb', 0)
            const rsyncResult = await executeRsync({
              source: sourcePath,
              destination: itemDestPath,
              // System config must be byte-exact — fail on partial/vanished (rsync 23/24)
              strict: true,
              ...(bwLimit > 0 ? { bwLimit } : {}),
              ...(config.dryRun ? { dryRun: true } : {}),
              onRegisterProcess: p => engine.registerChildProcess(p),
              onProgress: (() => { let last = -1; return (data: { percent: number }) => {
                if (Math.floor(data.percent / 10) > Math.floor(last / 10)) { last = data.percent; engine.log('debug', 'system', `Progress: ${data.percent}%`) }
              } })(),
            })
            engine.addTransferred(rsyncResult.filesTransferred, rsyncResult.bytesTransferred)
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

  await fs.writeFile(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting system config...')
    try {
      const encryptionPassword = getEncryptionPassword()
      const tarFile = path.join(workDir, 'system-config.tar.gz')

      await new Promise<void>((resolve, reject) => {
        const tar = spawn('tar', ['-czf', tarFile, '-C', workDir, '.', '--exclude=system-config.tar.gz'])
        tar.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
        tar.on('error', reject)
      })

      const encryptedFile = `${tarFile}.gpg`
      await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
      await fs.unlink(tarFile)

      // Remove unencrypted config files — keep only .gpg
      const cleanEntries = await fs.readdir(workDir)
      for (const entry of cleanEntries) {
        if (!entry.endsWith('.gpg')) {
          await fs.rm(path.join(workDir, entry), { recursive: true, force: true })
        }
      }

      engine.log('info', 'system', 'System config encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `System config encryption failed: ${msg}`)
      throw err
    }
  }

  if (!config.dryRun) {
    const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
    if (!nasConfig) await finalizeLocalBackup(workDir, destPath, engine)
    engine.recordBackupPath('system_config', destPath, config.targetId, nasChecksums)
  } else {
    engine.log('info', 'system', 'dry-run: skipping NAS transfer, finalize and manifest record')
  }
  engine.log('info', 'system', 'System config backup completed')
}
