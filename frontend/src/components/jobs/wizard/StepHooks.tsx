import { useTranslation } from 'react-i18next'

export interface HooksValue {
  preBackupScript?: string
  postBackupScript?: string
}

interface Props {
  value: HooksValue
  onChange: (value: HooksValue) => void
}

export function StepHooks({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{t('hooks')}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">{t('hooks_hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('pre_backup_script')}</label>
        <input
          type="text"
          value={value.preBackupScript ?? ''}
          onChange={e => onChange({ ...value, preBackupScript: e.target.value || undefined })}
          placeholder="/unraid/user/scripts/pre-backup.sh"
          className="w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('post_backup_script')}</label>
        <input
          type="text"
          value={value.postBackupScript ?? ''}
          onChange={e => onChange({ ...value, postBackupScript: e.target.value || undefined })}
          placeholder="/unraid/user/scripts/post-backup.sh"
          className="w-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 font-mono text-sm"
        />
      </div>
    </div>
  )
}
