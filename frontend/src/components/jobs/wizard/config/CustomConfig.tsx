import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../../common/Input'
import { Select } from '../../../common/Select'
import type { Target } from '../../../../api'

export interface CustomStepConfig {
  sourcePath: string
  targetId: string
  excludePatterns: string[]
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
      <Input
        label={t('custom_source_path')}
        value={value.sourcePath}
        onChange={e => onChange({ ...value, sourcePath: e.target.value })}
        placeholder="/unraid/user/data/my-folder"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('custom_source_hint')}</p>

      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />

      <Input
        label={t('custom_exclude_patterns')}
        value={excludeInput}
        onChange={e => handleExcludeChange(e.target.value)}
        placeholder="*.tmp, *.log, cache/"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('custom_exclude_hint')}</p>
    </div>
  )
}
