import type { NotificationChannel, NotificationData, SlackConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

export class SlackNotification implements NotificationChannel {
  constructor(private readonly config: SlackConfig) {}

  async send(data: NotificationData): Promise<void> {
    const title = this.getTitle(data.event)

    const blocks: unknown[] = [
      { type: 'header', text: { type: 'plain_text', text: `HELBACKUP - ${title}` } },
    ]

    const fields: { type: string; text: string }[] = []
    if (data.jobName) fields.push({ type: 'mrkdwn', text: `*Job:*\n${data.jobName}` })
    if (data.duration !== undefined) fields.push({ type: 'mrkdwn', text: `*Duration:*\n${Math.floor(data.duration / 60)}m` })
    if (data.size !== undefined) fields.push({ type: 'mrkdwn', text: `*Size:*\n${(data.size / (1024 ** 3)).toFixed(2)} GB` })

    if (fields.length) blocks.push({ type: 'section', fields })

    if (data.error) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `⚠️ *Error:* ${data.error}` } })
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*HELBACKUP* - ${title}`, blocks }),
    })

    if (!response.ok) throw new Error(`Slack error: ${response.statusText}`)
    logger.info(`Slack notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test', timestamp: new Date().toISOString() })
  }

  private getTitle(event: NotificationEvent): string {
    return event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
