import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { db } from '../db/database.js'
import { logger } from '../utils/logger.js'
import { executeHook } from './hooks.js'
import { notificationManager } from '../notifications/notificationManager.js'
import { backupDurationHistogram } from '../metrics/prometheus.js'
import { createJobManifest } from './manifest.js'
import { applyRetentionPolicy } from './retention.js'
import { ensureNASOnline, shutdownNASIfEnabled, type NASPowerConfig } from '../nas/power.js'
import { checkAndStoreDiskUsage } from '../nas/diskUsage.js'
import type { ChecksumEntry } from './verification.js'
import type { JobRow, TargetRow } from '../types/rows.js'

const execFileAsync = promisify(execFile)

export interface JobHooks {
  prePath?: string
  postPath?: string
}

export interface JobStep {
  id: string
  type: 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config' | 'cloud' | 'custom' | 'helbackup_self'
  config: Record<string, unknown>
  retry?: { max_attempts: number; backoff: 'linear' | 'exponential' }
  /** When true (default), a step failure aborts the remaining steps. Set false to continue on error. */
  stop_on_error?: boolean
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
  private readonly jobId: string
  private readonly jobName: string
  private readonly startedAt: string
  private _aborted = false
  private _childProcesses = new Set<import('child_process').ChildProcess>()
  private sequence = 0
  private backupPaths: Array<{ type: string; path: string; targetId?: string; checksums?: ChecksumEntry[] }> = []
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
    this.jobId = jobId
    this.startedAt = new Date().toISOString()
    const jobRow = db.prepare('SELECT name FROM jobs WHERE id = ?').get(jobId) as Pick<JobRow, 'name'> | undefined
    this.jobName = jobRow?.name ?? jobId

    db.prepare(
      'INSERT INTO job_history (id, job_id, status, started_at) VALUES (?, ?, ?, ?)'
    ).run(this.runId, jobId, 'running', this.startedAt)

    logger.info({ runId: this.runId }, 'Job execution started')
  }

  private collectNASPowerConfigs(steps: JobStep[]): NASPowerConfig[] {
    const seen = new Set<string>()
    const configs: NASPowerConfig[] = []
    for (const step of steps) {
      const targetId = step.config.targetId as string | undefined
      if (!targetId || seen.has(targetId)) continue
      seen.add(targetId)
      const row = db.prepare('SELECT type, config FROM targets WHERE id = ?').get(targetId) as Pick<TargetRow, 'type' | 'config'> | undefined
      if (!row || row.type !== 'nas') continue
      let cfg: Record<string, unknown>
      try { cfg = JSON.parse(row.config) as Record<string, unknown> } catch { continue }
      const power = cfg.power as { enabled?: boolean; mac?: string; ip?: string; autoShutdown?: boolean } | undefined
      if (!power?.enabled || !power.mac || !power.ip) continue
      configs.push({
        enabled: true,
        mac: power.mac,
        ip: power.ip,
        autoShutdown: power.autoShutdown ?? false,
        sshConfig: {
          host: cfg.host as string,
          port: cfg.port as number | undefined,
          username: cfg.username as string,
          password: cfg.password as string | undefined,
          privateKey: cfg.privateKey as string | undefined,
        },
      })
    }
    return configs
  }

  async execute(steps: JobStep[], hooks?: JobHooks): Promise<void> {
    void notificationManager.notify({ event: 'backup_started', jobName: this.jobName, timestamp: new Date().toISOString() })

    const nasPowerConfigs = this.collectNASPowerConfigs(steps)
    const powerLog = (level: 'info' | 'warn' | 'error', message: string): void => {
      this.log(level, 'system', message)
    }
    for (const cfg of nasPowerConfigs) {
      await ensureNASOnline(cfg, powerLog)
    }

    // Fire-and-forget disk usage check — NAS is guaranteed up at this point
    const targetIds = [...new Set(
      steps.map(s => s.config.targetId as string | undefined).filter(Boolean) as string[]
    )]
    if (targetIds.length > 0) {
      this.log('info', 'system', 'Checking target disk space')
      for (const id of targetIds) {
        void checkAndStoreDiskUsage(id).catch(() => {})
      }
    }

    let capturedError: unknown
    try {
      // Execute pre-backup hook
      if (hooks?.prePath) {
        this.log('info', 'system', 'Executing pre-backup hook...')
        const result = await executeHook(hooks.prePath, 'pre', {
          RUN_ID: this.runId,
          JOB_ID: this.jobId,
        })
        if (!result.success) {
          throw new Error('Pre-backup hook failed or requested skip')
        }
      }

      for (const step of steps) {
        if (this._aborted) break
        const maxAttempts = step.retry?.max_attempts ?? 1
        const backoffType = step.retry?.backoff ?? 'linear'

        this.emit('step:start', { stepId: step.id, type: step.type })
        this.log('info', 'system', `Starting step: ${step.type}`, step.id)

        let lastErr: unknown
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            await this.executeStep(step)
            this.emit('step:complete', { stepId: step.id })
            this.log('info', 'system', `Step completed: ${step.type}`, step.id)
            lastErr = undefined
            break
          } catch (err: unknown) {
            lastErr = err
            const message = err instanceof Error ? err.message : String(err)
            if (attempt < maxAttempts) {
              const delayMs = backoffType === 'exponential'
                ? Math.pow(2, attempt - 1) * 5000
                : attempt * 5000
              this.log('warn', 'system',
                `Step failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs / 1000}s: ${message}`,
                step.id
              )
              await new Promise(r => setTimeout(r, delayMs))
            } else {
              this.emit('step:error', { stepId: step.id, error: message })
              this.log('error', 'system',
                `Step failed after ${maxAttempts} attempt(s): ${message}`,
                step.id
              )
            }
          }
        }
        if (lastErr !== undefined) {
          // Default: stop on error. Opt-out by setting stop_on_error: false.
          if (step.stop_on_error !== false) throw lastErr
          this.log('warn', 'system',
            `Step failed but stop_on_error=false — continuing: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
            step.id
          )
          this.summary.errors++
        }
      }

      if (this._aborted) {
        const duration = this.elapsedSeconds()
        db.prepare('UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?')
          .run('cancelled', new Date().toISOString(), duration, this.runId)
        this.saveSummary(duration * 1000)
        void notificationManager.notify({
          event: 'backup_failed',
          jobName: this.jobName,
          timestamp: new Date().toISOString(),
          duration,
          error: 'Job aborted by user',
        })
        this.emit('job:cancelled')
        return
      }

      const duration = this.elapsedSeconds()
      const finalStatus = this.summary.errors > 0 ? 'failed' : 'success'
      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run(finalStatus, new Date().toISOString(), duration, this.runId)

      this.saveSummary(duration * 1000)
      backupDurationHistogram.observe({ job_name: this.jobName }, duration)

      if (this.backupPaths.length > 0) {
        try {
          await createJobManifest(this.jobId, this.runId, this.backupPaths, this)
        } catch (err) {
          this.log('warn', 'system', `Manifest creation failed: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      this.log('info', 'system',
        `Backup completed: ${this.summary.filesCopied} files copied, ${this.summary.errors} errors`
      )

      // Per-step retention policies (only after a successful run)
      if (finalStatus === 'success') {
        for (const step of steps) {
          const cfg = step.config as { retentionDays?: number; retentionMinimum?: number }
          if (typeof cfg.retentionDays === 'number' && cfg.retentionDays > 0) {
            try {
              const result = await applyRetentionPolicy(this.jobId, {
                deleteOlderThanDays: cfg.retentionDays,
                keepMinimum: cfg.retentionMinimum ?? 3,
                stepType: step.type,
              })
              this.log('info', 'system',
                `Retention (${step.type}): deleted ${result.deleted}, kept ${result.kept}`
              )
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              this.log('warn', 'system', `Retention policy failed for ${step.type}: ${msg}`)
            }
          }
        }
      }

      // Execute post-backup hook
      if (hooks?.postPath) {
        this.log('info', 'system', 'Executing post-backup hook...')
        await executeHook(hooks.postPath, 'post', {
          RUN_ID: this.runId,
          JOB_ID: this.jobId,
        })
      }

      const successEvent = this.summary.errors > 0 ? 'backup_failed' : this.summary.warnings > 0 ? 'backup_warning' : 'backup_success'
      void notificationManager.notify({
        event: successEvent,
        jobName: this.jobName,
        backupId: this.runId,
        timestamp: new Date().toISOString(),
        duration,
        size: this.summary.bytesTransferred,
      })

      // Check disk space and notify if < 10% free
      try {
        const { stdout } = await execFileAsync('df', ['-B1', '/unraid/user'])
        const line = stdout.split('\n')[1] ?? ''
        const parts = line.split(/\s+/)
        const total = parseInt(parts[1] ?? '0', 10)
        const available = parseInt(parts[3] ?? '0', 10)
        if (total > 0 && available / total < 0.10) {
          void notificationManager.notify({
            event: 'disk_space_low',
            jobName: this.jobName,
            timestamp: new Date().toISOString(),
            details: { available_bytes: available, total_bytes: total },
          })
        }
      } catch {
        // /mnt/user may not be mounted in dev — non-critical
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const duration = this.elapsedSeconds()
      db.prepare(
        'UPDATE job_history SET status = ?, ended_at = ?, duration_s = ? WHERE id = ?'
      ).run('failed', new Date().toISOString(), duration, this.runId)

      this.saveSummary(duration * 1000)
      backupDurationHistogram.observe({ job_name: this.jobName }, duration)

      void notificationManager.notify({
        event: 'backup_failed',
        jobName: this.jobName,
        timestamp: new Date().toISOString(),
        duration,
        error: message,
      })

      capturedError = err
    } finally {
      for (const cfg of nasPowerConfigs) {
        await shutdownNASIfEnabled(cfg, powerLog)
      }
    }

    if (capturedError !== undefined) {
      const message = capturedError instanceof Error ? capturedError.message : String(capturedError)
      this.emit('job:error', { error: message })
      logger.error({ runId: this.runId, error: message }, 'Job execution failed')
      throw capturedError
    }
    this.emit('job:complete')
    logger.info({ runId: this.runId }, 'Job execution completed')
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
      case 'vms': {
        const { executeVMBackup } = await import('./steps/vms.js')
        await executeVMBackup(step.config as unknown as Parameters<typeof executeVMBackup>[0], this)
        break
      }
      case 'docker_images': {
        const { executeDockerImageExport } = await import('./steps/docker-images.js')
        await executeDockerImageExport(step.config as unknown as Parameters<typeof executeDockerImageExport>[0], this)
        break
      }
      case 'system_config': {
        const { executeSystemConfigBackup } = await import('./steps/system-config.js')
        await executeSystemConfigBackup(step.config as unknown as Parameters<typeof executeSystemConfigBackup>[0], this)
        break
      }
      case 'custom': {
        const { executeCustomBackup } = await import('./steps/custom.js')
        await executeCustomBackup(step.config as unknown as Parameters<typeof executeCustomBackup>[0], this)
        break
      }
      case 'helbackup_self': {
        const { executeHELBACKUPSelfBackup } = await import('./steps/helbackup-self.js')
        await executeHELBACKUPSelfBackup(step.config as unknown as Parameters<typeof executeHELBACKUPSelfBackup>[0], this)
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

    const result = db.prepare(
      'INSERT INTO logs (run_id, step_id, sequence, level, category, message, metadata, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
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
      id: String(result.lastInsertRowid),
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

  addTransferred(files: number, bytes: number): void {
    this.summary.filesCopied += files
    this.summary.bytesTransferred += bytes
  }

  recordBackupPath(type: string, backupPath: string, targetId?: string, checksums?: ChecksumEntry[]): void {
    this.backupPaths.push({ type, path: backupPath, targetId, checksums })
  }

  getRunId(): string {
    return this.runId
  }

  getJobId(): string {
    return this.jobId
  }

  abort(): void {
    this._aborted = true
    for (const proc of this._childProcesses) {
      try { proc.kill('SIGTERM') } catch { /* already gone */ }
    }
    this._childProcesses.clear()
  }
  isAborted(): boolean { return this._aborted }

  registerChildProcess(proc: import('child_process').ChildProcess): void {
    this._childProcesses.add(proc)
    proc.on('close', () => this._childProcesses.delete(proc))
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
