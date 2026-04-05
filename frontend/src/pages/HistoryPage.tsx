import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { History, CheckCircle, XCircle, Loader, Ban, ExternalLink } from 'lucide-react'
import { api, type HistoryEntry } from '../api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

function StatusBadge({ status }: { status: HistoryEntry['status'] }) {
  const { t } = useTranslation()
  const map = {
    success:   { icon: <CheckCircle size={12} />, cls: 'bg-green-500/15 text-green-400',                label: t('status.success') },
    failed:    { icon: <XCircle size={12} />,     cls: 'bg-red-500/15 text-red-400',                   label: t('status.failed') },
    running:   { icon: <Loader size={12} className="animate-spin" />, cls: 'bg-blue-500/15 text-blue-400', label: t('status.running') },
    cancelled: { icon: <Ban size={12} />,         cls: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', label: t('status.cancelled') },
  }
  const { icon, cls, label } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${cls}`}>
      {icon}{label}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.history.getAll()
      .then(setEntries)
      .catch(() => toast(t('history.load_error'), 'error'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
        {t('loading')}
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-grid relative">
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <div className="relative">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
          {t('history.title')}
        </h1>

        {entries.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <History size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('history.empty')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map(entry => (
              <Card key={entry.id} hover className="border-holographic corner-cuts">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <History size={14} className="text-[var(--theme-primary)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {entry.job_name ?? entry.job_id}
                      </p>
                      <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                        {formatDate(entry.started_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {entry.duration_s !== null && (
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {entry.duration_s}{t('history.seconds')}
                      </span>
                    )}
                    <StatusBadge status={entry.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/logs/${entry.id}`)}
                    >
                      <ExternalLink size={12} />
                      {t('history.view_logs')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
