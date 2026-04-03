import { useTranslation } from 'react-i18next'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
}

export default function DockerImageSelector({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  return (
    <div className="space-y-4">
      <h3 className="font-bold">{t('select_docker_images')}</h3>
      <p className="text-sm opacity-70">{t('docker_image_note')}</p>
      <input
        type="text"
        placeholder={t('image_names_placeholder')}
        value={value.join(', ')}
        className="w-full px-4 py-2 border-2 border-[var(--border-default)]"
        onChange={(e) => {
          const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
          onChange(names)
        }}
      />
    </div>
  )
}
