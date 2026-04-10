import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/database.js'
import { getSettingInt, getSettingString, getSettingJson } from '../utils/settings.js'

interface UpdateSettingsBody {
  logRetentionDays?: number
  appdataSourcePaths?: string[]
  flashSourcePath?: string
  rsyncBwlimitKb?: number
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/settings',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        logRetentionDays: getSettingInt('log_retention_days', 90),
        appdataSourcePaths: getSettingJson<string[]>('appdata_source_paths', ['/unraid/user/appdata']),
        flashSourcePath: getSettingString('flash_source_path', '/unraid/boot'),
        rsyncBwlimitKb: getSettingInt('rsync_bwlimit_kb', 0),
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
            appdataSourcePaths: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              minItems: 1,
            },
            flashSourcePath: { type: 'string', minLength: 1 },
            rsyncBwlimitKb: { type: 'integer', minimum: 0, maximum: 1000000 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdateSettingsBody }>, reply: FastifyReply) => {
      const { logRetentionDays, appdataSourcePaths, flashSourcePath, rsyncBwlimitKb } = request.body

      const upsert = db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      )

      if (logRetentionDays !== undefined) {
        upsert.run('log_retention_days', String(logRetentionDays))
      }
      if (appdataSourcePaths !== undefined) {
        upsert.run('appdata_source_paths', JSON.stringify(appdataSourcePaths))
      }
      if (flashSourcePath !== undefined) {
        upsert.run('flash_source_path', flashSourcePath)
      }
      if (rsyncBwlimitKb !== undefined) {
        upsert.run('rsync_bwlimit_kb', String(rsyncBwlimitKb))
      }

      return reply.send({
        logRetentionDays: getSettingInt('log_retention_days', 90),
        appdataSourcePaths: getSettingJson<string[]>('appdata_source_paths', ['/unraid/user/appdata']),
        flashSourcePath: getSettingString('flash_source_path', '/unraid/boot'),
        rsyncBwlimitKb: getSettingInt('rsync_bwlimit_kb', 0),
      })
    }
  )
}
