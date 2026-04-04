import { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'
import { hashToken, hasScope } from '../utils/tokenGenerator.js'
import { errorResponse, ErrorCodes } from '../utils/apiResponse.js'

interface TokenRow {
  id: number
  name: string
  scopes: string
  expires_at: string | null
  revoked: number
}

// Augment FastifyRequest to carry token context
declare module 'fastify' {
  interface FastifyRequest {
    tokenScopes?: string[]
    tokenId?: number
  }
}

export async function tokenAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredScope?: string
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    void errorResponse(reply, ErrorCodes.UNAUTHORIZED, 'Missing or invalid Authorization header', 401)
    return
  }

  const token = authHeader.substring(7)

  if (!token.startsWith('helbackup_')) {
    void errorResponse(reply, ErrorCodes.INVALID_TOKEN, 'Invalid token format', 401)
    return
  }

  const tokenHash = hashToken(token)

  const tokenRecord = db
    .prepare('SELECT id, name, scopes, expires_at, revoked FROM api_tokens WHERE token = ? AND revoked = 0')
    .get(tokenHash) as TokenRow | undefined

  if (!tokenRecord) {
    void errorResponse(reply, ErrorCodes.INVALID_TOKEN, 'Invalid or revoked token', 401)
    return
  }

  if (tokenRecord.expires_at) {
    if (new Date(tokenRecord.expires_at) < new Date()) {
      void errorResponse(reply, ErrorCodes.TOKEN_EXPIRED, 'Token has expired', 401)
      return
    }
  }

  const scopes: string[] = JSON.parse(tokenRecord.scopes) as string[]

  if (requiredScope && !hasScope(scopes, requiredScope)) {
    void errorResponse(reply, ErrorCodes.FORBIDDEN, `Missing required scope: ${requiredScope}`, 403)
    return
  }

  db.prepare('UPDATE api_tokens SET last_used_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    tokenRecord.id
  )

  request.tokenScopes = scopes
  request.tokenId = tokenRecord.id
}

export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await tokenAuth(request, reply, scope)
  }
}
