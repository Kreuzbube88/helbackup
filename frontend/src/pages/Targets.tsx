import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDrive, Cloud, Server } from 'lucide-react'
import { api, type Target } from '../api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  synology: <Server size={16} />,
  rclone: <Cloud size={16} />,
  local: <HardDrive size={16} />,
}

export function Targets() {
  const { t } = useTranslation('targets')
  const { toast } = useToast()
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.targets.getAll()
      .then(setTargets)
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

        {targets.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <HardDrive size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('empty')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {targets.map(target => (
              <Card key={target.id} hover className="border-holographic card-lift corner-cuts">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--theme-accent)] shrink-0">
                      {TYPE_ICONS[target.type] ?? <HardDrive size={16} />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{target.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {t(`type_${target.type}` as const)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={[
                      'px-2 py-0.5 text-xs rounded',
                      target.enabled
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                    ].join(' ')}
                  >
                    {target.enabled ? t('common:status.enabled') : t('common:status.disabled')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
