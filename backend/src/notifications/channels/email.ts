import nodemailer from 'nodemailer'
import type { NotificationChannel, NotificationData, EmailConfig, NotificationEvent } from '../types.js'
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

const EVENT_COLORS: Record<NotificationEvent, string> = {
  backup_success: '#4caf50',
  backup_failed: '#f44336',
  backup_started: '#2196f3',
  backup_warning: '#ff9800',
  verification_success: '#4caf50',
  verification_failed: '#ff9800',
  retention_cleanup: '#9e9e9e',
  restore_started: '#2196f3',
  restore_completed: '#4caf50',
  restore_failed: '#f44336',
  disk_space_low: '#ff9800',
  system_error: '#d32f2f',
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

export class EmailNotification implements NotificationChannel {
  constructor(private readonly config: EmailConfig) {}

  async send(data: NotificationData): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    })

    const icon = EVENT_ICONS[data.event]
    const color = EVENT_COLORS[data.event]
    const title = EVENT_TITLES[data.event]

    let subject = `${icon} HELBACKUP - ${title}`
    if (data.jobName) subject += ` - ${data.jobName}`

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${icon} ${title}</h1></div>
    <div class="content">
      ${this.formatDetails(data)}
    </div>
    <div class="footer">
      <p>HELBACKUP - Unraid Backup Solution</p>
      <p>${new Date(data.timestamp).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({ from: this.config.from, to: this.config.to, subject, html })
    logger.info(`Email notification sent: ${data.event}`)
  }

  async test(): Promise<void> {
    await this.send({ event: 'backup_success', jobName: 'Test Job', timestamp: new Date().toISOString(), duration: 120, size: 1024 * 1024 * 500 })
  }

  private formatDetails(data: NotificationData): string {
    let html = ''
    if (data.jobName) html += `<div class="detail"><span class="label">Job:</span> ${data.jobName}</div>`
    if (data.backupId) html += `<div class="detail"><span class="label">Backup ID:</span> ${data.backupId}</div>`
    if (data.duration !== undefined) {
      const m = Math.floor(data.duration / 60), s = data.duration % 60
      html += `<div class="detail"><span class="label">Duration:</span> ${m}m ${s}s</div>`
    }
    if (data.size !== undefined) {
      html += `<div class="detail"><span class="label">Size:</span> ${(data.size / (1024 ** 3)).toFixed(2)} GB</div>`
    }
    if (data.error) html += `<div class="detail" style="color:#d32f2f;"><span class="label">Error:</span> ${data.error}</div>`
    return html
  }
}
