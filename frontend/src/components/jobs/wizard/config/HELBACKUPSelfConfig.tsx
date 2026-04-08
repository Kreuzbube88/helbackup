import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import type { Target } from '../../../../api'

export interface HELBACKUPSelfStepConfig {
  targetId: string
  useEncryption: boolean
}

interface Props {
  value: HELBACKUPSelfStepConfig
  onChange: (value: HELBACKUPSelfStepConfig) => void
  targets: Target[]
}

export function HELBACKUPSelfConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')

  const targetOptions = targets.map(t => ({ value: t.id, label: t.name }))

  return (
    <div className="space-y-3">
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value.useEncryption}
          onChange={e => onChange({ ...value, useEncryption: e.target.checked })}
          className="accent-[var(--theme-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">{t('wizard_use_encryption')}</span>
      </label>
    </div>
  )
}
