import type { NotificationChannel, NotificationData, GotifyConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

const EVENT_ICONS: Record<NotificationEvent, string> = {
  backup_success: '✅',
  backup_failed: '❌',
  backup_started: '🔄',
  backup_warning: '⚠️',
  verification_success: '✓',
  verification_failed: '⚠️',
  retention_cleanup: '🗑️',
  restore_started: '📥',
  restore_completed: '✅',
  restore_failed: '❌',
  disk_space_low: '💾',
  system_error: '🚨',
}

const EVENT_PRIORITIES: Record<NotificationEvent, number> = {
  backup_success: 5,
  backup_failed: 10,
  backup_started: 3,
  backup_warning: 7,
  verification_success: 5,
  verification_failed: 8,
  retention_cleanup: 3,
  restore_started: 7,
  restore_completed: 7,
  restore_failed: 10,
  disk_space_low: 8,
  system_error: 10,
}

const EVENT_TITLES: Record<NotificationEvent, string> = {
  backup_success: 'Backup Successful',
  backup_failed: 'Backup Failed',
  backup_started: 'Backup Started',
  backup_warning: 'Backup Warning',
  verification_success: 'Verification Successful',
  verification_failed: 'Verification Failed',
  retention_cleanup: 'Old Backups Cleaned',
  restore_started: 'Restore Started',
  restore_completed: 'Restore Completed',
  restore_failed: 'Restore Failed',
  disk_space_low: 'Disk Space Low',
  system_error: 'System Error',
}

export class GotifyNotification implements NotificationChannel {
  constructor(private readonly config: GotifyConfig) {}

  async send(data: NotificationData): Promise<void> {
    const icon = EVENT_ICONS[data.event]
    let title = `${icon} HELBACKUP`
    if (data.jobName) title += ` - ${data.jobName}`

    let message = `**${EVENT_TITLES[data.event]}**\n\n`
    if (data.backupId) message += `Backup ID: ${data.backupId}\n`
    if (data.duration !== undefined) message += `Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s\n`
    if (data.size !== undefined) message += `Size: ${(data.size / (1024 ** 3)).toFixed(2)} GB\n`
    if (data.error) message += `\n⚠️ Error: ${data.error}`

    const response = await fetch(`${this.config.url}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gotify-Key': this.config.token },
      body: JSON.stringify({
        title,
        message,
        priority: EVENT_PRIORITIES[data.event],
        extras: { 'client::display': { contentType: 'text/markdown' } },
      }),
    })

    if (!response.ok) throw new Error(`Gotify API error: ${response.statusText}`)
    logger.info(`Gotify notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test Job', timestamp: new Date().toISOString() })
  }
}
