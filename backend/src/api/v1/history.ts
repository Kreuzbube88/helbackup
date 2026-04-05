import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'

interface HistoryQuery {
  limit?: string
  offset?: string
  jobId?: string
  status?: string
}

interface CountRow { count: number }

export async function historyRoutesV1(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: HistoryQuery }>(
    '/api/v1/history',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'List backup history',
        tags: ['History'],
        security: [{ apiToken: [] }],
      },
    },
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 50), 200)
      const offset = Number(request.query.offset ?? 0)
      const { jobId, status } = request.query

      const conditions: string[] = []
      const params: unknown[] = []

      if (jobId) {
        conditions.push('jh.job_id = ?')
        params.push(jobId)
      }
      if (status) {
        conditions.push('jh.status = ?')
        params.push(status)
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const rows = db
        .prepare(`
          SELECT
            jh.id,
            jh.job_id,
            j.name AS job_name,
            jh.status,
            jh.started_at,
            jh.ended_at,
            jh.duration_s
          FROM job_history jh
          LEFT JOIN jobs j ON j.id = jh.job_id
          ${where}
          ORDER BY jh.started_at DESC
          LIMIT ? OFFSET ?
        `)
        .all(...params, limit, offset)

      const total = (
        db.prepare(`SELECT COUNT(*) as count FROM job_history jh ${where}`).get(...params) as CountRow
      ).count

      return successResponse(reply, { history: rows, pagination: { total, limit, offset } })
    }
  )
}
