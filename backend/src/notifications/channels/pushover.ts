import type { NotificationChannel, NotificationData, PushoverConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

export class PushoverNotification implements NotificationChannel {
  constructor(private readonly config: PushoverConfig) {}

  async send(data: NotificationData): Promise<void> {
    let message = this.getTitle(data.event)
    if (data.duration !== undefined) message += `\nDuration: ${Math.floor(data.duration / 60)}m`
    if (data.error) message += `\nError: ${data.error}`

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.config.token,
        user: this.config.user,
        title: `HELBACKUP${data.jobName ? ` - ${data.jobName}` : ''}`,
        message,
        priority: data.event.includes('failed') || data.event === 'system_error' ? 1 : 0,
      }),
    })

    if (!response.ok) throw new Error(`Pushover error: ${response.statusText}`)
    logger.info(`Pushover notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test', timestamp: new Date().toISOString() })
  }

  private getTitle(event: NotificationEvent): string {
    return event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
