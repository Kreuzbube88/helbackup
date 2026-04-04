import { db } from '../db/database.js'
import type { NotificationChannel, NotificationData, NotificationEvent, NotificationConfigRow, EmailConfig, GotifyConfig, NtfyConfig, PushoverConfig, TelegramConfig, DiscordConfig, SlackConfig } from './types.js'
import { EmailNotification } from './channels/email.js'
import { GotifyNotification } from './channels/gotify.js'
import { NtfyNotification } from './channels/ntfy.js'
import { PushoverNotification } from './channels/pushover.js'
import { TelegramNotification } from './channels/telegram.js'
import { DiscordNotification } from './channels/discord.js'
import { SlackNotification } from './channels/slack.js'
import { logger } from '../utils/logger.js'

class NotificationManager {
  private channels = new Map<string, NotificationChannel>()

  loadChannels(): void {
    const configs = db.prepare('SELECT * FROM notification_config WHERE enabled = 1').all() as NotificationConfigRow[]
    this.channels.clear()

    for (const row of configs) {
      try {
        const cfg = JSON.parse(row.config) as Record<string, unknown>
        this.channels.set(row.channel, this.createChannel(row.channel, cfg))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`Failed to load notification channel ${row.channel}: ${msg}`)
      }
    }

    logger.info(`Loaded ${this.channels.size} notification channels`)
  }

  private createChannel(type: string, config: Record<string, unknown>): NotificationChannel {
    switch (type) {
      case 'email':    return new EmailNotification(config as unknown as EmailConfig)
      case 'gotify':   return new GotifyNotification(config as unknown as GotifyConfig)
      case 'ntfy':     return new NtfyNotification(config as unknown as NtfyConfig)
      case 'pushover': return new PushoverNotification(config as unknown as PushoverConfig)
      case 'telegram': return new TelegramNotification(config as unknown as TelegramConfig)
      case 'discord':  return new DiscordNotification(config as unknown as DiscordConfig)
      case 'slack':    return new SlackNotification(config as unknown as SlackConfig)
      default: throw new Error(`Unknown notification channel: ${type}`)
    }
  }

  async notify(data: NotificationData): Promise<void> {
    const configs = db.prepare('SELECT * FROM notification_config WHERE enabled = 1').all() as NotificationConfigRow[]

    for (const row of configs) {
      let events: NotificationEvent[]
      try {
        events = JSON.parse(row.events) as NotificationEvent[]
      } catch {
        continue
      }

      if (!events.includes(data.event)) continue

      const channel = this.channels.get(row.channel)
      if (!channel) {
        logger.warn(`Notification channel not loaded: ${row.channel}`)
        continue
      }

      try {
        await channel.send(data)
        db.prepare(
          'INSERT INTO notification_log (channel, event, success, sent_at) VALUES (?, ?, 1, ?)'
        ).run(row.channel, data.event, new Date().toISOString())
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`Notification failed [${row.channel}]: ${msg}`)
        db.prepare(
          'INSERT INTO notification_log (channel, event, success, error_message, sent_at) VALUES (?, ?, 0, ?, ?)'
        ).run(row.channel, data.event, msg, new Date().toISOString())
      }
    }
  }
}

export const notificationManager = new NotificationManager()
