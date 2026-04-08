import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Calendar, Zap, Play, Trash2, Pencil } from 'lucide-react'
import { api, recovery as recoveryApi, type Job } from '../api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useToast } from '../components/common/Toast'
import { TableRowSkeleton } from '../components/common/Skeleton'
import { Tooltip } from '../components/common/Tooltip'
import { JobWizard } from '../components/jobs/JobWizard'
import { FirstBackupWizard } from '../components/onboarding/FirstBackupWizard'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

export function Jobs() {
  const { t } = useTranslation('jobs')
  const { toast } = useToast()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [executing, setExecuting] = useState<Set<string>>(new Set())
  const [executeConfirmId, setExecuteConfirmId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useKeyboardShortcut({ key: 'n', ctrl: true }, () => setShowCreateModal(true))

  function loadJobs() {
    setLoading(true)
    setLoadError(false)
    api.jobs.getAll()
      .then(setJobs)
      .catch(() => { toast(t('load_error'), 'error'); setLoadError(true) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadJobs()
    recoveryApi.getStatus().then(s => setRecoveryMode(s.enabled)).catch(() => undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteJob = async (): Promise<void> => {
    if (!deleteJobId) return
    try {
      await api.jobs.delete(deleteJobId)
      toast(t('deleted'), 'success')
      loadJobs()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('delete_error'), 'error')
    }
    setDeleteJobId(null)
  }

  const handleExecute = async (jobId: string): Promise<void> => {
    setExecuting(prev => new Set(prev).add(jobId))
    try {
      const { runId } = await api.jobs.execute(jobId)
      navigate(`/logs/${runId}`)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('execute_error'), 'error')
    } finally {
      setExecuting(prev => { const s = new Set(prev); s.delete(jobId); return s })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto bg-grid relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('title')}</h1>
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-sm text-red-400">{t('load_error')}</p>
        <Button variant="secondary" size="sm" onClick={loadJobs}>{t('common:buttons.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-grid relative">
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <div className="relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('title')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)}>
              {t('common:guide.open_guide')}
            </Button>
            <Tooltip content="Ctrl+N">
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                {t('create')}
              </Button>
            </Tooltip>
          </div>
        </div>

        {jobs.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <Briefcase size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('empty')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map(job => (
              <Card key={job.id} hover className="border-holographic card-lift corner-cuts animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Briefcase size={16} className="text-[var(--theme-primary)] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{job.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {job.schedule ? (
                          <>
                            <Calendar size={11} className="text-[var(--text-muted)]" />
                            <span className="text-xs font-mono text-[var(--text-muted)]">{job.schedule}</span>
                          </>
                        ) : (
                          <>
                            <Zap size={11} className="text-[var(--text-muted)]" />
                            <span className="text-xs text-[var(--text-muted)]">{t('manual')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {Array.isArray(job.steps) ? job.steps.length : 0} {t('steps')}
                    </span>
                    <span
                      className={[
                        'px-2 py-0.5 text-xs rounded',
                        job.enabled
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                      ].join(' ')}
                    >
                      {job.enabled ? t('common:status.enabled') : t('common:status.disabled')}
                    </span>
                    <Tooltip content={t('edit')}>
                      <Button variant="ghost" size="sm" onClick={() => setEditJob(job)}>
                        <Pencil size={12} />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('delete_confirm_title')}>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteJobId(job.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </Tooltip>
                    <Tooltip content={recoveryMode ? t('recovery_mode_blocked') : t('execute')}>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={executing.has(job.id) || recoveryMode}
                        onClick={() => setExecuteConfirmId(job.id)}
                      >
                        <Play size={12} />
                        {executing.has(job.id) ? t('executing') : t('execute')}
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={executeConfirmId !== null}
        onConfirm={() => { if (executeConfirmId !== null) { void handleExecute(executeConfirmId); setExecuteConfirmId(null) } }}
        onCancel={() => setExecuteConfirmId(null)}
        title={t('execute_confirm_title')}
        message={t('execute_confirm_message')}
        variant="warning"
      />

      <JobWizard
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadJobs}
      />

      <JobWizard
        job={editJob}
        open={editJob !== null}
        onClose={() => setEditJob(null)}
        onSuccess={loadJobs}
      />

      <ConfirmModal
        open={deleteJobId !== null}
        onConfirm={() => { void handleDeleteJob() }}
        onCancel={() => setDeleteJobId(null)}
        title={t('delete_confirm_title')}
        message={t('delete_confirm_message')}
        variant="danger"
      />

      <FirstBackupWizard
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onSuccess={loadJobs}
      />
    </div>
  )
}
