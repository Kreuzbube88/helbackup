import { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { generateApiToken, hashToken, validateScopes } from '../utils/tokenGenerator.js'
import { successResponse, errorResponse, ErrorCodes } from '../utils/apiResponse.js'
import { logger } from '../utils/logger.js'

interface TokenRow {
  id: number
  name: string
  scopes: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
  revoked: number
}

interface CreateTokenBody {
  name: string
  scopes: string[]
  expiresInDays?: number
}

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  // List all tokens (requires session auth)
  app.get('/api/tokens', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      const tokens = db
        .prepare('SELECT id, name, scopes, expires_at, last_used_at, created_at, revoked FROM api_tokens ORDER BY created_at DESC')
        .all() as TokenRow[]
      return successResponse(reply, tokens)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, msg, 500)
    }
  })

  // Create new token (requires session auth)
  app.post<{ Body: CreateTokenBody }>(
    '/api/tokens',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { name, scopes, expiresInDays } = request.body

        if (!name?.trim() || !scopes?.length) {
          return errorResponse(reply, ErrorCodes.VALIDATION_ERROR, 'Name and scopes are required', 400)
        }

        if (!validateScopes(scopes)) {
          return errorResponse(reply, ErrorCodes.VALIDATION_ERROR, 'Invalid scopes. Valid: read, write, admin', 400)
        }

        const token = generateApiToken()
        const tokenHash = hashToken(token)

        let expiresAt: string | null = null
        if (expiresInDays && expiresInDays > 0) {
          const expiry = new Date()
          expiry.setDate(expiry.getDate() + expiresInDays)
          expiresAt = expiry.toISOString()
        }

        const result = db
          .prepare('INSERT INTO api_tokens (name, token, scopes, expires_at) VALUES (?, ?, ?, ?)')
          .run(name.trim(), tokenHash, JSON.stringify(scopes), expiresAt)

        logger.info(`API token created: ${name} (ID: ${result.lastInsertRowid})`)

        return successResponse(
          reply,
          {
            id: result.lastInsertRowid,
            name: name.trim(),
            token, // Only shown once!
            scopes,
            expiresAt,
            message: 'Save this token now — it will not be shown again!',
          },
          201
        )
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, msg, 500)
      }
    }
  )

  // Revoke token (requires session auth)
  app.delete<{ Params: { id: string } }>(
    '/api/tokens/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params
        db.prepare('UPDATE api_tokens SET revoked = 1 WHERE id = ?').run(id)
        logger.info(`API token revoked: ${id}`)
        return successResponse(reply, { revoked: true })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, msg, 500)
      }
    }
  )
}
