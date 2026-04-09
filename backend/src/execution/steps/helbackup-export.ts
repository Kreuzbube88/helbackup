import path from 'path'
import fs from 'fs/promises'
import { db } from '../../db/database.js'
import { createTarArchive } from '../../tools/tar.js'
import { getEncryptionPassword, isEncryptionConfigured } from '../../utils/encryptionKey.js'
import { deriveMasterKey } from '../../utils/masterKey.js'
import { encryptFileGPG } from '../../utils/gpgEncrypt.js'
import type { JobExecutionEngine } from '../engine.js'

/**
 * Return the best available password for SSH key encryption:
 * - If user-level encryption is configured, use that password (same recovery path)
 * - Otherwise derive a stable password from JWT_SECRET via the master key
 *   so SSH keys are always encrypted even before the user sets up job encryption.
 */
function getSshKeyEncryptionPassword(): string {
  if (isEncryptionConfigured()) {
    return getEncryptionPassword()
  }
  // Stable 32-byte key derived from JWT_SECRET — no salt needed here because the
  // purpose is "encrypt this file for this installation", not user authentication.
  const masterKey = deriveMasterKey('helbackup-ssh-key-export')
  return masterKey.toString('hex')
}

export async function exportHELBACKUP(destPath: string, engine: JobExecutionEngine): Promise<string> {
  engine.log('info', 'system', 'Exporting HELBACKUP configuration...')

  const exportDir = '/tmp/helbackup-export'
  await fs.mkdir(exportDir, { recursive: true })

  // ACID-safe DB snapshot while running
  const backupDbPath = path.join(exportDir, 'helbackup.db')
  engine.log('info', 'system', 'Creating database snapshot (VACUUM INTO)...')
  db.prepare(`VACUUM INTO ?`).run(backupDbPath)
  engine.log('info', 'system', 'Database snapshot created')

  // Copy + GPG-encrypt SSH keys (always, regardless of job-level encryption)
  const sshSrc = '/app/config/ssh'
  let sshKeysEntry: string
  try {
    await fs.access(sshSrc)
    const sshStage = path.join(exportDir, 'ssh')
    await fs.cp(sshSrc, sshStage, { recursive: true })

    // Wrap ssh/ into a tar, then GPG-encrypt it with the master password
    const sshTar = path.join(exportDir, 'ssh.tar.gz')
    await createTarArchive({ source: sshStage, destination: sshTar, compress: true })
    const sshEncrypted = `${sshTar}.gpg`
    const masterPassword = getSshKeyEncryptionPassword()
    await encryptFileGPG(sshTar, sshEncrypted, masterPassword)

    // Remove plaintext artefacts
    await fs.rm(sshStage, { recursive: true, force: true })
    await fs.unlink(sshTar)

    sshKeysEntry = 'ssh.tar.gz.gpg'
    engine.log('info', 'system', 'SSH keys exported and encrypted')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ENOENT') || msg.includes('no such file')) {
      sshKeysEntry = 'none'
      engine.log('info', 'system', 'No SSH keys to export')
    } else {
      throw err
    }
  }

  // Metadata
  await fs.writeFile(
    path.join(exportDir, 'metadata.json'),
    JSON.stringify({
      version: 'v1.0',
      exportDate: new Date().toISOString(),
      database: 'helbackup.db',
      sshKeys: sshKeysEntry,
      sshKeyEncryption: 'gpg-aes256',
    }, null, 2)
  )

  const tarPath = path.join(destPath, 'helbackup-export.tar.gz')
  await createTarArchive({ source: exportDir, destination: tarPath, compress: true })

  await fs.rm(exportDir, { recursive: true, force: true })

  engine.log('info', 'system', `HELBACKUP export: ${tarPath}`)
  return tarPath
}
