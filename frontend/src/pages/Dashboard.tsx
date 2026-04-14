import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, AlertTriangle, XCircle, Activity,
  HardDrive, Briefcase, RefreshCw, Settings, Zap,
} from 'lucide-react'
import { formatBytes } from '../utils/format'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useToast } from '../components/common/Toast'
import { CardSkeleton } from '../components/common/Skeleton'
import { FirstBackupWizard } from '../components/onboarding/FirstBackupWizard'
import { api, dashboard as dashboardApi, type DashboardData } from '../api'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m`
}

export function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [runningBackup, setRunningBackup] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    void loadDashboard()
    const interval = setInterval(() => { void loadDashboard() }, 15000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboard = async () => {
    try {
      const result = await dashboardApi.get()
      setData(result)
    } catch {
      if (!data) toast(t('dashboard.load_error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const runBackupNow = async () => {
    setShowRunConfirm(false)
    setRunningBackup(true)
    try {
      const jobs = await api.jobs.getAll()
      const enabledJob = jobs.find(j => j.enabled)
      if (!enabledJob) {
        toast(t('dashboard.no_enabled_jobs'), 'warning')
        return
      }
      await api.jobs.execute(enabledJob.id)
      toast(t('dashboard.backup_started'), 'success')
      setTimeout(() => { void loadDashboard() }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast(msg, 'error')
    } finally {
      setRunningBackup(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-400">{t('dashboard.load_error')}</div>
      </div>
    )
  }

  const statusConfig = {
    healthy: { color: 'text-emerald-400', border: 'border-emerald-500', Icon: CheckCircle },
    warning: { color: 'text-amber-400', border: 'border-amber-500', Icon: AlertTriangle },
    critical: { color: 'text-red-400', border: 'border-red-500', Icon: XCircle },
  }[data.systemStatus.status]

  const warningBorder = {
    error: 'border-red-500 bg-red-500/5',
    warning: 'border-amber-500 bg-amber-500/5',
    info: 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5',
  }

  const warningIcon = {
    error: <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />,
    info: <Activity size={14} className="text-[var(--theme-primary)] shrink-0 mt-0.5" />,
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-grid relative space-y-6">
      {/* Background watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('nav.dashboard')}
        </h1>
        <Button
          variant="primary"
          size="sm"
          loading={runningBackup}
          onClick={() => setShowRunConfirm(true)}
        >
          <Activity size={14} />
          {t('dashboard.run_now')}
        </Button>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="space-y-2 relative">
          {data.warnings.map((w, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 px-4 py-3 border text-sm ${warningBorder[w.type]}`}
            >
              {warningIcon[w.type]}
              <span className="text-[var(--text-primary)] flex-1">{t(`dashboard.warning_${w.code}`, { count: w.count })}</span>
              {w.actionCode && (
                <span className="text-xs text-[var(--text-muted)] shrink-0">{t(`dashboard.action_${w.actionCode}`)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status + Success Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <Card className={`p-5 border-2 ${statusConfig.border} corner-cuts`}>
          <div className="flex items-center gap-2 mb-3">
            <statusConfig.Icon size={16} className={statusConfig.color} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('dashboard.system_status')}
            </h2>
          </div>
          <p className={`text-sm font-medium ${statusConfig.color} mb-4`}>
            {t(`dashboard.status_${data.systemStatus.code}`)}
          </p>
          {data.systemStatus.lastBackup && (
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <div className="text-[var(--text-secondary)] font-medium">
                {t('dashboard.last_backup')}
              </div>
              <div className="font-mono">{data.systemStatus.lastBackup.jobName}</div>
              <div>
                {new Date(data.systemStatus.lastBackup.timestamp).toLocaleString()}
                {' · '}
                {formatDuration(data.systemStatus.lastBackup.duration)}
              </div>
            </div>
          )}
          {data.systemStatus.nextScheduled && (
            <div className="text-xs text-[var(--text-muted)] space-y-1 mt-3">
              <div className="text-[var(--text-secondary)] font-medium">
                {t('dashboard.next_scheduled')}
              </div>
              <div className="font-mono">{data.systemStatus.nextScheduled.jobName}</div>
              <div>{new Date(data.systemStatus.nextScheduled.timestamp).toLocaleString()}</div>
            </div>
          )}
        </Card>

        <Card className="p-5 border border-[var(--border-default)] corner-cuts">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-[var(--theme-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('dashboard.success_rate')}
            </h2>
          </div>
          <div className="text-center py-2">
            <div className={`text-5xl font-bold font-mono ${
              data.successRate.percentage >= 90
                ? 'text-emerald-400'
                : data.successRate.percentage >= 70
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {data.successRate.percentage}%
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {t('dashboard.last_30_days')}
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <div className="flex justify-between">
              <span className="text-emerald-400">{t('status.success')}</span>
              <span className="font-mono">{data.successRate.successful}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">{t('status.failed')}</span>
              <span className="font-mono">{data.successRate.failed}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-default)] pt-1 mt-1">
              <span>{t('dashboard.total')}</span>
              <span className="font-mono">{data.successRate.total}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 30-Day Chart */}
      <Card className="p-5 border border-[var(--border-default)] relative corner-cuts">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          {t('dashboard.backup_history')}
        </h2>
        <div className="flex items-end gap-0.5 h-24">
          {data.backupHistory.map((day, idx) => {
            const height = day.total > 0
              ? Math.max(12, (day.success / day.total) * 100)
              : 12
            const color = day.total === 0
              ? 'bg-[var(--border-default)]'
              : day.failed > 0
              ? 'bg-red-500'
              : 'bg-emerald-500'

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end h-full"
                title={`${day.date}: ${day.success} ok, ${day.failed} failed`}
              >
                <div
                  className={`${color} w-full rounded-t opacity-80 hover:opacity-100 transition-opacity`}
                  style={{ height: `${height}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
          <span>{t('dashboard.chart_start')}</span>
          <span>{t('dashboard.chart_end')}</span>
        </div>
      </Card>

      {/* Storage + Recent Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <Card className="p-5 border border-[var(--border-default)] corner-cuts">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-[var(--theme-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('dashboard.storage')}
            </h2>
          </div>

          {/* Global stats */}
          <div className="space-y-1 text-xs text-[var(--text-muted)] mb-3">
            <div className="flex justify-between">
              <span>{t('dashboard.total_backups')}</span>
              <span className="font-mono">{data.storage.backupCount}</span>
            </div>
            {data.storage.manifestTotalBytes > 0 && (
              <div className="flex justify-between">
                <span>{t('dashboard.storage_backup_volume')}</span>
                <span className="font-mono text-[var(--text-secondary)]">{formatBytes(data.storage.manifestTotalBytes)}</span>
              </div>
            )}
            {data.storage.oldestBackup && (
              <div className="flex justify-between">
                <span>{t('dashboard.oldest_backup')}</span>
                <span className="font-mono">{new Date(data.storage.oldestBackup).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Per-target disk info */}
          {data.storage.targets.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] py-1">
              {t('dashboard.storage_unavailable')}
            </div>
          ) : (
            <div className="space-y-3">
              {data.storage.targets.map(target => {
                const pct = target.diskTotal && target.diskUsed
                  ? Math.round((target.diskUsed / target.diskTotal) * 100)
                  : null
                return (
                  <div key={target.id} className="border-t border-[var(--border-default)] pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--text-primary)] truncate">{target.name}</span>
                      <span className="text-[10px] font-mono border border-[var(--border-default)] text-[var(--text-muted)] px-1">
                        {t(`dashboard.storage_target_type_${target.type}`, target.type.toUpperCase())}
                      </span>
                    </div>
                    {target.diskTotal && target.diskUsed !== null && target.diskAvailable !== null ? (
                      <>
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                          <span className="font-mono text-[var(--text-primary)]">{formatBytes(target.diskUsed)}</span>
                          <span>{t('dashboard.storage_disk_free', { free: formatBytes(target.diskAvailable), total: formatBytes(target.diskTotal) })}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${pct && pct > 90 ? 'bg-red-500' : pct && pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </div>
                        {target.diskCheckedAt && (
                          <div className="text-[10px] text-[var(--text-muted)] mt-1">
                            {t('dashboard.storage_disk_checked', { date: new Date(target.diskCheckedAt).toLocaleString() })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {t('dashboard.storage_disk_pending')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 border border-[var(--border-default)] corner-cuts">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={16} className="text-[var(--theme-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('dashboard.recent_jobs')}
            </h2>
          </div>
          {data.recentJobs.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] py-4 text-center">
              {t('dashboard.no_jobs_yet')}
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {data.recentJobs.map(job => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => navigate(`/logs/${job.id}`)}
                  className="w-full text-left px-3 py-2 border border-[var(--border-default)] hover:border-[var(--theme-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
                      {job.status === 'success'
                        ? <CheckCircle size={12} className="inline text-emerald-400 mr-1" />
                        : <XCircle size={12} className="inline text-red-400 mr-1" />
                      }
                      {job.jobName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-2 shrink-0">
                      {formatDuration(job.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {new Date(job.startTime).toLocaleString()}
                    {job.size > 0 && ` · ${formatBytes(job.size)}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-5 border border-[var(--border-default)] relative corner-cuts">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          {t('dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
            <Briefcase size={14} />
            {t('nav.jobs')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/recovery')}>
            <RefreshCw size={14} />
            {t('nav.recovery')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/targets')}>
            <HardDrive size={14} />
            {t('nav.targets')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>
            <Settings size={14} />
            {t('nav.settings')}
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)}>
            <Zap size={14} />
            {t('guide.open_guide')}
          </Button>
        </div>
      </Card>

      <ConfirmModal
        open={showRunConfirm}
        onConfirm={() => { void runBackupNow() }}
        onCancel={() => setShowRunConfirm(false)}
        title={t('dashboard.confirm_run_title')}
        message={t('dashboard.confirm_run_now')}
        variant="warning"
      />
      <FirstBackupWizard
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onSuccess={() => void loadDashboard()}
      />
    </div>
  )
}
