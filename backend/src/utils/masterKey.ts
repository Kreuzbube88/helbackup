import crypto from 'node:crypto'
import { db } from '../db/database.js'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required!')
}

export function getMasterKeySalt(): string {
  const config = db.prepare('SELECT master_key_salt FROM encryption_config WHERE id = 1').get() as
    | { master_key_salt: string }
    | undefined

  if (config?.master_key_salt) {
    return config.master_key_salt
  }

  // Generate new salt — only used during initial encryption setup
  return crypto.randomBytes(32).toString('hex')
}

export function deriveMasterKey(salt: string): Buffer {
  return crypto.pbkdf2Sync(JWT_SECRET, salt, 100000, 32, 'sha256')
}

export function encryptData(data: string, salt: string): string {
  const masterKey = deriveMasterKey(salt)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptData(encryptedData: string, salt: string): string {
  const masterKey = deriveMasterKey(salt)
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
