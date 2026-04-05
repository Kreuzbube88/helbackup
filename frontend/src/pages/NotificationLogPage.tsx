import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api'
import { Card } from '../components/common/Card'
import { useToast } from '../components/common/Toast'
import { TableRowSkeleton } from '../components/common/Skeleton'

interface NotificationLogEntry {
  id: number
  channel: string
  event: string
  success: boolean
  error?: string
  created_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function NotificationLogPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [logs, setLogs] = useState<NotificationLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.notifications.getLog()
      .then(data => setLogs(data as NotificationLogEntry[]))
      .catch(() => toast(t('notifications.load_error', 'Failed to load notification log'), 'error'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto bg-grid relative">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
          {t('notifications.log_title', 'Notification Log')}
        </h1>
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
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
          {t('notifications.log_title', 'Notification Log')}
        </h1>

        {logs.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <Bell size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {t('notifications.log_empty', 'No notifications sent yet. History will appear here after your first backup runs.')}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map(log => (
              <Card key={log.id} className="border-holographic corner-cuts animate-slide-up">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {log.success
                      ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                      : <XCircle   size={14} className="text-red-400 shrink-0" />
                    }
                    <div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{log.channel}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">{log.event}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {log.error && (
                      <span className="text-xs text-red-400 max-w-xs truncate">{log.error}</span>
                    )}
                    <span
                      className={[
                        'px-2 py-0.5 text-xs rounded',
                        log.success
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400',
                      ].join(' ')}
                    >
                      {log.success ? t('status.success', 'Success') : t('status.failed', 'Failed')}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {formatDate(log.created_at)}
                    </span>
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
