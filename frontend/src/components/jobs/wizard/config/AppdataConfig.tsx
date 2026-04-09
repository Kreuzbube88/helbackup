import { useTranslation } from 'react-i18next'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Select } from '../../../common/Select'
import DockerImageSelector from '../../../jobs/DockerImageSelector'
import { EncryptionToggle } from '../shared/EncryptionToggle'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import type { Target } from '../../../../api'

export interface AppdataStepConfig {
  targetId: string
  containers: string[]
  stopContainers: boolean
  stopOrder: string[]
  stopDelay: number
  restartDelay: number
  method: 'tar' | 'rsync'
  useDatabaseDumps: boolean
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
}

interface Props {
  value: AppdataStepConfig
  onChange: (value: AppdataStepConfig) => void
  targets: Target[]
}

export function AppdataConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')

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

  const stopOrderItems = value.stopOrder.filter(id => value.containers.includes(id))

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

      <DockerImageSelector
        value={value.containers}
        onChange={handleContainersChange}
      />
      {value.containers.length === 0 && (
        <p className="text-xs text-[var(--status-error)]">{t('validation_needs_containers')}</p>
      )}

      <p className="text-xs text-[var(--text-muted)] italic">{t('appdata_helbackup_excluded')}</p>

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
            {stopOrderItems.length > 0 && (
              <div className="space-y-2 pl-6">
                <p className="text-xs text-[var(--text-muted)]">{t('stop_order_hint')}</p>
                <div className="space-y-1">
                  {stopOrderItems.map((name, i) => (
                    <div key={name} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2">
                      <span className="text-[var(--text-muted)] text-xs w-5 text-center font-mono">{i + 1}</span>
                      <span className="flex-1 font-mono text-xs text-[var(--text-primary)]">{name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveUp(i)}
                          disabled={i === 0}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(i)}
                          disabled={i === stopOrderItems.length - 1}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 transition-colors"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] italic">{t('stop_order_note')}</p>
              </div>
            )}

            <div className="pl-6 space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t('stop_delay_label')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={value.stopDelay}
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
                  type="number"
                  min={0}
                  max={120}
                  value={value.restartDelay}
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
    </div>
  )
}
