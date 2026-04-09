import { useTranslation } from 'react-i18next'

interface Props {
  days: number | undefined
  minimum: number
  onChange: (patch: { retentionDays?: number; retentionMinimum?: number }) => void
}

export function RetentionFields({ days, minimum, onChange }: Props) {
  const { t } = useTranslation('jobs')
  const enabled = typeof days === 'number' && days > 0

  return (
    <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange({ retentionDays: e.target.checked ? 30 : undefined })}
          className="accent-[var(--theme-primary)]"
        />
        <span className="text-sm font-medium text-[var(--text-primary)]">{t('retention_enable')}</span>
      </label>

      {enabled ? (
        <div className="pl-6 flex items-center gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('retention_days_label')}</label>
            <input
              type="number"
              min={1}
              value={days ?? 30}
              onChange={e => onChange({ retentionDays: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-24 border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">{t('retention_minimum_label')}</label>
            <input
              type="number"
              min={1}
              value={minimum}
              onChange={e => onChange({ retentionMinimum: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-24 border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm"
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] pl-6">{t('retention_none')}</p>
      )}
    </div>
  )
}
