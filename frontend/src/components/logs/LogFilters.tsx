import { useTranslation } from 'react-i18next'
import { Input } from '../common/Input'

export interface Filters {
  level: string
  category: string
  search: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function LogFilters({ filters, onChange }: Props) {
  const { t } = useTranslation()

  const selectClass =
    'px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm font-mono outline-none focus:border-[var(--theme-glow)]'

  return (
    <div className="flex gap-3 mb-4">
      <select
        value={filters.level}
        onChange={e => onChange({ ...filters, level: e.target.value })}
        className={selectClass}
      >
        <option value="all">{t('logs.all_levels')}</option>
        <option value="error">{t('logs.errors_only')}</option>
        <option value="warn">{t('logs.warnings_only')}</option>
        <option value="info">{t('logs.info_only')}</option>
        <option value="debug">{t('logs.debug_only')}</option>
      </select>

      <select
        value={filters.category}
        onChange={e => onChange({ ...filters, category: e.target.value })}
        className={selectClass}
      >
        <option value="all">{t('logs.all_categories')}</option>
        <option value="system">{t('logs.system')}</option>
        <option value="file">{t('logs.files')}</option>
        <option value="container">{t('logs.containers')}</option>
        <option value="network">{t('logs.network')}</option>
        <option value="verification">{t('logs.verification')}</option>
      </select>

      <div className="flex-1">
        <Input
          placeholder={t('logs.search_placeholder')}
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>
    </div>
  )
}
