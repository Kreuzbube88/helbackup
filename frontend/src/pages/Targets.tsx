import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDrive, Cloud, Server, Trash2, Pencil } from 'lucide-react'
import { api, type Target } from '../api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useToast } from '../components/common/Toast'
import { TableRowSkeleton } from '../components/common/Skeleton'
import { Tooltip } from '../components/common/Tooltip'
import { TargetCreateModal } from '../components/targets/TargetCreateModal'
import { TargetEditModal } from '../components/targets/TargetEditModal'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  nas:    <Server size={16} />,
  rclone: <Cloud size={16} />,
  local:  <HardDrive size={16} />,
}

export function Targets() {
  const { t } = useTranslation('targets')
  const { toast } = useToast()
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Target | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useKeyboardShortcut({ key: 'n', ctrl: true }, () => setShowCreateModal(true))

  function loadTargets() {
    setLoading(true)
    setLoadError(false)
    api.targets.getAll()
      .then(setTargets)
      .catch(() => { toast(t('load_error'), 'error'); setLoadError(true) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTargets()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteTarget = async (): Promise<void> => {
    if (!deleteTargetId) return
    try {
      await api.targets.delete(deleteTargetId)
      toast(t('deleted'), 'success')
      loadTargets()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('delete_error'), 'error')
    }
    setDeleteTargetId(null)
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto bg-grid relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('title')}</h1>
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <TableRowSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-sm text-red-400">{t('load_error')}</p>
        <Button variant="secondary" size="sm" onClick={loadTargets}>{t('common:buttons.retry', 'Retry')}</Button>
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
          <Tooltip content="Ctrl+N">
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              {t('create')}
            </Button>
          </Tooltip>
        </div>

        {targets.length === 0 ? (
          <Card className="border-holographic corner-cuts flex flex-col items-center justify-center py-20 gap-4">
            <HardDrive size={40} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">{t('empty')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {targets.map(target => (
              <Card key={target.id} hover className="border-holographic card-lift corner-cuts animate-slide-up">
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
                  <div className="flex items-center gap-2">
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
                    <Tooltip content={t('edit')}>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(target)}>
                        <Pencil size={12} />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('delete_confirm_title')}>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(target.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TargetCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadTargets}
      />

      <TargetEditModal
        target={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSuccess={loadTargets}
      />

      <ConfirmModal
        open={deleteTargetId !== null}
        onConfirm={() => { void handleDeleteTarget() }}
        onCancel={() => setDeleteTargetId(null)}
        title={t('delete_confirm_title')}
        message={t('delete_confirm_message')}
        variant="danger"
      />
    </div>
  )
}
