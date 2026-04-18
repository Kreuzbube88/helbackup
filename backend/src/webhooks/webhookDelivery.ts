import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'
import crypto from 'crypto'

export interface WebhookEvent {
  event: string
  timestamp: string
  data: unknown
}

interface WebhookRow {
  id: number
  name: string
  url: string
  secret: string | null
  events: string
  enabled: number
}

interface WebhookDeliveryRow {
  id: number
  webhook_id: number
  event: string
  payload: string
  retry_count: number
  next_retry_at: string | null
}

/** Backoff schedule: attempt 1 → +30s, attempt 2 → +5min, attempt 3 → +30min */
function nextRetryDelay(retryCount: number): number {
  if (retryCount === 1) return 30 * 1000
  if (retryCount === 2) return 5 * 60 * 1000
  return 30 * 60 * 1000
}

export async function testWebhookDelivery(webhookId: number): Promise<void> {
  await attemptDelivery(webhookId, {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test webhook delivery from HELBACKUP' },
  })
}

async function attemptDelivery(webhookId: number, event: WebhookEvent, deliveryId?: number): Promise<void> {
  const webhook = db
    .prepare('SELECT * FROM webhooks WHERE id = ? AND enabled = 1')
    .get(webhookId) as WebhookRow | undefined

  if (!webhook) return

  const payload = JSON.stringify(event)

  let signature = ''
  if (webhook.secret) {
    signature = crypto.createHmac('sha256', webhook.secret).update(payload).digest('hex')
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HELBACKUP-Signature': signature,
        'X-HELBACKUP-Event': event.event,
      },
      body: payload,
      signal: AbortSignal.timeout(15000),
    })

    const responseBody = await response.text()

    if (deliveryId !== undefined) {
      // Update existing retry delivery — mark as delivered (no next_retry_at)
      db.prepare(
        'UPDATE webhook_deliveries SET response_status = ?, response_body = ?, next_retry_at = NULL WHERE id = ?'
      ).run(response.status, responseBody.substring(0, 1000), deliveryId)
    } else {
      db.prepare(
        'INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body) VALUES (?, ?, ?, ?, ?)'
      ).run(webhookId, event.event, payload, response.status, responseBody.substring(0, 1000))
    }

    logger.info(`Webhook delivered: ${webhook.name} (${event.event}) → ${response.status}`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`Webhook delivery failed: ${webhook.name} — ${msg}`)

    if (deliveryId !== undefined) {
      // Existing retry — increment retry_count, schedule next retry if under limit
      const row = db
        .prepare('SELECT retry_count FROM webhook_deliveries WHERE id = ?')
        .get(deliveryId) as { retry_count: number } | undefined

      const currentCount = (row?.retry_count ?? 0) + 1
      if (currentCount < 3) {
        const nextAt = new Date(Date.now() + nextRetryDelay(currentCount)).toISOString()
        db.prepare(
          'UPDATE webhook_deliveries SET response_status = ?, response_body = ?, retry_count = ?, next_retry_at = ? WHERE id = ?'
        ).run(0, msg, currentCount, nextAt, deliveryId)
      } else {
        // Max retries reached — clear next_retry_at to stop retrying
        db.prepare(
          'UPDATE webhook_deliveries SET response_status = ?, response_body = ?, retry_count = ?, next_retry_at = NULL WHERE id = ?'
        ).run(0, msg, currentCount, deliveryId)
      }
    } else {
      // First attempt — insert with retry scheduled
      const nextAt = new Date(Date.now() + nextRetryDelay(1)).toISOString()
      db.prepare(
        'INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body, retry_count, next_retry_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(webhookId, event.event, payload, 0, msg, 1, nextAt)
    }
  }
}

export async function deliverWebhook(webhookId: number, event: WebhookEvent): Promise<void> {
  const webhook = db
    .prepare('SELECT * FROM webhooks WHERE id = ? AND enabled = 1')
    .get(webhookId) as WebhookRow | undefined

  if (!webhook) return

  let events: string[]
  try {
    events = JSON.parse(webhook.events) as string[]
  } catch {
    logger.warn(`Webhook ${webhookId} has malformed events JSON — skipping`)
    return
  }
  if (!events.includes(event.event) && !events.includes('*')) return

  await attemptDelivery(webhookId, event)
}

export function deliverWebhooks(event: WebhookEvent): void {
  const webhooks = db.prepare('SELECT id FROM webhooks WHERE enabled = 1').all() as { id: number }[]

  for (const webhook of webhooks) {
    deliverWebhook(webhook.id, event).catch(err => {
      logger.error(`Webhook error: ${(err as Error).message}`)
    })
  }
}

export async function processWebhookRetries(): Promise<void> {
  const due = db.prepare(
    "SELECT d.id, d.webhook_id, d.event, d.payload, d.retry_count, d.next_retry_at FROM webhook_deliveries d WHERE d.retry_count < 3 AND d.next_retry_at IS NOT NULL AND d.next_retry_at <= datetime('now')"
  ).all() as WebhookDeliveryRow[]

  if (due.length === 0) return

  logger.info({ count: due.length }, 'Processing webhook retries')

  for (const delivery of due) {
    // Claim the row by clearing next_retry_at to prevent double-processing
    db.prepare('UPDATE webhook_deliveries SET next_retry_at = NULL WHERE id = ?').run(delivery.id)

    try {
      let event: WebhookEvent
      try {
        event = JSON.parse(delivery.payload) as WebhookEvent
      } catch {
        logger.warn({ deliveryId: delivery.id }, 'Webhook retry: malformed payload — skipping')
        continue
      }
      await attemptDelivery(delivery.webhook_id, event, delivery.id)
    } catch (err: unknown) {
      logger.error({ deliveryId: delivery.id, err }, 'Webhook retry processing error')
    }
  }
}
