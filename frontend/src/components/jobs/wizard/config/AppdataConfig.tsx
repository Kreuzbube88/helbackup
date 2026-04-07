import { useTranslation } from 'react-i18next'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Select } from '../../../common/Select'
import DockerImageSelector from '../../../jobs/DockerImageSelector'
import type { Target } from '../../../../api'

export interface AppdataStepConfig {
  targetId: string
  containers: string[]
  stopContainers: boolean
  stopOrder: string[]
  useDatabaseDumps: boolean
  useEncryption: boolean
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
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />

      <DockerImageSelector
        value={value.containers}
        onChange={handleContainersChange}
      />

      <p className="text-xs text-[var(--text-muted)] italic">{t('appdata_helbackup_excluded')}</p>

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

        {value.stopContainers && stopOrderItems.length > 0 && (
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
      </div>

      <div className="space-y-3 pt-3 border-t border-[var(--border-default)]">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={value.useDatabaseDumps}
            onChange={e => onChange({ ...value, useDatabaseDumps: e.target.checked })}
            className="accent-[var(--theme-primary)]"
          />
          {t('use_database_dumps')}
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={value.useEncryption}
            onChange={e => onChange({ ...value, useEncryption: e.target.checked })}
            className="accent-[var(--theme-primary)]"
          />
          {t('encrypt_backup')}
        </label>
      </div>
    </div>
  )
}
