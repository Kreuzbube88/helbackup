import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '../db/database.js'
import { getMasterKeySalt, encryptData, decryptData } from './masterKey.js'
import { logger } from './logger.js'

interface EncryptionConfigRow {
  id: number
  encryption_password_hash: string
  recovery_key_hash: string
  master_key_salt: string
  encrypted_password: string | null
  created_at: string
  last_password_change: string | null
}

export function generateEncryptionRecoveryKey(): string {
  const blocks = ['HLBK', 'ENC']
  for (let i = 0; i < 4; i++) {
    blocks.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return blocks.join('-')
}

// Use recoveryKey.ts helpers for consistent hashing (bcrypt cost 12)
async function hashKey(key: string): Promise<string> {
  const normalized = key.replace(/-/g, '').toUpperCase()
  return bcrypt.hash(normalized, 12)
}

async function verifyKey(key: string, hash: string): Promise<boolean> {
  const normalized = key.replace(/-/g, '').toUpperCase()
  return bcrypt.compare(normalized, hash)
}

export function isEncryptionConfigured(): boolean {
  const config = db.prepare('SELECT id FROM encryption_config WHERE id = 1').get()
  return !!config
}

export async function setupEncryption(password: string): Promise<string> {
  if (isEncryptionConfigured()) {
    throw new Error('Encryption already configured')
  }

  const recoveryKey = generateEncryptionRecoveryKey()
  const passwordHash = await bcrypt.hash(password, 12)
  const recoveryKeyHash = await hashKey(recoveryKey)
  const salt = getMasterKeySalt()

  // Encrypt the actual password for runtime use
  const encryptedPassword = encryptData(password, salt)

  db.prepare(`
    INSERT INTO encryption_config
      (id, encryption_password_hash, recovery_key_hash, master_key_salt, encrypted_password, created_at)
    VALUES (1, ?, ?, ?, ?, ?)
  `).run(passwordHash, recoveryKeyHash, salt, encryptedPassword, new Date().toISOString())

  logger.warn('Encryption configured — recovery key generated')

  return recoveryKey
}

export async function verifyEncryptionPassword(password: string): Promise<boolean> {
  const config = db.prepare('SELECT encryption_password_hash FROM encryption_config WHERE id = 1').get() as
    | Pick<EncryptionConfigRow, 'encryption_password_hash'>
    | undefined

  if (!config) {
    throw new Error('Encryption not configured')
  }

  return bcrypt.compare(password, config.encryption_password_hash)
}

export function getEncryptionPassword(): string {
  const config = db.prepare('SELECT * FROM encryption_config WHERE id = 1').get() as
    | EncryptionConfigRow
    | undefined

  if (!config) {
    throw new Error('Encryption not configured')
  }

  if (!config.encrypted_password) {
    throw new Error('Encrypted password not stored — re-run encryption setup')
  }

  try {
    return decryptData(config.encrypted_password, config.master_key_salt)
  } catch (err: unknown) {
    throw new Error(`Failed to decrypt encryption password: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function resetEncryptionPassword(recoveryKey: string, newPassword: string): Promise<void> {
  const config = db.prepare('SELECT * FROM encryption_config WHERE id = 1').get() as
    | EncryptionConfigRow
    | undefined

  if (!config) {
    throw new Error('Encryption not configured')
  }

  const valid = await verifyKey(recoveryKey, config.recovery_key_hash)
  if (!valid) {
    throw new Error('Invalid recovery key')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const encryptedPassword = encryptData(newPassword, config.master_key_salt)

  db.prepare(`
    UPDATE encryption_config
    SET encryption_password_hash = ?, encrypted_password = ?, last_password_change = ?
    WHERE id = 1
  `).run(passwordHash, encryptedPassword, new Date().toISOString())

  logger.warn('Encryption password reset via recovery key')
}
