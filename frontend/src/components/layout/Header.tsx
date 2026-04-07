import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, User } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { ThemeSelector } from '../common/ThemeSelector'
import { ConfirmModal } from '../common/ConfirmModal'

export function Header() {
  const { t } = useTranslation('auth')
  const { user, logout } = useStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  return (
    <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
      {/* Left: Logo aligned with sidebar */}
      <div className="w-56 flex items-center justify-center shrink-0">
        <img src="/favicon.png" alt="" className="h-7 w-7" />
      </div>

      {/* Right: Theme + User */}
      <div className="flex items-center gap-4 px-6">
        <ThemeSelector compact />

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <User size={14} />
          <span className="font-mono">{user?.username}</span>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          title={t('logout')}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          {t('logout')}
        </button>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        onConfirm={logout}
        onCancel={() => setShowLogoutConfirm(false)}
        title={t('confirm_logout')}
        message={t('confirm_logout_message')}
        variant="warning"
      />
    </header>
  )
}
