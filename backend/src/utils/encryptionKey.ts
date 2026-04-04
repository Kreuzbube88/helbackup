import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '../db/database.js'
import { getMasterKeySalt } from './masterKey.js'
import { logger } from './logger.js'

interface EncryptionConfigRow {
  id: number
  encryption_password_hash: string
  recovery_key_hash: string
  master_key_salt: string
  created_at: string
  last_password_change: string | null
}

export function generateEncryptionRecoveryKey(): string {
  const blocks = ['HLBK', 'ENC']
  for (let i = 0; i < 4; i++) {
    blocks.push(crypto.randomBytes(2).toString('hex').toUpperCase())
  }
  return blocks.join('-')
}

export async function hashRecoveryKey(key: string): Promise<string> {
  const normalized = key.replace(/-/g, '').toUpperCase()
  return bcrypt.hash(normalized, 10)
}

export async function verifyRecoveryKey(key: string, hash: string): Promise<boolean> {
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
  const passwordHash = await bcrypt.hash(password, 10)
  const recoveryKeyHash = await hashRecoveryKey(recoveryKey)
  const salt = getMasterKeySalt()

  db.prepare(`
    INSERT INTO encryption_config (id, encryption_password_hash, recovery_key_hash, master_key_salt, created_at)
    VALUES (1, ?, ?, ?, ?)
  `).run(passwordHash, recoveryKeyHash, salt, new Date().toISOString())

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

export async function resetEncryptionPassword(recoveryKey: string, newPassword: string): Promise<void> {
  const config = db.prepare('SELECT * FROM encryption_config WHERE id = 1').get() as
    | EncryptionConfigRow
    | undefined

  if (!config) {
    throw new Error('Encryption not configured')
  }

  const valid = await verifyRecoveryKey(recoveryKey, config.recovery_key_hash)
  if (!valid) {
    throw new Error('Invalid recovery key')
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  db.prepare(`
    UPDATE encryption_config
    SET encryption_password_hash = ?, last_password_change = ?
    WHERE id = 1
  `).run(passwordHash, new Date().toISOString())

  logger.warn('Encryption password reset via recovery key')
}
