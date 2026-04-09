import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'

interface SettingsRow {
  key: string
  value: string
}

interface UpdateSettingsBody {
  logRetentionDays?: number
}

function getSettingInt(key: string, fallback: number): number {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingsRow | undefined
  if (!row) return fallback
  const n = parseInt(row.value, 10)
  return isNaN(n) ? fallback : n
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/settings',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        logRetentionDays: getSettingInt('log_retention_days', 90),
      })
    }
  )

  app.post<{ Body: UpdateSettingsBody }>(
    '/api/settings',
    {
      preHandler: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          properties: {
            logRetentionDays: { type: 'integer', minimum: 1, maximum: 3650 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdateSettingsBody }>, reply: FastifyReply) => {
      const { logRetentionDays } = request.body

      if (logRetentionDays !== undefined) {
        db.prepare(
          "INSERT INTO settings (key, value) VALUES ('log_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(String(logRetentionDays))
      }

      return reply.send({
        logRetentionDays: getSettingInt('log_retention_days', 90),
      })
    }
  )
}
