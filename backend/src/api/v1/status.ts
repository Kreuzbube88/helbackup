import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'
import { APP_VERSION } from '../../utils/version.js'

interface JobStats { total_jobs: number; enabled_jobs: number }
interface BackupCount { status: string; count: number }

export async function statusRoutesV1(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/status',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'Get system status overview',
        tags: ['Status'],
        security: [{ apiToken: [] }],
      },
    },
    async (_request, reply) => {
      const stats = db
        .prepare('SELECT COUNT(*) as total_jobs, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled_jobs FROM jobs')
        .get() as JobStats

      const recentBackups = db
        .prepare(`SELECT status, COUNT(*) as count FROM job_history WHERE started_at > datetime('now', '-24 hours') GROUP BY status`)
        .all() as BackupCount[]

      const successCount = recentBackups.find(b => b.status === 'success')?.count ?? 0
      const failedCount = recentBackups.find(b => b.status === 'failed')?.count ?? 0

      return successResponse(reply, {
        system: 'HELBACKUP',
        version: APP_VERSION,
        status: failedCount === 0 ? 'healthy' : 'degraded',
        jobs: {
          total: stats.total_jobs,
          enabled: stats.enabled_jobs,
        },
        last24h: {
          success: successCount,
          failed: failedCount,
        },
        timestamp: new Date().toISOString(),
      })
    }
  )
}
