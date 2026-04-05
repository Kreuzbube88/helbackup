import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select } from '../../../common/Select'
import { api } from '../../../../api'
import type { DockerImage, Target } from '../../../../api'

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
  const [available, setAvailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.docker.listImages()
      .then((imgs: DockerImage[]) => {
        const tags = imgs
          .flatMap(img => img.RepoTags ?? [])
          .filter(tag => tag !== '<none>:<none>')
          .sort((a, b) => a.localeCompare(b))
        setAvailable(tags)
      })
      .catch(() => setError(t('fetch_error_images')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (tag: string) => {
    if (value.images.includes(tag)) {
      onChange({ ...value, images: value.images.filter(i => i !== tag) })
    } else {
      onChange({ ...value, images: [...value.images, tag] })
    }
  }

  const targetOptions = targets.map(t => ({ value: t.id, label: t.name }))

  return (
    <div className="space-y-4">
      <Select
        label={t('wizard_target')}
        options={[{ value: '', label: t('wizard_select_target') }, ...targetOptions]}
        value={value.targetId}
        onChange={e => onChange({ ...value, targetId: e.target.value })}
      />

      <div className="space-y-2">
        <h3 className="font-bold text-sm">{t('select_docker_images')}</h3>

        {loading && (
          <p className="text-sm text-[var(--text-muted)]">{t('loading_images')}</p>
        )}

        {error && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[var(--status-error)]">{error}</p>
            <button
              type="button"
              onClick={load}
              className="text-xs text-[var(--theme-primary)] underline"
            >
              {t('common:buttons.retry')}
            </button>
          </div>
        )}

        {!loading && !error && available.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">{t('no_images_found')}</p>
        )}

        {!loading && !error && available.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto border border-[var(--border-default)] p-2">
            {available.map(tag => (
              <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)] px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={value.images.includes(tag)}
                  onChange={() => toggle(tag)}
                  className="accent-[var(--theme-primary)]"
                />
                <span className="text-[var(--text-primary)]">{tag}</span>
              </label>
            ))}
          </div>
        )}
      </div>

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
