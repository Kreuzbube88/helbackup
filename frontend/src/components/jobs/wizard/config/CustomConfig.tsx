import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../../common/Input'
import { Select } from '../../../common/Select'
import { EncryptionToggle } from '../shared/EncryptionToggle'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import type { Target } from '../../../../api'

export interface CustomStepConfig {
  sourcePath: string
  targetId: string
  excludePatterns: string[]
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
  stopOnError?: boolean
}

interface Props {
  value: CustomStepConfig
  onChange: (value: CustomStepConfig) => void
  targets: Target[]
}

export function CustomConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')
  const [excludeInput, setExcludeInput] = useState(value.excludePatterns.join(', '))

  const targetOptions = targets.map(tgt => ({ value: tgt.id, label: tgt.name }))

  const handleExcludeChange = (raw: string) => {
    setExcludeInput(raw)
    const patterns = raw.split(',').map(s => s.trim()).filter(Boolean)
    onChange({ ...value, excludePatterns: patterns })
  }

  return (
    <div className="space-y-3">
      {targets.length === 0 && <NoTargetNotice />}
      <Input
        label={t('custom_source_path')}
        value={value.sourcePath}
        onChange={e => onChange({ ...value, sourcePath: e.target.value })}
        placeholder="/unraid/user/data/my-folder"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('custom_source_hint')}</p>
      {!value.sourcePath.trim() && (
        <p className="text-xs text-[var(--status-error)]">{t('validation_needs_source_path')}</p>
      )}

      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />
      {!value.targetId && (
        <p className="text-xs text-[var(--status-error)]">{t('validation_needs_target')}</p>
      )}

      <Input
        label={t('custom_exclude_patterns')}
        value={excludeInput}
        onChange={e => handleExcludeChange(e.target.value)}
        placeholder="*.tmp, *.log, cache/"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('custom_exclude_hint')}</p>

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
