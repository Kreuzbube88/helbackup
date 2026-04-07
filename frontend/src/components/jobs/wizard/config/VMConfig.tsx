import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import VMSelector from '../../../jobs/VMSelector'
import type { Target } from '../../../../api'

export interface VMStepConfig {
  targetId: string
  vms: string[]
  includeDisks: boolean
}

interface Props {
  value: VMStepConfig
  onChange: (value: VMStepConfig) => void
  targets: Target[]
}

export function VMConfig({ value, onChange, targets }: Props) {
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

      <VMSelector
        value={value.vms}
        includeDisks={value.includeDisks}
        onChange={vms => onChange({ ...value, vms })}
        onIncludeDisksChange={includeDisks => onChange({ ...value, includeDisks })}
      />

    </div>
  )
}
