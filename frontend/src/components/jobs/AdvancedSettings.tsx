import { useTranslation } from 'react-i18next'

export interface AdvancedSettingsValue {
  useDatabaseDumps: boolean
  verifyChecksums: boolean
  retentionDays?: number
  retentionMinimum: number
  preBackupScript?: string
  postBackupScript?: string
}

interface Props {
  value: AdvancedSettingsValue
  onChange: (value: AdvancedSettingsValue) => void
}

export default function AdvancedSettings({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">{t('advanced_settings')}</h3>

      {/* Database Dumps */}
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          id="useDatabaseDumps"
          checked={value.useDatabaseDumps}
          onChange={(e) => onChange({ ...value, useDatabaseDumps: e.target.checked })}
          className="w-5 h-5 mt-0.5 flex-shrink-0"
        />
        <div>
          <label htmlFor="useDatabaseDumps" className="font-bold cursor-pointer">
            {t('use_database_dumps')}
          </label>
          <p className="text-sm opacity-70">{t('database_dumps_hint')}</p>
        </div>
      </div>

      {/* Checksum Verification */}
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          id="verifyChecksums"
          checked={value.verifyChecksums}
          onChange={(e) => onChange({ ...value, verifyChecksums: e.target.checked })}
          className="w-5 h-5 mt-0.5 flex-shrink-0"
        />
        <div>
          <label htmlFor="verifyChecksums" className="font-bold cursor-pointer">
            {t('verify_checksums')}
          </label>
          <p className="text-sm opacity-70">{t('checksums_hint')}</p>
        </div>
      </div>

      {/* Retention Policy */}
      <div className="border-2 border-[var(--border-default)] p-4 space-y-4">
        <h4 className="font-bold">{t('retention_policy')}</h4>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('delete_older_than_days')}
          </label>
          <input
            type="number"
            min={1}
            value={value.retentionDays ?? ''}
            onChange={(e) => onChange({
              ...value,
              retentionDays: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            placeholder="30"
            className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('keep_minimum')}
          </label>
          <input
            type="number"
            min={1}
            value={value.retentionMinimum}
            onChange={(e) => onChange({
              ...value,
              retentionMinimum: parseInt(e.target.value) || 3,
            })}
            className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2"
          />
        </div>
      </div>

      {/* Hooks */}
      <div className="border-2 border-[var(--border-default)] p-4 space-y-4">
        <h4 className="font-bold">{t('hooks')}</h4>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('pre_backup_script')}
          </label>
          <input
            type="text"
            value={value.preBackupScript ?? ''}
            onChange={(e) => onChange({ ...value, preBackupScript: e.target.value || undefined })}
            placeholder="/mnt/user/scripts/pre-backup.sh"
            className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('post_backup_script')}
          </label>
          <input
            type="text"
            value={value.postBackupScript ?? ''}
            onChange={(e) => onChange({ ...value, postBackupScript: e.target.value || undefined })}
            placeholder="/mnt/user/scripts/post-backup.sh"
            className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  )
}
