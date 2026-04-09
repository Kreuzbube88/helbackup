import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { exportHELBACKUP } from './helbackup-export.js'
import { getEncryptionPassword } from '../../utils/encryptionKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import { parseNasConfig, createNasTempDir, transferAndCleanup, finalizeLocalBackup } from './nasTransfer.js'
import type { JobExecutionEngine } from '../engine.js'
import type { TargetRow } from '../../types/rows.js'

export interface HELBACKUPSelfConfig {
  targetId: string
  useEncryption: boolean
}

export async function executeHELBACKUPSelfBackup(
  config: HELBACKUPSelfConfig,
  engine: JobExecutionEngine
): Promise<void> {
  engine.log('info', 'system', 'Starting HELBACKUP self-backup')

  const target = db.prepare('SELECT * FROM targets WHERE id = ?').get(config.targetId) as TargetRow | undefined
  if (!target) throw new Error(`Target not found: ${config.targetId}`)

  let targetConfig: { path: string }
  try {
    targetConfig = JSON.parse(target.config) as { path: string }
  } catch {
    throw new Error(`Invalid target config JSON for target ${config.targetId}`)
  }

  const nasConfig = await parseNasConfig(target)
  const destPath = path.join(targetConfig.path, 'helbackup', new Date().toISOString().split('T')[0])
  const workDir = nasConfig ? await createNasTempDir('helbackup') : destPath + '.partial'
  if (!nasConfig) await fs.mkdir(workDir, { recursive: true })

  // Export DB + SSH keys + metadata.json into workDir as helbackup-export.tar.gz
  const tarPath = await exportHELBACKUP(workDir, engine)

  if (config.useEncryption) {
    engine.log('info', 'system', 'Encrypting HELBACKUP backup...')
    try {
      const password = getEncryptionPassword()
      const encryptedPath = `${tarPath}.gpg`
      await encryptFileGPG(tarPath, encryptedPath, password)
      await fs.unlink(tarPath)
      engine.log('info', 'system', 'HELBACKUP backup encrypted')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      engine.log('error', 'system', `Encryption failed: ${msg}`)
      throw err
    }
  }

  const nasChecksums = nasConfig ? await transferAndCleanup(workDir, destPath, nasConfig, engine) : undefined
  if (!nasConfig) await finalizeLocalBackup(workDir, destPath, engine)
  engine.recordBackupPath('helbackup_self', destPath, config.targetId, nasChecksums)
  engine.log('info', 'system', 'HELBACKUP self-backup completed')
}
