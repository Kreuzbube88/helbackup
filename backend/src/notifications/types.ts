export type NotificationEvent =
  | 'backup_success'
  | 'backup_failed'
  | 'backup_started'
  | 'backup_warning'
  | 'verification_success'
  | 'verification_failed'
  | 'retention_cleanup'
  | 'restore_started'
  | 'restore_completed'
  | 'restore_failed'
  | 'disk_space_low'
  | 'system_error'

export interface NotificationData {
  event: NotificationEvent
  jobName?: string
  backupId?: string
  timestamp: string
  duration?: number
  size?: number
  error?: string
  details?: Record<string, unknown>
}

export interface NotificationChannel {
  send(data: NotificationData): Promise<void>
  test(): Promise<void>
}

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
  to: string
}

export interface GotifyConfig {
  url: string
  token: string
}

export interface NtfyConfig {
  url: string
  topic: string
  token?: string
}

export interface PushoverConfig {
  token: string
  user: string
}

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface DiscordConfig {
  webhookUrl: string
}

export interface SlackConfig {
  webhookUrl: string
}

export interface NotificationConfigRow {
  id: number
  channel: string
  enabled: number
  config: string
  events: string
  created_at: string
  updated_at: string | null
}
