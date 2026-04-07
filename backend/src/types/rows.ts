/**
 * Shared database row types — single source of truth for all DB queries.
 * Each interface matches the SQLite schema + migrations.
 */

export interface JobRow {
  id: string
  name: string
  enabled: number
  schedule: string | null
  steps: string
  created_at: string
  updated_at: string
  use_database_dumps: number
  verify_checksums: number
  retention_days: number | null
  retention_minimum: number
  pre_backup_script: string | null
  post_backup_script: string | null
  use_encryption: number
}

export interface TargetRow {
  id: string
  name: string
  type: string
  config: string
  enabled: number
  created_at: string
  updated_at: string
  encryption_method: string | null
  retention_scheme: string | null
  gfs_daily_keep: number | null
  gfs_weekly_keep: number | null
  gfs_monthly_keep: number | null
}

export interface JobHistoryRow {
  id: string
  job_id: string
  status: string
  started_at: string
  ended_at: string | null
  duration_s: number | null
}

export interface LogSummaryRow {
  id: string
  run_id: string
  files_copied: number
  files_skipped: number
  files_failed: number
  bytes_transferred: number
  errors: number
  warnings: number
  duration_ms: number | null
  created_at: string
}

export interface ManifestRow {
  id: number
  backup_id: string
  job_id: string
  manifest: string
  created_at: string
  verified: number
  last_verified: string | null
  verification_passed: number | null
  verification_failed: number | null
  verification_missing: number | null
}

export interface NotificationConfigRow {
  id: number
  channel: string
  enabled: number
  config: string
  events: string
  created_at: string
  updated_at: string | null
}
