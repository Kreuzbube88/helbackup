import { type FastifyInstance } from 'fastify'
import { generateRestorePlan, type RestoreOptions, type RestorePlan } from '../restore/restorePlan.js'
import { executeFullServerRestore } from '../restore/fullServerRestore.js'
import { logger } from '../utils/logger.js'

export async function restoreWizardRoutes(app: FastifyInstance): Promise<void> {
  // Generate restore plan from a manifest in the DB
  app.post<{ Body: { backupId: string; options: RestoreOptions } }>(
    '/api/restore-wizard/plan',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupId, options } = request.body
        if (!backupId) {
          return reply.status(400).send({ error: 'backupId is required' })
        }
        const plan = await generateRestorePlan(backupId, options ?? {})
        return reply.send(plan)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error: msg })
      }
    }
  )

  // Execute full server restore in background
  app.post<{ Body: { backupId: string; plan: RestorePlan } }>(
    '/api/restore-wizard/execute',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupId, plan } = request.body
        if (!backupId || !plan) {
          return reply.status(400).send({ error: 'backupId and plan are required' })
        }

        executeFullServerRestore(backupId, plan).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          logger.error(`Full server restore failed: ${msg}`)
        })

        return reply.send({ success: true, message: 'Restore started — check logs for progress' })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error: msg })
      }
    }
  )
}
