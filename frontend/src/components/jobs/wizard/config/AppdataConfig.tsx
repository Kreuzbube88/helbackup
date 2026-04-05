import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import DockerImageSelector from '../../../jobs/DockerImageSelector'
import type { Target } from '../../../../api'

export interface AppdataStepConfig {
  targetId: string
  containers: string[]
  stopContainers: boolean
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

  return (
    <div className="space-y-4">
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />

      <DockerImageSelector
        value={value.containers}
        onChange={containers => onChange({ ...value, containers })}
      />

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
        <input
          type="checkbox"
          checked={value.stopContainers}
          onChange={e => onChange({ ...value, stopContainers: e.target.checked })}
          className="accent-[var(--theme-primary)]"
        />
        {t('wizard_stop_containers')}
      </label>

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
  )
}
