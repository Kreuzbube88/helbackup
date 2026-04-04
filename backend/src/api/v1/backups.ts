import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'

interface PaginationQuery {
  limit?: string
  offset?: string
}

interface CountRow { count: number }

export async function backupsRoutesV1(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PaginationQuery }>(
    '/api/v1/backups',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'List recent backups',
        tags: ['Backups'],
        security: [{ apiToken: [] }],
      },
    },
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 50), 200)
      const offset = Number(request.query.offset ?? 0)

      const backups = db
        .prepare(`
          SELECT
            m.id,
            m.backup_id,
            m.timestamp,
            m.total_size,
            m.compressed_size,
            m.verified,
            t.name as target_name,
            t.type as target_type
          FROM manifest m
          JOIN targets t ON m.target_id = t.id
          ORDER BY m.timestamp DESC
          LIMIT ? OFFSET ?
        `)
        .all(limit, offset)

      const total = (db.prepare('SELECT COUNT(*) as count FROM manifest').get() as CountRow).count

      return successResponse(reply, { backups, pagination: { total, limit, offset } })
    }
  )
}
