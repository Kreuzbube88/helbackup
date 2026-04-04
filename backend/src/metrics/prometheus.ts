import { FastifyInstance } from 'fastify'
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client'
import { db } from '../db/database.js'

const register = new Registry()
collectDefaultMetrics({ register })

export const backupCounter = new Counter({
  name: 'helbackup_backups_total',
  help: 'Total number of backup runs',
  labelNames: ['status', 'job_name'] as const,
  registers: [register],
})

export const storageGauge = new Gauge({
  name: 'helbackup_storage_bytes',
  help: 'Storage usage in bytes per target',
  labelNames: ['target_name', 'type'] as const,
  registers: [register],
})

export const backupDurationHistogram = new Histogram({
  name: 'helbackup_backup_duration_seconds',
  help: 'Backup duration in seconds',
  labelNames: ['job_name'] as const,
  buckets: [30, 60, 300, 600, 1800, 3600],
  registers: [register],
})

interface StorageStat { name: string; type: string; total_size: number | null }
interface BackupStat { job_name: string; status: string; count: number; avg_duration: number | null }

function updateStorageMetrics(): void {
  try {
    const targets = db
      .prepare(`
        SELECT t.name, t.type, SUM(m.compressed_size) as total_size
        FROM targets t
        LEFT JOIN manifest m ON m.target_id = t.id
        GROUP BY t.id
      `)
      .all() as StorageStat[]

    storageGauge.reset()
    for (const target of targets) {
      storageGauge.set({ target_name: target.name, type: target.type }, target.total_size ?? 0)
    }
  } catch { /* manifest table may not exist yet */ }
}

function updateBackupMetrics(): void {
  try {
    const stats = db
      .prepare(`
        SELECT j.name as job_name, h.status, COUNT(*) as count, AVG(h.duration_s) as avg_duration
        FROM job_history h
        JOIN jobs j ON h.job_id = j.id
        WHERE h.started_at > datetime('now', '-24 hours')
        GROUP BY j.id, h.status
      `)
      .all() as BackupStat[]

    for (const stat of stats) {
      backupCounter.inc({ status: stat.status, job_name: stat.job_name }, stat.count)
      if (stat.avg_duration != null) {
        backupDurationHistogram.observe({ job_name: stat.job_name }, stat.avg_duration)
      }
    }
  } catch { /* job_history table may not exist yet */ }
}

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', async (_request, reply) => {
    updateStorageMetrics()
    updateBackupMetrics()
    void reply.header('Content-Type', register.contentType)
    return reply.send(await register.metrics())
  })
}
