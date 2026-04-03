import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'

export interface RetentionPolicy {
  deleteOlderThanDays?: number
  keepMinimum?: number
}

interface ManifestRow {
  id: number
  backup_id: string
  job_id: string
  manifest: string
  created_at: string
}

export async function applyRetentionPolicy(
  jobId: string,
  policy: RetentionPolicy
): Promise<{ deleted: number; kept: number }> {
  logger.info(`Applying retention policy for job ${jobId}`)

  const manifests = db.prepare(
    'SELECT * FROM manifest WHERE job_id = ? ORDER BY created_at DESC'
  ).all(jobId) as ManifestRow[]

  let deleted = 0
  let kept = 0
  const keepMinimum = policy.keepMinimum ?? 3

  for (let i = 0; i < manifests.length; i++) {
    const manifest = manifests[i]
    const age = Date.now() - new Date(manifest.created_at).getTime()
    const ageDays = age / (1000 * 60 * 60 * 24)

    // Always keep the minimum number of backups
    if (i < keepMinimum) {
      kept++
      continue
    }

    if (policy.deleteOlderThanDays && ageDays > policy.deleteOlderThanDays) {
      try {
        db.prepare('DELETE FROM manifest WHERE id = ?').run(manifest.id)
        logger.info(`Deleted old backup: ${manifest.backup_id} (${ageDays.toFixed(1)} days old)`)
        deleted++
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to delete backup ${manifest.backup_id}: ${msg}`)
        kept++
      }
    } else {
      kept++
    }
  }

  logger.info(`Retention policy applied: ${deleted} deleted, ${kept} kept`)
  return { deleted, kept }
}
