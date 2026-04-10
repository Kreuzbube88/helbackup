import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'
import { JobExecutionEngine, type JobStep } from '../execution/engine.js'
import { activeExecutions } from '../execution/active.js'
import { logger } from '../utils/logger.js'
import type { JobRow } from '../types/rows.js'

interface JobHistoryRow {
  id: string
  job_id: string
  status: string
  started_at: string
  ended_at: string | null
  duration_s: number | null
  files_copied: number | null
  files_skipped: number | null
  files_failed: number | null
  bytes_transferred: number | null
  errors: number | null
  warnings: number | null
}

export async function executionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/jobs/:id/execute — trigger manual execution
  app.post<{ Params: { id: string } }>(
    '/api/jobs/:id/execute',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(request.params.id) as JobRow | undefined
      if (!job) return reply.status(404).send({ error: 'Job not found' })

      const rm = db.prepare("SELECT value FROM settings WHERE key = 'recovery_mode'").get() as { value: string } | undefined
      if (rm?.value === '1') {
        return reply.status(503).send({ error: 'recovery_mode_active' })
      }

      // Prevent concurrent execution of the same job
      for (const [, engine] of activeExecutions) {
        if (engine.getJobId() === job.id) {
          return reply.status(409).send({ error: 'Job is already running' })
        }
      }

      let steps: JobStep[]
      try {
        steps = JSON.parse(job.steps) as JobStep[]
      } catch {
        return reply.status(500).send({ error: 'Invalid job steps' })
      }

      const engine = new JobExecutionEngine(job.id)
      const runId = engine.getRunId()
      activeExecutions.set(runId, engine)

      const hooks = {
        prePath: job.pre_backup_script ?? undefined,
        postPath: job.post_backup_script ?? undefined,
      }

      void (async () => {
        try {
          await engine.execute(steps, hooks)
        } catch (err: unknown) {
          logger.error({ runId, err }, 'Job execution failed')
        } finally {
          activeExecutions.delete(runId)
        }
      })()

      return reply.status(202).send({ runId })
    }
  )

  // GET /api/executions/:runId — execution status
  app.get<{ Params: { runId: string } }>(
    '/api/executions/:runId',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      const run = db.prepare(`
        SELECT jh.*, ls.files_copied, ls.files_skipped, ls.files_failed,
               ls.bytes_transferred, ls.errors, ls.warnings
        FROM job_history jh
        LEFT JOIN log_summary ls ON ls.run_id = jh.id
        WHERE jh.id = ?
      `).get(request.params.runId) as JobHistoryRow | undefined
      if (!run) return reply.status(404).send({ error: 'Execution not found' })
      return reply.send(run)
    }
  )

  // POST /api/executions/:runId/abort — abort a running job
  app.post<{ Params: { runId: string } }>(
    '/api/executions/:runId/abort',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
      const engine = activeExecutions.get(request.params.runId)
      if (!engine) return reply.status(404).send({ error: 'Execution not found or already finished' })
      engine.abort()
      return reply.status(202).send({ ok: true })
    }
  )
}
