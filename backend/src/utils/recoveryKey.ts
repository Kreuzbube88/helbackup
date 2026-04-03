import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

export function generateRecoveryKey(): string {
  const blocks = ['HLBK']
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
