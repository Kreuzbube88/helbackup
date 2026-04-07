import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'
import type { TargetRow } from '../../types/rows.js'

const SENSITIVE_KEYS = new Set(['password', 'privateKey', 'ssh_key', 'api_key', 'token', 'client_secret', 'secret'])

function sanitizeConfig(raw: string): Record<string, unknown> {
  let config: Record<string, unknown> = {}
  try { config = JSON.parse(raw) as Record<string, unknown> } catch { /* default empty */ }
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) {
    result[k] = SENSITIVE_KEYS.has(k) ? '***' : v
  }
  return result
}

export async function targetsRoutesV1(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/targets',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'List all backup targets',
        tags: ['Targets'],
        security: [{ apiToken: [] }],
      },
    },
    async (_request, reply) => {
      const rows = db.prepare('SELECT * FROM targets ORDER BY created_at DESC').all() as TargetRow[]
      const targets = rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        enabled: row.enabled === 1,
        config: sanitizeConfig(row.config),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
      return successResponse(reply, { targets })
    }
  )
}
