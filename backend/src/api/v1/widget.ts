import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'

interface JobStats { total_jobs: number; enabled_jobs: number }
interface Last24h { total: number; success: number; failed: number }
interface LastBackup { started_at: string; status: string; duration_s: number | null }

export async function widgetRoutesV1(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/widget/status',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'Compact status for HELDASH widget',
        tags: ['Widget'],
        security: [{ apiToken: [] }],
      },
    },
    async (_request, reply) => {
      const stats = db
        .prepare('SELECT COUNT(*) as total_jobs, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled_jobs FROM jobs')
        .get() as JobStats

      const last24h = db
        .prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
          FROM job_history
          WHERE started_at > datetime('now', '-24 hours')
        `)
        .get() as Last24h

      const lastBackup = db
        .prepare('SELECT started_at, status, duration_s FROM job_history ORDER BY started_at DESC LIMIT 1')
        .get() as LastBackup | undefined

      return successResponse(reply, {
        status: (last24h.failed ?? 0) > 0 ? 'warning' : 'ok',
        jobs: stats.enabled_jobs ?? 0,
        last24h: {
          total: last24h.total ?? 0,
          success: last24h.success ?? 0,
          failed: last24h.failed ?? 0,
        },
        lastBackup: lastBackup
          ? { timestamp: lastBackup.started_at, status: lastBackup.status, duration: lastBackup.duration_s }
          : null,
      })
    }
  )
}
