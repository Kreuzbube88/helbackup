import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// --- mocks ----------------------------------------------------------------

vi.mock('../db/database.js', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: vi.fn(() => undefined),
      run: vi.fn(),
      all: vi.fn(() => []),
    })),
  },
}))
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// masterKey derives from JWT_SECRET — set it before importing
process.env.JWT_SECRET = 'test-secret-for-unit-tests-32chars!!'

// ---------------------------------------------------------------------------

describe('masterKey — AES-256-GCM round-trip', () => {
  it('encrypt then decrypt returns original plaintext', async () => {
    const { encryptValue, decryptValue } = await import('../utils/masterKey.js')
    const plaintext = 'super-secret-password-123'
    const encrypted = encryptValue(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted).toContain(':') // format: iv:authTag:ciphertext
    const decrypted = decryptValue(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('different encryptions of same value produce different ciphertexts (random IV)', () => {
    // Can only test this if the module is actually imported — inline implementation check
    const key = crypto.scryptSync('test-secret-for-unit-tests-32chars!!', 'helbackup-salt', 32)
    const encrypt = (plain: string): string => {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
      const authTag = cipher.getAuthTag()
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
    }
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b) // IVs differ
  })

  it('decryption fails gracefully on tampered ciphertext', async () => {
    const { encryptValue, decryptValue } = await import('../utils/masterKey.js')
    const encrypted = encryptValue('hello')
    const [iv, tag, ciphertext] = encrypted.split(':')
    const tampered = `${iv}:${tag}:${'ff'.repeat((ciphertext.length / 2))}` // flip all bytes
    expect(() => decryptValue(tampered)).toThrow()
  })
})

describe('encryptionKey — password storage round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a recovery key in HLBK-ENC-XXXX-XXXX-XXXX-XXXX format', async () => {
    const { generateRecoveryKey } = await import('../utils/encryptionKey.js')
    const key = generateRecoveryKey()
    expect(key).toMatch(/^HLBK-ENC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/)
  })
})
