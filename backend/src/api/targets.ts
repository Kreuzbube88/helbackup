import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/database.js'

interface TargetRow {
  id: string
  name: string
  type: string
  config: string
  enabled: number
  created_at: string
  updated_at: string
}

interface CreateTargetBody {
  name: string
  type: string
  config: Record<string, unknown>
  enabled?: boolean
}

interface UpdateTargetBody {
  name?: string
  type?: string
  config?: Record<string, unknown>
  enabled?: boolean
}

const SENSITIVE_KEYS = new Set(['password', 'privateKey', 'ssh_key', 'api_key', 'token', 'client_secret', 'secret'])

function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) {
    result[k] = SENSITIVE_KEYS.has(k) ? '***' : v
  }
  return result
}

function parseTarget(row: TargetRow) {
  let rawConfig: Record<string, unknown> = {}
  try { rawConfig = JSON.parse(row.config) as Record<string, unknown> } catch { /* default empty */ }
  return {
    ...row,
    enabled: row.enabled === 1,
    config: sanitizeConfig(rawConfig),
  }
}

export async function targetsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/targets',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rows = db.prepare('SELECT * FROM targets ORDER BY created_at DESC').all() as TargetRow[]
      return reply.send(rows.map(parseTarget))
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/targets/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const row = db.prepare('SELECT * FROM targets WHERE id = ?').get(request.params.id) as TargetRow | undefined
      if (!row) return reply.status(404).send({ error: 'Target not found' })
      return reply.send(parseTarget(row))
    }
  )

  app.post<{ Body: CreateTargetBody }>(
    '/api/targets',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Body: CreateTargetBody }>, reply: FastifyReply) => {
      const { name, type, config, enabled = true } = request.body
      if (!name || !type || !config) return reply.status(400).send({ error: 'Missing required fields' })

      const VALID_TYPES = ['synology', 'rclone', 'local']
      if (!VALID_TYPES.includes(type)) {
        return reply.status(400).send({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` })
      }

      const id = uuidv4()
      db.prepare(
        'INSERT INTO targets (id, name, type, config, enabled) VALUES (?, ?, ?, ?, ?)'
      ).run(id, name, type, JSON.stringify(config), enabled ? 1 : 0)

      const row = db.prepare('SELECT * FROM targets WHERE id = ?').get(id) as TargetRow
      return reply.status(201).send(parseTarget(row))
    }
  )

  app.put<{ Params: { id: string }; Body: UpdateTargetBody }>(
    '/api/targets/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateTargetBody }>, reply: FastifyReply) => {
      const existing = db.prepare('SELECT * FROM targets WHERE id = ?').get(request.params.id) as TargetRow | undefined
      if (!existing) return reply.status(404).send({ error: 'Target not found' })

      const { name, type, config, enabled } = request.body
      const updates: string[] = []
      const values: unknown[] = []

      if (name !== undefined) { updates.push('name = ?'); values.push(name) }
      if (type !== undefined) {
        const VALID_TYPES = ['synology', 'rclone', 'local']
        if (!VALID_TYPES.includes(type)) {
          return reply.status(400).send({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` })
        }
        updates.push('type = ?'); values.push(type)
      }
      if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)) }
      if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0) }
      updates.push("updated_at = datetime('now')")
      values.push(request.params.id)

      db.prepare(`UPDATE targets SET ${updates.join(', ')} WHERE id = ?`).run(...values)

      const row = db.prepare('SELECT * FROM targets WHERE id = ?').get(request.params.id) as TargetRow
      return reply.send(parseTarget(row))
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/api/targets/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const existing = db.prepare('SELECT id FROM targets WHERE id = ?').get(request.params.id)
      if (!existing) return reply.status(404).send({ error: 'Target not found' })
      db.prepare('DELETE FROM targets WHERE id = ?').run(request.params.id)
      return reply.send({ ok: true })
    }
  )
}
