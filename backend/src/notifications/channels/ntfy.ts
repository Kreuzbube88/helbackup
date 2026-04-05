import type { NotificationChannel, NotificationData, NtfyConfig, NotificationEvent } from '../types.js'
import { logger } from '../../utils/logger.js'

const EVENT_PRIORITIES: Record<NotificationEvent, string> = {
  backup_success: 'default',
  backup_failed: 'urgent',
  backup_started: 'low',
  backup_warning: 'high',
  verification_success: 'default',
  verification_failed: 'high',
  retention_cleanup: 'low',
  restore_started: 'high',
  restore_completed: 'high',
  restore_failed: 'urgent',
  disk_space_low: 'high',
  system_error: 'urgent',
}

const EVENT_TAGS: Record<NotificationEvent, string> = {
  backup_success: 'white_check_mark,backup',
  backup_failed: 'x,backup,warning',
  backup_started: 'arrows_counterclockwise,backup',
  backup_warning: 'warning,backup',
  verification_success: 'heavy_check_mark',
  verification_failed: 'warning',
  retention_cleanup: 'wastebasket',
  restore_started: 'inbox_tray',
  restore_completed: 'white_check_mark',
  restore_failed: 'x,warning',
  disk_space_low: 'floppy_disk,warning',
  system_error: 'rotating_light,warning',
}

const EVENT_TITLES: Record<NotificationEvent, string> = {
  backup_success: 'Backup Successful',
  backup_failed: 'Backup Failed',
  backup_started: 'Backup Started',
  backup_warning: 'Backup Warning',
  verification_success: 'Verification OK',
  verification_failed: 'Verification Failed',
  retention_cleanup: 'Cleaned Old Backups',
  restore_started: 'Restore Started',
  restore_completed: 'Restore Complete',
  restore_failed: 'Restore Failed',
  disk_space_low: 'Disk Space Low',
  system_error: 'System Error',
}

export class NtfyNotification implements NotificationChannel {
  constructor(private readonly config: NtfyConfig) {}

  async send(data: NotificationData): Promise<void> {
    let title = 'HELBACKUP'
    if (data.jobName) title += ` - ${data.jobName}`

    let message = `${EVENT_TITLES[data.event]}\n`
    if (data.backupId) message += `ID: ${data.backupId}\n`
    if (data.duration !== undefined) message += `Duration: ${Math.floor(data.duration / 60)}m\n`
    if (data.size !== undefined) message += `Size: ${(data.size / (1024 ** 3)).toFixed(2)} GB\n`
    if (data.error) message += `Error: ${data.error}`

    const headers: Record<string, string> = {
      Title: title,
      Priority: EVENT_PRIORITIES[data.event],
      Tags: EVENT_TAGS[data.event],
    }
    if (this.config.token) headers['Authorization'] = `Bearer ${this.config.token}`

    const response = await fetch(`${this.config.url}/${this.config.topic}`, {
      method: 'POST',
      headers,
      body: message,
    })

    if (!response.ok) throw new Error(`ntfy API error: ${response.statusText}`)
    logger.info(`ntfy notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test Job', timestamp: new Date().toISOString() })
  }
}
