import type { FastifyInstance } from 'fastify'
import { db } from '../db/database.js'
import { executeGFSCleanup, calculateGFSRetention } from '../retention/gfsRetention.js'

interface TargetRow {
  id: number
  path: string
  retention_scheme: string
  gfs_daily_keep: number
  gfs_weekly_keep: number
  gfs_monthly_keep: number
  retention_days: number
  minimum_backups: number
}

interface GFSConfigBody {
  retentionScheme: 'simple' | 'gfs'
  gfsConfig: {
    dailyKeep: number
    weeklyKeep: number
    monthlyKeep: number
  }
}

interface CalculatorBody {
  backupSizeGB: number
  backupsPerWeek: number
  currentRetentionDays: number
  gfsConfig: {
    dailyKeep: number
    weeklyKeep: number
    monthlyKeep: number
  }
}

export async function gfsRetentionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/targets/:targetId/gfs — return current GFS config
  app.get<{ Params: { targetId: string } }>(
    '/api/targets/:targetId/gfs',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const target = db.prepare('SELECT * FROM targets WHERE id = ?')
        .get(request.params.targetId) as TargetRow | undefined

      if (!target) return reply.status(404).send({ error: 'Target not found' })

      return reply.send({
        retentionScheme: target.retention_scheme ?? 'simple',
        gfsConfig: {
          dailyKeep: target.gfs_daily_keep ?? 7,
          weeklyKeep: target.gfs_weekly_keep ?? 4,
          monthlyKeep: target.gfs_monthly_keep ?? 12,
        },
        simpleRetention: {
          days: target.retention_days ?? 30,
          minimumBackups: target.minimum_backups ?? 3,
        },
      })
    }
  )

  // POST /api/targets/:targetId/gfs — save GFS config
  app.post<{ Params: { targetId: string }; Body: GFSConfigBody }>(
    '/api/targets/:targetId/gfs',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { retentionScheme, gfsConfig } = request.body
        db.prepare(`
          UPDATE targets
          SET retention_scheme = ?,
              gfs_daily_keep = ?,
              gfs_weekly_keep = ?,
              gfs_monthly_keep = ?
          WHERE id = ?
        `).run(
          retentionScheme,
          gfsConfig.dailyKeep,
          gfsConfig.weeklyKeep,
          gfsConfig.monthlyKeep,
          request.params.targetId
        )
        return reply.send({ success: true })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: msg })
      }
    }
  )

  // GET /api/targets/:targetId/gfs/preview — dry-run cleanup plan
  app.get<{ Params: { targetId: string } }>(
    '/api/targets/:targetId/gfs/preview',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const target = db.prepare('SELECT * FROM targets WHERE id = ?')
          .get(request.params.targetId) as TargetRow | undefined

        if (!target) return reply.status(404).send({ error: 'Target not found' })

        const plan = await executeGFSCleanup(
          parseInt(request.params.targetId),
          target.path,
          true
        )
        return reply.send(plan)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: msg })
      }
    }
  )

  // POST /api/targets/:targetId/gfs/cleanup — execute cleanup
  app.post<{ Params: { targetId: string } }>(
    '/api/targets/:targetId/gfs/cleanup',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const target = db.prepare('SELECT * FROM targets WHERE id = ?')
          .get(request.params.targetId) as TargetRow | undefined

        if (!target) return reply.status(404).send({ error: 'Target not found' })

        const plan = await executeGFSCleanup(
          parseInt(request.params.targetId),
          target.path,
          false
        )
        return reply.send(plan)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: msg })
      }
    }
  )

  // POST /api/gfs/calculator — storage savings estimate
  app.post<{ Body: CalculatorBody }>(
    '/api/gfs/calculator',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const { backupSizeGB, backupsPerWeek, currentRetentionDays, gfsConfig } = request.body

        const simpleCount = Math.round((backupsPerWeek / 7) * currentRetentionDays)
        const simpleStorageGB = simpleCount * backupSizeGB

        const gfsCount = gfsConfig.dailyKeep + gfsConfig.weeklyKeep + gfsConfig.monthlyKeep
        const gfsStorageGB = gfsCount * backupSizeGB

        const savings = simpleStorageGB - gfsStorageGB
        const savingsPercent = simpleStorageGB > 0
          ? Math.round((savings / simpleStorageGB) * 100)
          : 0

        return reply.send({
          simple: { backupsKept: simpleCount, storageGB: Math.round(simpleStorageGB) },
          gfs: { backupsKept: gfsCount, storageGB: Math.round(gfsStorageGB) },
          savings: { storageGB: Math.round(savings), percent: savingsPercent },
        })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        return reply.status(500).send({ error: msg })
      }
    }
  )
}
