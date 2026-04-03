import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'

export interface JobStep {
  id: string
  type: 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config'
  config: Record<string, unknown>
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'system' | 'file' | 'container' | 'network' | 'verification'

export interface LogMetadata {
  file?: {
    path: string
    size: number
    result: 'copied' | 'skipped' | 'failed'
    reason?: string
  }
  container?: {
    id: string
    name: string
    action: 'stop' | 'start' | 'export' | 'verify'
    result: 'success' | 'failed' | 'pending'
    error?: string
  }
  progress?: {
    current: number
    total: number
    unit: 'bytes' | 'files'
    speed?: number    // bytes/sec
    eta_seconds?: number
  }
  error?: {
    code: string
    stack?: string
    suggestion: string
  }
  performance?: {
    duration_ms: number
    speed_mbps?: number
  }
}

interface LogEvent {
  id: string
  run_id: string
  step_id: string | null
  sequence: number
  level: LogLevel
  category: LogCategory
  message: string
  metadata: LogMetadata | null
  ts: string
}

interface Summary {
  filesCopied: number
  filesSkipped: number
  filesFailed: number
  bytesTransferred: number
  errors: number
  warnings: number
}

export class JobExecutionEngine extends EventEmitter {
  private readonly runId: string
  private readonly startedAt: string
  private sequence = 0
  private summary: Summary = {
    filesCopied: 0,
    filesSkipped: 0,
    filesFailed: 0,
    bytesTransferred: 0,
    errors: 0,
    warnings: 0,
  }

  constructor(jobId: string) {
    super()
    this.runId = randomUUID()
    this.startedAt = new Date().toISOString()

    db.prepare(
      'INSERT INTO job_history (id, job_id, status, started_at) VALUES (?, ?, ?, ?)'
    ).run(this.runId, jobId, 'running', this.startedAt)

    logger.info({ runId: this.runId }, 'Job execution started')
  }

  async execute(steps: JobStep[]): Promise<void> {
    try {
      for (const step of steps) {
        this.emit('step:start', { stepId: step.id, type: step.type })
        this.log('info', 'system', `Starting step: ${step.type}`, step.id)

        try {
          await this.executeStep(step)
          this.emit('step:complete', { stepId: step.id })
          this.log('info', 'system', `Step completed: ${step.type}`, step.id)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          this.emit('step:error', { stepId: step.id, error: message })
          this.log('error', 'system', `Step failed: ${message}`, step.id)
          throw err
        }
      }

      const duration = this.elapsedSeconds()
      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run('success', new Date().toISOString(), duration, this.runId)

      this.saveSummary(duration * 1000)
      this.log('info', 'system',
        `Backup completed: ${this.summary.filesCopied} files copied, ${this.summary.errors} errors`
      )

      this.emit('job:complete')
      logger.info({ runId: this.runId }, 'Job execution completed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const duration = this.elapsedSeconds()
      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run('failed', new Date().toISOString(), duration, this.runId)

      this.saveSummary(duration * 1000)

      this.emit('job:error', { error: message })
      logger.error({ runId: this.runId, error: message }, 'Job execution failed')
      throw err
    }
  }

  private async executeStep(step: JobStep): Promise<void> {
    switch (step.type) {
      case 'flash': {
        const { executeFlashBackup } = await import('./steps/flash.js')
        await executeFlashBackup(step.config as unknown as Parameters<typeof executeFlashBackup>[0], this)
        break
      }
      case 'appdata': {
        const { executeAppdataBackup } = await import('./steps/appdata.js')
        await executeAppdataBackup(step.config as unknown as Parameters<typeof executeAppdataBackup>[0], this)
        break
      }
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    stepId?: string,
    metadata?: LogMetadata
  ): void {
    this.sequence++

    if (level === 'error') this.summary.errors++
    if (level === 'warn') this.summary.warnings++

    if (metadata?.file) {
      const { result, size } = metadata.file
      if (result === 'copied') { this.summary.filesCopied++; this.summary.bytesTransferred += size }
      else if (result === 'skipped') this.summary.filesSkipped++
      else if (result === 'failed') this.summary.filesFailed++
    }

    const ts = new Date().toISOString()
    const id = randomUUID()

    db.prepare(
      'INSERT INTO logs (id, run_id, step_id, sequence, level, category, message, metadata, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      this.runId,
      stepId ?? null,
      this.sequence,
      level,
      category,
      message,
      metadata ? JSON.stringify(metadata) : null,
      ts
    )

    const event: LogEvent = {
      id,
      run_id: this.runId,
      step_id: stepId ?? null,
      sequence: this.sequence,
      level,
      category,
      message,
      metadata: metadata ?? null,
      ts,
    }
    this.emit('log', event)
  }

  getRunId(): string {
    return this.runId
  }

  private elapsedSeconds(): number {
    return Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000)
  }

  private saveSummary(durationMs: number): void {
    try {
      db.prepare(
        `INSERT INTO log_summary
         (id, run_id, files_copied, files_skipped, files_failed, bytes_transferred, errors, warnings, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        this.runId,
        this.summary.filesCopied,
        this.summary.filesSkipped,
        this.summary.filesFailed,
        this.summary.bytesTransferred,
        this.summary.errors,
        this.summary.warnings,
        Math.round(durationMs),
        new Date().toISOString()
      )
    } catch (err) {
      logger.warn({ err }, 'Failed to save log summary')
    }
  }
}
