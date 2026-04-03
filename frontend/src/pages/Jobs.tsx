import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Briefcase, Calendar, Zap } from 'lucide-react'
import { api, type Job } from '../api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

export function Jobs() {
  const { t } = useTranslation('jobs')
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.jobs.getAll()
      .then(setJobs)
      .catch(() => toast(t('load_error'), 'error'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
        {t('common:loading')}
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
          <Button variant="primary" size="sm">
            {t('create')}
          </Button>
        </div>

        {jobs.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <Briefcase size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('empty')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map(job => (
              <Card key={job.id} hover className="border-holographic card-lift corner-cuts">
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
