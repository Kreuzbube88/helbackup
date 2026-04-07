import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import SystemConfigSelector from '../../../jobs/SystemConfigSelector'
import type { Target } from '../../../../api'

export interface SystemConfigStepConfig {
  targetId: string
  includeItems: string[]
}

interface Props {
  value: SystemConfigStepConfig
  onChange: (value: SystemConfigStepConfig) => void
  targets: Target[]
}

export function SystemConfigForm({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')

  const targetOptions = targets.map(t => ({ value: t.id, label: t.name }))

  return (
    <div className="space-y-4">
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />

      <SystemConfigSelector
        value={value.includeItems}
        onChange={includeItems => onChange({ ...value, includeItems })}
      />

    </div>
  )
}
