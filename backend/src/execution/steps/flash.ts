import { spawn } from 'node:child_process'
import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { executeRsync } from '../../tools/rsync.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup } from './nasTransfer.js'
import type { JobExecutionEngine } from '../engine.js'
import type { TargetRow } from '../../types/rows.js'

interface TargetConfig {
  path: string
}

export interface FlashBackupConfig {
  source: string   // /unraid/boot (mounted /boot)
  targetId: string
  useEncryption: boolean
}

export async function executeFlashBackup(
  config: FlashBackupConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting Flash Drive backup')

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: TargetConfig
  try {
    targetConfig = JSON.parse(target.config) as TargetConfig
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'flash', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('flash') : destPath
  if (!nasConfig) await fs.mkdir(destPath, { recursive: true })

  engine.log('info', 'system', `Destination: ${destPath}`)

  const result = await executeRsync({
    source: config.source,
    destination: workDir,
    bwLimit: 51200, // 50 MB/s
    excludePatterns: ['previous/', 'System Volume Information/', '*.tmp'],
    onProgress: (() => { let last = -1; return ({ percent, speed }: { percent: number; speed: string }) => {
      if (Math.floor(percent / 10) > Math.floor(last / 10)) { last = percent; engine.log('info', 'system', `Progress: ${percent}% — ${speed}`) }
    } })(),
    onLog: msg => {
      const line = msg.trim()
      if (line) engine.log('debug', 'file', line)
    },
  })

  engine.addTransferred(result.filesTransferred, result.bytesTransferred)
  engine.log('info', 'system', `Flash backup done: ${result.filesTransferred} files, ${result.bytesTransferred} bytes transferred`)

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting flash backup...')
    try {
      const encryptionPassword = getEncryptionPassword()
      const tarFile = path.join(workDir, 'flash-backup.tar.gz')

      await new Promise<void>((resolve, reject) => {
        const tar = spawn('tar', ['-czf', tarFile, '--exclude=flash-backup.tar.gz', '--exclude=*.gpg', '-C', workDir, '.'])
        tar.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar failed with code ${code}`)))
        tar.on('error', reject)
      })

      const encryptedFile = `${tarFile}.gpg`
      await encryptFileGPG(tarFile, encryptedFile, encryptionPassword)
      await fs.unlink(tarFile)

      engine.log('info', 'system', 'Flash backup encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Flash encryption failed: ${msg}`)
      throw err
    }
  }

  if (nasConfig) await transferAndCleanup(workDir, destPath, nasConfig, engine)
  engine.recordBackupPath('flash', destPath, config.targetId)
}
