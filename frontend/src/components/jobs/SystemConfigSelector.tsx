import { useTranslation } from 'react-i18next'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
}

const ITEMS = ['boot_config', 'network', 'users', 'plugins'] as const

export default function SystemConfigSelector({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  const handleToggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold">{t('select_system_config')}</h3>
      {ITEMS.map((id) => (
        <div key={id} className="flex items-center gap-4">
          <input
            type="checkbox"
            id={id}
            checked={value.includes(id)}
            onChange={() => handleToggle(id)}
            className="w-5 h-5"
          />
          <label htmlFor={id}>{t(id)}</label>
        </div>
      ))}
    </div>
  )
}
