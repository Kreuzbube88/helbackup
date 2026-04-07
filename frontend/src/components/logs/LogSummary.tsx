import { useTranslation } from 'react-i18next'
import type { LogEntry } from './LogTimeline'
import type { JobHistoryRun } from '../../api'

interface Props {
  logs: LogEntry[]
  run: JobHistoryRun
}

export function LogSummary({ logs, run }: Props) {
  const { t } = useTranslation()

  // Prefer DB summary (written after job completes), fall back to counting logs for live runs
  const hasDbSummary = run.files_copied != null
  const stats = hasDbSummary
    ? {
        filesCopied: run.files_copied ?? 0,
        warnings: run.warnings ?? 0,
        errors: run.errors ?? 0,
      }
    : logs.reduce(
        (acc, log) => {
          if (log.level === 'error') acc.errors++
          if (log.level === 'warn') acc.warnings++
          const file = log.metadata?.file as { result?: string; size?: number } | undefined
          if (file?.result === 'copied') acc.filesCopied++
          return acc
        },
        { errors: 0, warnings: 0, filesCopied: 0 }
      )

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <StatBox label={t('logs.duration')} value={run.duration_s != null ? `${run.duration_s}s` : '—'} />
      <StatBox label={t('logs.files_copied')} value={String(stats.filesCopied)} color="text-green-400" />
      <StatBox label={t('logs.warnings')} value={String(stats.warnings)} color={stats.warnings > 0 ? 'text-yellow-400' : undefined} />
      <StatBox label={t('logs.errors')} value={String(stats.errors)} color={stats.errors > 0 ? 'text-red-400' : undefined} />
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-[var(--border-default)] p-3 bg-[var(--bg-elevated)]">
      <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color ?? 'text-[var(--text-primary)]'}`}>{value}</div>
    </div>
  )
}
