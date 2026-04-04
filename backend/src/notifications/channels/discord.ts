import type { NotificationChannel, NotificationData, DiscordConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

export class DiscordNotification implements NotificationChannel {
  constructor(private readonly config: DiscordConfig) {}

  async send(data: NotificationData): Promise<void> {
    const fields: { name: string; value: string; inline?: boolean }[] = []
    if (data.jobName) fields.push({ name: 'Job', value: data.jobName, inline: true })
    if (data.duration !== undefined) fields.push({ name: 'Duration', value: `${Math.floor(data.duration / 60)}m`, inline: true })
    if (data.size !== undefined) fields.push({ name: 'Size', value: `${(data.size / (1024 ** 3)).toFixed(2)} GB`, inline: true })
    if (data.error) fields.push({ name: 'Error', value: data.error })

    // Green / Red / Blue
    const color = data.event.includes('success') || data.event === 'restore_completed' ? 0x4caf50
      : data.event.includes('failed') || data.event === 'system_error' ? 0xf44336 : 0x2196f3

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'HELBACKUP',
        embeds: [{ title: this.getTitle(data.event), color, fields, timestamp: data.timestamp }],
      }),
    })

    if (!response.ok) throw new Error(`Discord error: ${response.statusText}`)
    logger.info(`Discord notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test', timestamp: new Date().toISOString() })
  }

  private getTitle(event: NotificationEvent): string {
    return event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
