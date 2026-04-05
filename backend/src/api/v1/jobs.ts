import { FastifyInstance } from 'fastify'
import { successResponse, errorResponse, ErrorCodes } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'
import { JobExecutionEngine, type JobStep } from '../../execution/engine.js'
import { activeExecutions } from '../../execution/active.js'
import { logger } from '../../utils/logger.js'

interface JobRow {
  id: string
  name: string
  enabled: number
  schedule: string | null
  steps: string
  last_run: string | null
  next_run: string | null
}

export async function jobsRoutesV1(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/v1/jobs',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'List all backup jobs',
        tags: ['Jobs'],
        security: [{ apiToken: [] }],
      },
    },
    async (_request, reply) => {
      const jobs = db
        .prepare('SELECT id, name, enabled, schedule FROM jobs ORDER BY name')
        .all() as Pick<JobRow, 'id' | 'name' | 'enabled' | 'schedule'>[]

      return successResponse(reply, jobs.map(j => ({ ...j, enabled: j.enabled === 1 })))
    }
  )

  app.post<{ Params: { id: string } }>(
    '/api/v1/jobs/:id/trigger',
    {
      preHandler: requireScope('write'),
      schema: {
        description: 'Trigger a backup job',
        tags: ['Jobs'],
        security: [{ apiToken: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined

        if (!job) {
          return errorResponse(reply, ErrorCodes.NOT_FOUND, 'Job not found', 404)
        }

        let steps: JobStep[]
        try {
          steps = JSON.parse(job.steps) as JobStep[]
        } catch {
          return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, 'Invalid job configuration', 500)
        }

        const engine = new JobExecutionEngine(job.id)
        const runId = engine.getRunId()
        activeExecutions.set(runId, engine)

        void engine.execute(steps).catch(err => {
          logger.error(`API-triggered backup failed: ${err instanceof Error ? err.message : String(err)}`)
        }).finally(() => {
          activeExecutions.delete(runId)
        })

        return successResponse(reply, { triggered: true, jobId: id, runId, message: 'Backup started' }, 202)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, msg, 500)
      }
    }
  )
}
