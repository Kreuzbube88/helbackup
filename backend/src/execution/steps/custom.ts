import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { executeRsync } from '../../tools/rsync.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup } from './nasTransfer.js'
import { spawn } from 'node:child_process'
import type { JobExecutionEngine } from '../engine.js'
import type { TargetRow } from '../../types/rows.js'

interface TargetConfig {
  path: string
}

export interface CustomBackupConfig {
  sourcePath: string
  targetId: string
  excludePatterns: string[]
  useEncryption: boolean
}

export async function executeCustomBackup(
  config: CustomBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', `Starting custom backup: ${config.sourcePath}`)

  const exists = await fs.access(config.sourcePath).then(() => true).catch(() => false)
  if (!exists) throw new Error(`Source path not found: ${config.sourcePath}`)

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: TargetConfig
  try {
    targetConfig = JSON.parse(target.config) as TargetConfig
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const folderName = path.basename(config.sourcePath) || 'custom'
  const destPath = path.join(targetConfig.path, 'custom', folderName, new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('custom') : destPath
  if (!nasConfig) await fs.mkdir(destPath, { recursive: true })

  engine.log('info', 'system', `Source: ${config.sourcePath}`)
  engine.log('info', 'system', `Destination: ${destPath}`)

  const result = await executeRsync({
    source: config.sourcePath,
    destination: workDir,
    excludePatterns: config.excludePatterns ?? [],
    onProgress: (() => { let last = -1; return ({ percent, speed }: { percent: number; speed: string }) => {
      if (percent < last) last = -1
      if (Math.floor(percent / 10) > Math.floor(last / 10)) { last = percent; engine.log('info', 'system', `Progress: ${percent}% — ${speed}`) }
    } })(),
    onLog: msg => {
      const line = msg.trim()
      if (line) engine.log('debug', 'file', line)
    },
  })

  engine.addTransferred(result.filesTransferred, result.bytesTransferred)
  engine.log('info', 'system', `Custom backup done: ${result.filesTransferred} files, ${result.bytesTransferred} bytes transferred`)

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting custom backup...')
    try {
      const encryptionPassword = getEncryptionPassword()
      const tarFile = path.join(workDir, 'custom-backup.tar.gz')

      await new Promise<void>((resolve, reject) => {
        const tar = spawn('tar', ['-czf', tarFile, '--exclude=custom-backup.tar.gz', '--exclude=*.gpg', '-C', workDir, '.'])
        tar.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
        tar.on('error', reject)
      })

      const encryptedFile = `${tarFile}.gpg`
      await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
      await fs.unlink(tarFile)

      engine.log('info', 'system', 'Custom backup encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Custom backup encryption failed: ${msg}`)
      throw err
    }
  }

  const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
  engine.recordBackupPath('custom', destPath, config.targetId, nasChecksums)
}
