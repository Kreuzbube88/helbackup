import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import DockerImageSelector from '../../../jobs/DockerImageSelector'
import type { Target } from '../../../../api'

export interface DockerImagesStepConfig {
  targetId: string
  images: string[]
  useEncryption: boolean
}

interface Props {
  value: DockerImagesStepConfig
  onChange: (value: DockerImagesStepConfig) => void
  targets: Target[]
}

export function DockerImagesConfig({ value, onChange, targets }: Props) {
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

      <DockerImageSelector
        value={value.images}
        onChange={images => onChange({ ...value, images })}
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
