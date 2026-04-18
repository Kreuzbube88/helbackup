import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, ArrowDown, X, RefreshCw } from 'lucide-react'
import { Select } from '../../../common/Select'
import DockerImageSelector from '../../../jobs/DockerImageSelector'
import { EncryptionToggle } from '../shared/EncryptionToggle'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import { api } from '../../../../api'
import type { Container } from '../../../../api'
import type { Target } from '../../../../api'

export interface AppdataStepConfig {
  targetId: string
  allContainersDynamic: boolean
  containers: string[]
  excludedContainers: string[]
  stopOrderPriority: string[]
  stopContainers: boolean
  stopOrder: string[]
  stopDelay: number
  restartDelay: number
  method: 'tar' | 'rsync'
  useDatabaseDumps: boolean
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
  stopOnError?: boolean
}

interface Props {
  value: AppdataStepConfig
  onChange: (value: AppdataStepConfig) => void
  targets: Target[]
}

export function AppdataConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')
  const [liveContainers, setLiveContainers] = useState<Container[]>([])
  const [loadingContainers, setLoadingContainers] = useState(false)

  const loadContainers = () => {
    setLoadingContainers(true)
    api.docker.listContainers()
      .then(data => setLiveContainers([...data].sort((a, b) => {
        const nameA = a.Names[0]?.replace('/', '') ?? ''
        const nameB = b.Names[0]?.replace('/', '') ?? ''
        return nameA.localeCompare(nameB)
      })))
      .catch(() => {}) // non-critical; DockerImageSelector shows its own error in manual mode
      .finally(() => setLoadingContainers(false))
  }
  useEffect(() => { loadContainers() }, [])

  const liveNames = liveContainers.map(c => c.Names[0]?.replace('/', '') ?? c.Id.slice(0, 12))
  const targetOptions = targets.map(tgt => ({ value: tgt.id, label: tgt.name }))

  const handleContainersChange = (containers: string[]) => {
    const newStopOrder = [
      ...value.stopOrder.filter(id => containers.includes(id)),
      ...containers.filter(id => !value.stopOrder.includes(id)),
    ]
    onChange({ ...value, containers, stopOrder: newStopOrder })
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...value.stopOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    onChange({ ...value, stopOrder: newOrder })
  }

  const moveDown = (index: number) => {
    if (index === value.stopOrder.length - 1) return
    const newOrder = [...value.stopOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    onChange({ ...value, stopOrder: newOrder })
  }

  const movePriorityUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...value.stopOrderPriority]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    onChange({ ...value, stopOrderPriority: newOrder })
  }

  const movePriorityDown = (index: number) => {
    if (index === value.stopOrderPriority.length - 1) return
    const newOrder = [...value.stopOrderPriority]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    onChange({ ...value, stopOrderPriority: newOrder })
  }

  const stopOrderItems = value.stopOrder.filter(id => value.containers.includes(id))
  const previewNames = liveNames.filter(n => !value.excludedContainers.includes(n))
  const excludableNames = liveNames.filter(n => !value.excludedContainers.includes(n))
  const prioritizableNames = liveNames.filter(
    n => !value.stopOrderPriority.includes(n) && !value.excludedContainers.includes(n)
  )

  return (
    <div className="space-y-5">
      {targets.length === 0 && <NoTargetNotice />}
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />
      {!value.targetId && (
        <p className="text-xs text-[var(--status-error)]">{t('validation_needs_target')}</p>
      )}

      {/* Mode toggle */}
      <div className="pt-3 border-t border-[var(--border-default)]">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t('appdata_container_mode')}</p>
        <div className="flex">
          <button
            type="button"
            onClick={() => onChange({ ...value, allContainersDynamic: false })}
            className={[
              'flex-1 py-1.5 text-xs border transition-colors',
              !value.allContainersDynamic
                ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white font-semibold'
                : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {t('appdata_mode_manual')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, allContainersDynamic: true })}
            className={[
              'flex-1 py-1.5 text-xs border-t border-b border-r transition-colors',
              value.allContainersDynamic
                ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)] text-white font-semibold'
                : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {t('appdata_mode_dynamic')}
          </button>
        </div>
      </div>

      {!value.allContainersDynamic ? (
        /* ── MANUAL MODE ── */
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{t('select_containers')}</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleContainersChange(liveNames)}
                  className="text-xs text-[var(--theme-primary)] hover:underline"
                >
                  {t('appdata_select_all')}
                </button>
                <button
                  type="button"
                  onClick={() => handleContainersChange([])}
                  className="text-xs text-[var(--text-muted)] hover:underline"
                >
                  {t('appdata_select_none')}
                </button>
              </div>
            </div>
            <DockerImageSelector value={value.containers} onChange={handleContainersChange} preloadedContainers={liveContainers} />
          </div>
          {value.containers.length === 0 && (
            <p className="text-xs text-[var(--status-error)]">{t('validation_needs_containers')}</p>
          )}
          <p className="text-xs text-[var(--text-muted)] italic">{t('appdata_helbackup_excluded')}</p>
        </>
      ) : (
        /* ── DYNAMIC MODE ── */
        <>
          <div className="border border-[var(--theme-accent)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--theme-accent)]">
            ✦ {t('appdata_dynamic_info')}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs text-[var(--text-muted)]">
                {t('appdata_dynamic_preview', { count: previewNames.length })}
              </p>
              <button
                type="button"
                onClick={loadContainers}
                disabled={loadingContainers}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                aria-label={t('common:buttons.refresh')}
              >
                <RefreshCw size={12} className={loadingContainers ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-1.5 break-all min-h-[28px]">
              {previewNames.length > 0 ? previewNames.join(', ') : t('appdata_dynamic_none_detected')}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('appdata_exclude_label')}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {value.excludedContainers.map(name => (
                <span key={name} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--status-error)] text-[var(--status-error)]">
                  {name}
                  <button
                    type="button"
                    aria-label={t('btn_remove')}
                    onClick={() => onChange({ ...value, excludedContainers: value.excludedContainers.filter(n => n !== name) })}
                    className="hover:opacity-70"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            {excludableNames.length > 0 && (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) onChange({ ...value, excludedContainers: [...value.excludedContainers, e.target.value] })
                }}
                className="text-xs border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[var(--text-muted)]"
              >
                <option value="">{t('appdata_exclude_add')}</option>
                {excludableNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        </>
      )}

      {/* Backup method */}
      <div className="pt-3 border-t border-[var(--border-default)]">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t('wizard_backup_method')}</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="appdata-method"
              checked={value.method === 'rsync'}
              onChange={() => onChange({ ...value, method: 'rsync' })}
              className="accent-[var(--theme-primary)]"
            />
            Rsync
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="appdata-method"
              checked={value.method === 'tar'}
              onChange={() => onChange({ ...value, method: 'tar' })}
              className="accent-[var(--theme-primary)]"
            />
            Tar
          </label>
        </div>
      </div>

      {/* Database dumps */}
      <label className="flex items-start gap-2 cursor-pointer pt-3 border-t border-[var(--border-default)]">
        <input
          type="checkbox"
          checked={value.useDatabaseDumps}
          onChange={e => onChange({ ...value, useDatabaseDumps: e.target.checked })}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{t('use_database_dumps')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('database_dumps_hint')}</p>
        </div>
      </label>

      {/* Stop containers */}
      <div className="space-y-3 pt-3 border-t border-[var(--border-default)]">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={value.stopContainers}
            onChange={e => onChange({ ...value, stopContainers: e.target.checked })}
            className="accent-[var(--theme-primary)]"
          />
          {t('wizard_stop_containers')}
        </label>

        {value.stopContainers && (
          <>
            {!value.allContainersDynamic && stopOrderItems.length > 0 && (
              <div className="space-y-2 pl-6">
                <p className="text-xs text-[var(--text-muted)]">{t('stop_order_hint')}</p>
                <div className="space-y-1">
                  {stopOrderItems.map((name, i) => (
                    <div key={name} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2">
                      <span className="text-[var(--text-muted)] text-xs w-5 text-center font-mono">{i + 1}</span>
                      <span className="flex-1 font-mono text-xs text-[var(--text-primary)]">{name}</span>
                      <div className="flex gap-1">
                        <button type="button" aria-label={t('btn_move_up')} onClick={() => moveUp(i)} disabled={i === 0}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors">
                          <ArrowUp size={12} />
                        </button>
                        <button type="button" aria-label={t('btn_move_down')} onClick={() => moveDown(i)} disabled={i === stopOrderItems.length - 1}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors">
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] italic">{t('stop_order_note')}</p>
              </div>
            )}

            {value.allContainersDynamic && (
              <div className="space-y-2 pl-6">
                <p className="text-xs font-medium text-[var(--text-secondary)]">{t('appdata_priority_label')}</p>
                <p className="text-xs text-[var(--text-muted)]">{t('appdata_priority_hint')}</p>
                {value.stopOrderPriority.length > 0 && (
                  <div className="space-y-1">
                    {value.stopOrderPriority.map((name, i) => (
                      <div key={name} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2">
                        <span className="text-[var(--text-muted)] text-xs w-5 text-center font-mono">{i + 1}</span>
                        <span className="flex-1 font-mono text-xs text-[var(--text-primary)]">{name}</span>
                        <div className="flex gap-1">
                          <button type="button" aria-label={t('btn_move_up')} onClick={() => movePriorityUp(i)} disabled={i === 0}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors">
                            <ArrowUp size={12} />
                          </button>
                          <button type="button" aria-label={t('btn_move_down')} onClick={() => movePriorityDown(i)} disabled={i === value.stopOrderPriority.length - 1}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors">
                            <ArrowDown size={12} />
                          </button>
                          <button type="button" aria-label={t('btn_remove')}
                            onClick={() => onChange({ ...value, stopOrderPriority: value.stopOrderPriority.filter(n => n !== name) })}
                            className="p-1 text-[var(--status-error)] hover:opacity-75 transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {prioritizableNames.length > 0 && (
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value) onChange({ ...value, stopOrderPriority: [...value.stopOrderPriority, e.target.value] })
                    }}
                    className="text-xs border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[var(--text-muted)]"
                  >
                    <option value="">{t('appdata_priority_add')}</option>
                    {prioritizableNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>
            )}

            <div className="pl-6 space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t('stop_delay_label')}
                </label>
                <input
                  type="number" min={0} max={120} value={value.stopDelay}
                  onChange={e => onChange({ ...value, stopDelay: Math.max(0, Math.min(120, parseInt(e.target.value) || 0)) })}
                  className="w-24 border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{t('stop_delay_hint')}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t('restart_delay_label')}
                </label>
                <input
                  type="number" min={0} max={120} value={value.restartDelay}
                  onChange={e => onChange({ ...value, restartDelay: Math.max(0, Math.min(120, parseInt(e.target.value) || 0)) })}
                  className="w-24 border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">{t('restart_delay_hint')}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <EncryptionToggle
        value={value.useEncryption}
        onChange={useEncryption => onChange({ ...value, useEncryption })}
      />

      <RetentionFields
        days={value.retentionDays}
        minimum={value.retentionMinimum}
        onChange={patch => onChange({
          ...value,
          ...('retentionDays' in patch ? { retentionDays: patch.retentionDays } : {}),
          ...('retentionMinimum' in patch ? { retentionMinimum: patch.retentionMinimum ?? value.retentionMinimum } : {}),
        })}
      />

      <p className="text-[11px] text-[var(--text-muted)] italic">{t('checksums_always_on_note')}</p>

      <label className="flex items-start gap-2 cursor-pointer pt-3 border-t border-[var(--border-default)]">
        <input
          type="checkbox"
          checked={value.stopOnError !== false}
          onChange={e => onChange({ ...value, stopOnError: e.target.checked })}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{t('step_stop_on_error')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('step_stop_on_error_hint')}</p>
        </div>
      </label>
    </div>
  )
}
