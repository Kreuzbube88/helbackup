import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import VMSelector from '../../../jobs/VMSelector'
import { EncryptionToggle } from '../shared/EncryptionToggle'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import type { Target } from '../../../../api'

export interface VMStepConfig {
  targetId: string
  vms: string[]
  includeDisks: boolean
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
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

      <VMSelector
        value={value.vms}
        includeDisks={value.includeDisks}
        onChange={vms => onChange({ ...value, vms })}
        onIncludeDisksChange={includeDisks => onChange({ ...value, includeDisks })}
      />
      {value.vms.length === 0 && (
        <p className="text-xs text-[var(--status-error)]">{t('validation_needs_vms')}</p>
      )}

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
