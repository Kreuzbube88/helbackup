import type { NotificationChannel, NotificationData, TelegramConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

export class TelegramNotification implements NotificationChannel {
  constructor(private readonly config: TelegramConfig) {}

  async send(data: NotificationData): Promise<void> {
    const icon = data.event.includes('success') || data.event === 'restore_completed' ? '✅'
      : data.event.includes('failed') || data.event === 'system_error' ? '❌' : '🔔'

    let text = `${icon} *HELBACKUP*\n*${this.getTitle(data.event)}*\n\n`
    if (data.jobName) text += `Job: ${data.jobName}\n`
    if (data.duration !== undefined) text += `Duration: ${Math.floor(data.duration / 60)}m\n`
    if (data.size !== undefined) text += `Size: ${(data.size / (1024 ** 3)).toFixed(2)} GB\n`
    if (data.error) text += `\n⚠️ ${data.error}`

    const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.config.chatId, text, parse_mode: 'Markdown' }),
    })

    if (!response.ok) throw new Error(`Telegram error: ${response.statusText}`)
    logger.info(`Telegram notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test', timestamp: new Date().toISOString() })
  }

  private getTitle(event: NotificationEvent): string {
    return event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}
