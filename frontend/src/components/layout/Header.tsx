import { useTranslation } from 'react-i18next'
import { LogOut, User } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { ThemeSelector } from '../common/ThemeSelector'

export function Header() {
  const { t } = useTranslation()
  const { user, logout } = useStore()

  return (
    <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center justify-end px-6 shrink-0">
      {/* Right: Theme + User */}
      <div className="flex items-center gap-4">
        <ThemeSelector compact />

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <User size={14} />
          <span className="font-mono">{user?.username}</span>
        </div>

        <button
          onClick={logout}
          title={t('auth.logout', { defaultValue: 'Logout' })}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          {t('auth.logout', { defaultValue: 'Logout' })}
        </button>
      </div>
    </header>
  )
}
