import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'

interface AuditLogRow {
  id: string
  timestamp: string
  action: string
  actor: string | null
  resource_type: string | null
  resource_id: string | null
  details: string | null
}

interface PaginationQuery {
  limit?: string
  offset?: string
}

interface CountRow { count: number }

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/audit-log?limit=100&offset=0
  app.get<{ Querystring: PaginationQuery }>(
    '/api/audit-log',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 100), 500)
      const offset = Number(request.query.offset ?? 0)

      const rows = db
        .prepare(
          'SELECT id, timestamp, action, actor, resource_type, resource_id, details FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        )
        .all(limit, offset) as AuditLogRow[]

      const entries = rows.map(row => ({
        ...row,
        details: row.details ? (() => { try { return JSON.parse(row.details!) } catch { return row.details } })() : null,
      }))

      const total = (db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as CountRow).count

      return reply.send({ entries, pagination: { total, limit, offset } })
    }
  )
}
