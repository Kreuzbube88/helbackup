import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import { FileBrowser } from '../../../common/FileBrowser'
import { EncryptionToggle } from '../shared/EncryptionToggle'
import { RetentionFields } from '../shared/RetentionFields'
import { NoTargetNotice } from '../shared/NoTargetNotice'
import type { Target } from '../../../../api'

export interface FlashStepConfig {
  targetId: string
  source?: string
  useEncryption: boolean
  retentionDays?: number
  retentionMinimum: number
  stopOnError?: boolean
}

interface Props {
  value: FlashStepConfig
  onChange: (value: FlashStepConfig) => void
  targets: Target[]
}

export function FlashConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')
  const [browserOpen, setBrowserOpen] = useState(false)

  const targetOptions = targets.map(tgt => ({ value: tgt.id, label: tgt.name }))

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

      {/* Source path */}
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t('flash_source_path')}</p>
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2 text-[var(--text-secondary)] truncate">
            {value.source ?? '/unraid/boot'}
          </span>
          <button
            type="button"
            onClick={() => setBrowserOpen(true)}
            className="px-3 py-2 text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--theme-primary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('browse')}
          </button>
        </div>
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

      <FileBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={path => onChange({ ...value, source: path })}
        initialPath={value.source ?? '/unraid/boot'}
        title={t('flash_source_path')}
      />
    </div>
  )
}
