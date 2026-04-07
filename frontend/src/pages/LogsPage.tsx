import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download } from 'lucide-react'
import { api, type JobHistoryRun } from '../api'
import { LogTimeline, type LogEntry } from '../components/logs/LogTimeline'
import { LogFilters, type Filters } from '../components/logs/LogFilters'
import { LogSummary } from '../components/logs/LogSummary'
import { Button } from '../components/common/Button'

export function LogsPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [run, setRun] = useState<JobHistoryRun | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [filters, setFilters] = useState<Filters>({ level: 'all', category: 'all', search: '' })

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    let esRef: EventSource | null = null

    api.executions.get(runId).then(setRun).catch(() => {/* will retry via SSE close */})

    function attachSseHandlers(source: EventSource) {
      if (cancelled) { source.close(); return }
      esRef = source
      setIsLive(true)

      source.addEventListener('log', e => {
        const log = JSON.parse((e as MessageEvent).data) as LogEntry
        if (typeof log.metadata === 'string') {
          try { log.metadata = JSON.parse(log.metadata as unknown as string) } catch { log.metadata = null }
        }
        setLogs(prev => [...prev, log])
      })

      const finish = () => {
        setIsLive(false)
        source.close()
        if (!cancelled) api.executions.get(runId!).then(setRun).catch(() => {/* ignore */})
      }

      source.addEventListener('complete', finish)
      source.onerror = finish
    }

    api.logs.requestSseToken(runId)
      .then(({ sseToken }) => {
        if (!cancelled) attachSseHandlers(new EventSource(`/api/logs/${runId}/stream?sseToken=${encodeURIComponent(sseToken)}`))
      })
      .catch(() => {
        // Do not fall back to passing JWT in URL — it would leak in logs/history
        if (!cancelled) setIsLive(false)
      })

    return () => { cancelled = true; esRef?.close() }
  }, [runId])

  if (!runId) {
    return (
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft size={14} />
            {t('common:buttons.back')}
          </Button>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t('logs.title')}</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="text-5xl">📋</span>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {t('logs.no_logs_title', 'No Logs Available')}
          </p>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            {t('logs.no_logs_message', 'Run a backup job to see logs here. Logs appear after job execution starts.')}
          </p>
          <Button variant="primary" onClick={() => navigate('/jobs')}>
            {t('logs.view_jobs', 'View Jobs')}
          </Button>
        </div>
      </div>
    )
  }

  const filteredLogs = logs.filter(log => {
    if (filters.level !== 'all' && log.level !== filters.level) return false
    if (filters.category !== 'all' && log.category !== filters.category) return false
    if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const handleExport = () => {
    const text = logs
      .map(l => `[${l.ts}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${runId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusColor = run == null ? '' : {
    running: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    success: 'bg-green-500/20 text-green-400 border-green-500/40',
    failed: 'bg-red-500/20 text-red-400 border-red-500/40',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  }[run.status] ?? ''

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft size={14} />
            {t('common:buttons.cancel')}
          </Button>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t('logs.title')}</h1>
          {run && (
            <span className={`px-2 py-0.5 text-xs font-mono border ${statusColor}`}>
              {run.status.toUpperCase()}
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={14} />
          {t('logs.export')}
        </Button>
      </div>

      {run && <LogSummary logs={filteredLogs} run={run} />}

      <LogFilters filters={filters} onChange={setFilters} />

      <LogTimeline logs={filteredLogs} />
    </div>
  )
}
