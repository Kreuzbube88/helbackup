import { FastifyInstance } from 'fastify'
import { Registry, Gauge, Histogram, collectDefaultMetrics } from 'prom-client'
import { db } from '../db/database.js'
import { activeExecutions } from '../execution/active.js'

const register = new Registry()
collectDefaultMetrics({ register })

// Use Gauge (not Counter) for window-based metrics that are re-queried on each scrape
export const backupGauge = new Gauge({
  name: 'helbackup_backups_total',
  help: 'Number of backup runs in the last 24 hours',
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

export const activeJobsGauge = new Gauge({
  name: 'helbackup_active_jobs',
  help: 'Number of currently running backup jobs',
  registers: [register],
})

export const recoveryModeGauge = new Gauge({
  name: 'helbackup_recovery_mode_enabled',
  help: '1 if recovery mode is enabled, 0 otherwise',
  registers: [register],
})

interface ManifestCountStat { job_name: string; count: number }
interface BackupStat { job_name: string; status: string; count: number; avg_duration: number | null }

function updateStorageMetrics(): void {
  try {
    // Count manifests per job as a proxy for storage usage (no compressed_size column in schema)
    const stats = db
      .prepare(`
        SELECT j.name as job_name, COUNT(m.id) as count
        FROM jobs j
        LEFT JOIN manifest m ON m.job_id = j.id
        GROUP BY j.id
      `)
      .all() as ManifestCountStat[]

    storageGauge.reset()
    for (const stat of stats) {
      storageGauge.set({ target_name: stat.job_name, type: 'backup_count' }, stat.count)
    }
  } catch { /* table may not exist yet */ }
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

    // Reset before setting to avoid accumulation across scrapes
    backupGauge.reset()
    for (const stat of stats) {
      backupGauge.set({ status: stat.status, job_name: stat.job_name }, stat.count)
    }
  } catch { /* job_history table may not exist yet */ }
}

interface RecoveryRow { enabled: number }

function updateRuntimeMetrics(): void {
  activeJobsGauge.set(activeExecutions.size)

  try {
    const row = db.prepare('SELECT enabled FROM recovery_config LIMIT 1').get() as RecoveryRow | undefined
    recoveryModeGauge.set(row?.enabled === 1 ? 1 : 0)
  } catch { /* table may not exist yet */ }
}

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', { preHandler: [app.authenticate] }, async (_request, reply) => {
    updateStorageMetrics()
    updateBackupMetrics()
    updateRuntimeMetrics()
    void reply.header('Content-Type', register.contentType)
    return reply.send(await register.metrics())
  })
}
