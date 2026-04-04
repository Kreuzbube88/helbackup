import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'
import { notificationManager } from '../notifications/notificationManager.js'
import { EmailNotification } from '../notifications/channels/email.js'
import { GotifyNotification } from '../notifications/channels/gotify.js'
import { NtfyNotification } from '../notifications/channels/ntfy.js'
import { PushoverNotification } from '../notifications/channels/pushover.js'
import { TelegramNotification } from '../notifications/channels/telegram.js'
import { DiscordNotification } from '../notifications/channels/discord.js'
import { SlackNotification } from '../notifications/channels/slack.js'
import type { NotificationConfigRow, EmailConfig, GotifyConfig, NtfyConfig, PushoverConfig, TelegramConfig, DiscordConfig, SlackConfig } from '../notifications/types.js'

interface SaveNotificationBody {
  channel: string
  enabled: boolean
  config: Record<string, unknown>
  events: string[]
}

interface TestNotificationBody {
  channel: string
  config: Record<string, unknown>
}

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/notifications
  app.get(
    '/api/notifications',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rows = db.prepare('SELECT * FROM notification_config ORDER BY channel').all() as NotificationConfigRow[]
      return reply.send(rows)
    }
  )

  // GET /api/notifications/log
  app.get(
    '/api/notifications/log',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const logs = db.prepare('SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 100').all()
      return reply.send(logs)
    }
  )

  // GET /api/notifications/:channel
  app.get<{ Params: { channel: string } }>(
    '/api/notifications/:channel',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { channel: string } }>, reply: FastifyReply) => {
      const row = db.prepare('SELECT * FROM notification_config WHERE channel = ?').get(request.params.channel) as NotificationConfigRow | undefined
      if (!row) return reply.status(404).send({ error: 'Channel not found' })
      return reply.send(row)
    }
  )

  // POST /api/notifications — create or update
  app.post<{ Body: SaveNotificationBody }>(
    '/api/notifications',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Body: SaveNotificationBody }>, reply: FastifyReply) => {
      const { channel, enabled, config, events } = request.body

      const existing = db.prepare('SELECT id FROM notification_config WHERE channel = ?').get(channel)
      const now = new Date().toISOString()

      if (existing) {
        db.prepare(
          'UPDATE notification_config SET enabled = ?, config = ?, events = ?, updated_at = ? WHERE channel = ?'
        ).run(enabled ? 1 : 0, JSON.stringify(config), JSON.stringify(events), now, channel)
      } else {
        db.prepare(
          'INSERT INTO notification_config (channel, enabled, config, events, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(channel, enabled ? 1 : 0, JSON.stringify(config), JSON.stringify(events), now)
      }

      notificationManager.loadChannels()
      return reply.send({ success: true })
    }
  )

  // DELETE /api/notifications/:channel
  app.delete<{ Params: { channel: string } }>(
    '/api/notifications/:channel',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { channel: string } }>, reply: FastifyReply) => {
      db.prepare('DELETE FROM notification_config WHERE channel = ?').run(request.params.channel)
      notificationManager.loadChannels()
      return reply.send({ success: true })
    }
  )

  // POST /api/notifications/test
  app.post<{ Body: TestNotificationBody }>(
    '/api/notifications/test',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Body: TestNotificationBody }>, reply: FastifyReply) => {
      const { channel, config } = request.body

      try {
        let ch
        switch (channel) {
          case 'email':    ch = new EmailNotification(config as unknown as EmailConfig); break
          case 'gotify':   ch = new GotifyNotification(config as unknown as GotifyConfig); break
          case 'ntfy':     ch = new NtfyNotification(config as unknown as NtfyConfig); break
          case 'pushover': ch = new PushoverNotification(config as unknown as PushoverConfig); break
          case 'telegram': ch = new TelegramNotification(config as unknown as TelegramConfig); break
          case 'discord':  ch = new DiscordNotification(config as unknown as DiscordConfig); break
          case 'slack':    ch = new SlackNotification(config as unknown as SlackConfig); break
          default: return reply.status(400).send({ error: 'Unknown channel' })
        }

        await ch.test()
        return reply.send({ success: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return reply.status(500).send({ error: msg })
      }
    }
  )
}
