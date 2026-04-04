import { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { successResponse, errorResponse, ErrorCodes } from '../utils/apiResponse.js'
import { deliverWebhook } from '../webhooks/webhookDelivery.js'
import { logger } from '../utils/logger.js'

const VALID_EVENTS = [
  'backup_started',
  'backup_success',
  'backup_failed',
  'restore_started',
  'restore_completed',
  'restore_failed',
  '*',
]

interface WebhookRow {
  id: number
  name: string
  url: string
  secret: string | null
  events: string
  enabled: number
  created_at: string
}

interface CreateWebhookBody {
  name: string
  url: string
  secret?: string
  events: string[]
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/webhooks', { preHandler: [app.authenticate] }, async (_request, reply) => {
    try {
      const webhooks = db
        .prepare('SELECT id, name, url, events, enabled, created_at FROM webhooks ORDER BY created_at DESC')
        .all() as Omit<WebhookRow, 'secret'>[]
      return successResponse(reply, webhooks)
    } catch (error: unknown) {
      return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, (error as Error).message, 500)
    }
  })

  app.post<{ Body: CreateWebhookBody }>(
    '/api/webhooks',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { name, url, secret, events } = request.body

        if (!name?.trim() || !url?.trim() || !events?.length) {
          return errorResponse(reply, ErrorCodes.VALIDATION_ERROR, 'name, url, and events are required', 400)
        }

        const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e))
        if (invalidEvents.length > 0) {
          return errorResponse(reply, ErrorCodes.VALIDATION_ERROR, `Invalid events: ${invalidEvents.join(', ')}`, 400)
        }

        const result = db
          .prepare('INSERT INTO webhooks (name, url, secret, events) VALUES (?, ?, ?, ?)')
          .run(name.trim(), url.trim(), secret ?? null, JSON.stringify(events))

        logger.info(`Webhook created: ${name} (ID: ${result.lastInsertRowid})`)
        return successResponse(reply, { id: result.lastInsertRowid }, 201)
      } catch (error: unknown) {
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, (error as Error).message, 500)
      }
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/api/webhooks/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        db.prepare('DELETE FROM webhooks WHERE id = ?').run(request.params.id)
        return successResponse(reply, { deleted: true })
      } catch (error: unknown) {
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, (error as Error).message, 500)
      }
    }
  )

  app.post<{ Params: { id: string } }>(
    '/api/webhooks/:id/test',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const webhookId = Number(request.params.id)
        await deliverWebhook(webhookId, {
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook delivery from HELBACKUP' },
        })
        return successResponse(reply, { sent: true })
      } catch (error: unknown) {
        return errorResponse(reply, ErrorCodes.INTERNAL_ERROR, (error as Error).message, 500)
      }
    }
  )
}
