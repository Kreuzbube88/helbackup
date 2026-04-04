import crypto from 'crypto'

export function generateApiToken(): string {
  const random = crypto.randomBytes(24).toString('base64url')
  return `helbackup_${random}`
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const VALID_SCOPES = ['read', 'write', 'admin'] as const
export type TokenScope = (typeof VALID_SCOPES)[number]

export function validateScopes(scopes: string[]): boolean {
  return scopes.length > 0 && scopes.every(s => (VALID_SCOPES as readonly string[]).includes(s))
}

export function hasScope(tokenScopes: string[], requiredScope: string): boolean {
  return tokenScopes.includes(requiredScope) || tokenScopes.includes('admin')
}
