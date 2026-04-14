import { FastifyInstance } from 'fastify'
import { successResponse } from '../../utils/apiResponse.js'
import { db } from '../../db/database.js'
import { requireScope } from '../../middleware/tokenAuth.js'
import type { TargetRow } from '../../types/rows.js'

interface PaginationQuery {
  limit?: string
  offset?: string
  jobId?: string
}

interface CountRow { count: number }

interface ManifestRow {
  id: number
  backup_id: string
  job_id: string
  job_name: string | null
  timestamp: string
  manifest: string
}

interface ManifestJson {
  entries?: { size: number }[]
  verified?: boolean
  targetId?: string
}

export async function backupsRoutesV1(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: PaginationQuery }>(
    '/api/v1/backups',
    {
      preHandler: requireScope('read'),
      schema: {
        description: 'List recent backups',
        tags: ['Backups'],
        security: [{ apiToken: [] }],
      },
    },
    async (request, reply) => {
      const limit = Math.min(Number(request.query.limit ?? 50), 200)
      const offset = Number(request.query.offset ?? 0)
      const jobId = request.query.jobId ?? null

      const rows = db
        .prepare(`
          SELECT
            m.id,
            m.backup_id,
            m.job_id,
            j.name AS job_name,
            m.created_at AS timestamp,
            m.manifest
          FROM manifest m
          LEFT JOIN jobs j ON j.id = m.job_id
          ${jobId ? 'WHERE m.job_id = ?' : ''}
          ORDER BY m.created_at DESC
          LIMIT ? OFFSET ?
        `)
        .all(...(jobId ? [jobId, limit, offset] : [limit, offset])) as ManifestRow[]

      const getTarget = db.prepare('SELECT name, type FROM targets WHERE id = ?')

      const backups = rows.map(row => {
        let total_size: number | null = null
        let verified: boolean | null = null
        let file_count: number | null = null
        let target_name: string | null = null
        let target_type: string | null = null
        try {
          const m = JSON.parse(row.manifest) as ManifestJson
          total_size = m.entries?.reduce((s, e) => s + e.size, 0) ?? null
          verified = m.verified ?? null
          file_count = m.entries?.length ?? null
          if (m.targetId) {
            const t = getTarget.get(m.targetId) as TargetRow | undefined
            if (t) { target_name = t.name; target_type = t.type }
          }
        } catch { /* malformed manifest — skip */ }
        return {
          id: row.id,
          backup_id: row.backup_id,
          job_id: row.job_id,
          job_name: row.job_name,
          timestamp: row.timestamp,
          total_size,
          file_count,
          compressed_size: null,
          verified,
          target_name,
          target_type,
        }
      })

      const total = jobId
        ? (db.prepare('SELECT COUNT(*) as count FROM manifest WHERE job_id = ?').get(jobId) as CountRow).count
        : (db.prepare('SELECT COUNT(*) as count FROM manifest').get() as CountRow).count

      return successResponse(reply, { backups, pagination: { total, limit, offset } })
    }
  )
}
