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

    db.prepare(
      'INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body) VALUES (?, ?, ?, ?, ?)'
    ).run(webhookId, event.event, payload, response.status, responseBody.substring(0, 1000))

    logger.info(`Webhook delivered: ${webhook.name} (${event.event}) → ${response.status}`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`Webhook delivery failed: ${webhook.name} — ${msg}`)

    db.prepare(
      'INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body) VALUES (?, ?, ?, ?, ?)'
    ).run(webhookId, event.event, payload, 0, msg)
  }
}

export function deliverWebhooks(event: WebhookEvent): void {
  const webhooks = db.prepare('SELECT id FROM webhooks WHERE enabled = 1').all() as { id: number }[]

  for (const webhook of webhooks) {
    deliverWebhook(webhook.id, event).catch(err => {
      logger.error(`Webhook error: ${(err as Error).message}`)
    })
  }
}
