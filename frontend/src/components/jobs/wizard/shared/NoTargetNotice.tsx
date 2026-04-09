import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export function NoTargetNotice() {
  const { t } = useTranslation('jobs')
  return (
    <Link
      to="/targets"
      className="flex items-center gap-2 p-3 border border-[var(--status-warning)] bg-[var(--status-warning)]/10 text-sm text-[var(--text-primary)] hover:bg-[var(--status-warning)]/20 transition-colors"
    >
      <AlertTriangle size={14} className="text-[var(--status-warning)] flex-shrink-0" />
      <span>{t('no_targets_create_cta')}</span>
    </Link>
  )
}
