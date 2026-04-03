import { useTranslation } from 'react-i18next'

interface Props {
  value: string[]
  includeDisks: boolean
  onChange: (value: string[]) => void
  onIncludeDisksChange: (value: boolean) => void
}

export default function VMSelector({ value, includeDisks, onChange, onIncludeDisksChange }: Props) {
  const { t } = useTranslation('jobs')

  return (
    <div className="space-y-4">
      <h3 className="font-bold">{t('select_vms')}</h3>
      <p className="text-sm opacity-70">{t('vm_backup_note')}</p>
      <input
        type="text"
        placeholder={t('vm_names_placeholder')}
        value={value.join(', ')}
        className="w-full px-4 py-2 border-2 border-[var(--border-default)]"
        onChange={(e) => {
          const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
          onChange(names)
        }}
      />
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          id="include-vm-disks"
          checked={includeDisks}
          onChange={(e) => onIncludeDisksChange(e.target.checked)}
          className="w-5 h-5"
        />
        <label htmlFor="include-vm-disks">{t('include_vm_disks')}</label>
      </div>
    </div>
  )
}
