import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/database.js'
import { scheduleJob, cancelJob } from '../scheduler/index.js'
import type { JobRow } from '../types/rows.js'

interface JobHistoryRow {
  id: string
  job_id: string
  status: string
  started_at: string
  ended_at: string | null
  duration_s: number | null
}

interface CreateJobBody {
  name: string
  schedule?: string
  steps: unknown[]
  enabled?: boolean
  preBackupScript?: string
  postBackupScript?: string
}

interface UpdateJobBody {
  name?: string
  schedule?: string | null
  steps?: unknown[]
  enabled?: boolean
  preBackupScript?: string | null
  postBackupScript?: string | null
}

function parseJob(row: JobRow) {
  return {
    ...row,
    enabled: row.enabled === 1,
    steps: (() => {
      try { return JSON.parse(row.steps) as unknown[] }
      catch { return [] }
    })(),
    pre_backup_script: row.pre_backup_script ?? null,
    post_backup_script: row.post_backup_script ?? null,
  }
}

export async function jobsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/jobs',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as JobRow[]
      return reply.send(rows.map(parseJob))
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(request.params.id) as JobRow | undefined
      if (!row) return reply.status(404).send({ error: 'Job not found' })
      return reply.send(parseJob(row))
    }
  )

  app.post<{ Body: CreateJobBody }>(
    '/api/jobs',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Body: CreateJobBody }>, reply: FastifyReply) => {
      const { name, schedule, steps, enabled = true, preBackupScript, postBackupScript } = request.body
      if (!name || !steps) return reply.status(400).send({ error: 'Missing required fields' })

      const id = uuidv4()
      db.prepare(
        'INSERT INTO jobs (id, name, schedule, steps, enabled, pre_backup_script, post_backup_script) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, name, schedule ?? null, JSON.stringify(steps), enabled ? 1 : 0, preBackupScript ?? null, postBackupScript ?? null)

      const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow
      if (enabled && schedule) scheduleJob({ ...row, schedule })
      return reply.status(201).send(parseJob(row))
    }
  )

  app.put<{ Params: { id: string }; Body: UpdateJobBody }>(
    '/api/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateJobBody }>, reply: FastifyReply) => {
      const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(request.params.id) as JobRow | undefined
      if (!existing) return reply.status(404).send({ error: 'Job not found' })

      const { name, schedule, steps, enabled, preBackupScript, postBackupScript } = request.body
      const updates: string[] = []
      const values: unknown[] = []

      if (name !== undefined) { updates.push('name = ?'); values.push(name) }
      if (schedule !== undefined) { updates.push('schedule = ?'); values.push(schedule ?? null) }
      if (steps !== undefined) { updates.push('steps = ?'); values.push(JSON.stringify(steps)) }
      if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0) }
      if (preBackupScript !== undefined) { updates.push('pre_backup_script = ?'); values.push(preBackupScript ?? null) }
      if (postBackupScript !== undefined) { updates.push('post_backup_script = ?'); values.push(postBackupScript ?? null) }
      updates.push("updated_at = datetime('now')")
      values.push(request.params.id)

      db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values)

      const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(request.params.id) as JobRow
      cancelJob(row.id)
      if (row.enabled === 1 && row.schedule) scheduleJob({ ...row, schedule: row.schedule })
      return reply.send(parseJob(row))
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/api/jobs/:id',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const existing = db.prepare('SELECT id FROM jobs WHERE id = ?').get(request.params.id)
      if (!existing) return reply.status(404).send({ error: 'Job not found' })

      cancelJob(request.params.id)
      db.prepare('DELETE FROM jobs WHERE id = ?').run(request.params.id)
      return reply.send({ ok: true })
    }
  )

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id/history',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const history = db
        .prepare('SELECT * FROM job_history WHERE job_id = ? ORDER BY started_at DESC LIMIT 50')
        .all(request.params.id) as JobHistoryRow[]
      return reply.send(history)
    }
  )

  app.get(
    '/api/history',
    { preHandler: [app.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      interface HistoryWithName extends JobHistoryRow { job_name: string }
      const rows = db
        .prepare(`
          SELECT jh.*, j.name AS job_name
          FROM job_history jh
          LEFT JOIN jobs j ON j.id = jh.job_id
          ORDER BY jh.started_at DESC
          LIMIT 200
        `)
        .all() as HistoryWithName[]
      return reply.send(rows)
    }
  )
}
