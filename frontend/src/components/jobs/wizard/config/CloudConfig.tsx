import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import { Input } from '../../../common/Input'
import type { Target } from '../../../../api'

export interface CloudStepConfig {
  targetId: string
  sourcePath: string
  useEncryption: boolean
}

interface Props {
  value: CloudStepConfig
  onChange: (value: CloudStepConfig) => void
  targets: Target[]
}

export function CloudConfig({ value, onChange, targets }: Props) {
  const { t } = useTranslation('jobs')

  const rcloneTargets = targets.filter(t => t.type === 'rclone')
  const targetOptions = rcloneTargets.map(t => ({ value: t.id, label: t.name }))

  return (
    <div className="space-y-3">
      <Select
        label={t('wizard_rclone_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />
      <Input
        label={t('wizard_source_path')}
        value={value.sourcePath}
        onChange={e => onChange({ ...value, sourcePath: e.target.value })}
        placeholder="/mnt/user/data"
      />
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
