import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface LogEntry {
  id: string
  run_id: string
  step_id: string | null
  sequence: number | null
  level: 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
  metadata: Record<string, unknown> | null
  ts: string
}

interface Props {
  logs: LogEntry[]
}

export function LogTimeline({ logs }: Props) {
  const { t } = useTranslation('common')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="bg-black text-white font-mono text-xs p-4 border border-[var(--border-default)] max-h-[600px] overflow-y-auto">
      {logs.length === 0 && (
        <span className="text-[var(--text-muted)]">{t('logs.waiting')}</span>
      )}
      {logs.map(log => (
        <LogLine key={log.id} log={log} />
      ))}
      <div ref={endRef} />
    </div>
  )
}

function LogLine({ log }: { log: LogEntry }) {
  const levelColor = {
    error: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-blue-400',
    debug: 'text-gray-500',
  }[log.level] ?? 'text-gray-400'

  const levelIcon = { error: '✗', warn: '⚠', info: '●', debug: '·' }[log.level] ?? '·'

  const time = new Date(log.ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const progress = log.metadata?.progress as { current?: number; total?: number; speed?: number; eta_seconds?: number } | undefined
  const file = log.metadata?.file as { size?: number } | undefined

  return (
    <div className="flex gap-2 mb-0.5 leading-5">
      <span className="text-gray-600 shrink-0">{time}</span>
      <span className={`shrink-0 ${levelColor}`}>{levelIcon}</span>
      <span className="text-gray-500 shrink-0">[{log.category}]</span>
      <span className="flex-1 break-all text-gray-200">{log.message}</span>
      {file?.size != null && file.size > 0 && (
        <span className="text-gray-600 shrink-0">{formatBytes(file.size)}</span>
      )}
      {progress != null && progress.total != null && progress.total > 0 && (
        <span className="text-cyan-500 shrink-0 text-xs">
          {Math.round(((progress.current ?? 0) / progress.total) * 100)}%
          {progress.speed != null && ` ${formatSpeed(progress.speed)}`}
          {progress.eta_seconds != null && ` ETA:${formatETA(progress.eta_seconds)}`}
        </span>
      )}
    </div>
  )
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)}KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)}MB`
  return `${(b / 1024 ** 3).toFixed(2)}GB`
}

function formatSpeed(bps: number): string {
  return `${(bps / 1024 ** 2).toFixed(1)}MB/s`
}

function formatETA(s: number): string {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${s % 60}s`
}
