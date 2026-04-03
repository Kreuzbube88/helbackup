import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'

export interface ToolSelection {
  flash: 'rsync'
  appdata: 'tar' | 'rsync'
  vms: 'rsync'
  cloud: 'rclone'
}

interface Props {
  value: ToolSelection
  onChange: (value: ToolSelection) => void
}

export default function ToolSelector({ value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="border-2 border-[var(--border-default)] rounded-none p-6">
        <h3 className="text-lg font-bold mb-4">{t('tools.flash_backup')}</h3>
        <div className="flex items-center gap-4">
          <Button variant="primary" disabled>Rsync</Button>
          <p className="text-sm opacity-70">{t('tools.flash_description')}</p>
        </div>
      </div>

      <div className="border-2 border-[var(--border-default)] rounded-none p-6">
        <h3 className="text-lg font-bold mb-4">{t('tools.appdata_backup')}</h3>
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant={value.appdata === 'tar' ? 'primary' : 'secondary'}
            onClick={() => onChange({ ...value, appdata: 'tar' })}
          >
            Tar
          </Button>
          <Button
            variant={value.appdata === 'rsync' ? 'primary' : 'secondary'}
            onClick={() => onChange({ ...value, appdata: 'rsync' })}
          >
            Rsync
          </Button>
        </div>
        <p className="text-sm opacity-70">
          {value.appdata === 'tar' ? t('tools.tar_description') : t('tools.rsync_description')}
        </p>
      </div>

      <div className="border-2 border-[var(--border-default)] rounded-none p-6">
        <h3 className="text-lg font-bold mb-4">{t('tools.vm_backup')}</h3>
        <div className="flex items-center gap-4">
          <Button variant="primary" disabled>Rsync</Button>
          <p className="text-sm opacity-70">{t('tools.vm_description')}</p>
        </div>
      </div>

      <div className="border-2 border-[var(--border-default)] rounded-none p-6">
        <h3 className="text-lg font-bold mb-4">{t('tools.cloud_backup')}</h3>
        <div className="flex items-center gap-4">
          <Button variant="primary" disabled>Rclone</Button>
          <p className="text-sm opacity-70">{t('tools.cloud_description')}</p>
        </div>
      </div>
    </div>
  )
}
