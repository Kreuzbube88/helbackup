import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import type { Target } from '../../../../api'

export interface HELBACKUPSelfStepConfig {
  targetId: string
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
  stopOnError?: boolean
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

      <label className="flex items-start gap-2 cursor-pointer pt-3 border-t border-[var(--border-default)]">
        <input
          type="checkbox"
          checked={value.useEncryption}
          onChange={e => onChange({ ...value, useEncryption: e.target.checked })}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{t('encrypt_backup')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('encryption_hint')}</p>
        </div>
      </label>

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
