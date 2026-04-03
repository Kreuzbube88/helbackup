import schedule from 'node-schedule'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'

interface JobRow {
  id: string
  name: string
  schedule: string
  steps: string
  enabled: number
}

const activeJobs = new Map<string, schedule.Job>()

export function initScheduler(): void {
  logger.info('Initializing job scheduler')

  const jobs = db
    .prepare('SELECT * FROM jobs WHERE enabled = 1 AND schedule IS NOT NULL')
    .all() as JobRow[]

  for (const job of jobs) {
    scheduleJob(job)
  }

  logger.info(`Scheduler initialized with ${jobs.length} jobs`)
}

export function scheduleJob(job: JobRow): void {
  cancelJob(job.id)

  const scheduled = schedule.scheduleJob(job.schedule, () => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Executing scheduled job')
    // Execution implemented in Phase 5
  })

  if (scheduled) {
    activeJobs.set(job.id, scheduled)
    logger.info({ jobId: job.id, cron: job.schedule }, 'Job scheduled')
  } else {
    logger.error({ jobId: job.id, cron: job.schedule }, 'Invalid cron expression')
  }
}

export function cancelJob(jobId: string): void {
  const job = activeJobs.get(jobId)
  if (job) {
    job.cancel()
    activeJobs.delete(jobId)
    logger.info({ jobId }, 'Job cancelled')
  }
}

export function stopScheduler(): void {
  logger.info('Stopping scheduler')
  activeJobs.forEach(job => job.cancel())
  activeJobs.clear()
}
