import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Briefcase,
  HardDrive,
  History,
  RefreshCw,
  Settings,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  labelKey: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',          icon: <LayoutDashboard size={16} />, labelKey: 'nav.dashboard' },
  { to: '/jobs',      icon: <Briefcase size={16} />,       labelKey: 'nav.jobs' },
  { to: '/targets',   icon: <HardDrive size={16} />,       labelKey: 'nav.targets' },
  { to: '/history',   icon: <History size={16} />,         labelKey: 'nav.history' },
  { to: '/recovery',  icon: <RefreshCw size={16} />,       labelKey: 'nav.recovery' },
  { to: '/settings',  icon: <Settings size={16} />,        labelKey: 'nav.settings' },
]

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center justify-center border-b border-[var(--border-default)]">
        <img src="/favicon.png" alt="" className="h-7 w-7" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150',
                isActive
                  ? 'text-[var(--theme-glow)] border-l-4 border-[var(--theme-glow)] bg-[var(--bg-elevated)] pl-[10px] shadow-[inset_4px_0_12px_var(--theme-glow)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border-l-4 border-transparent',
              ].join(' ')
            }
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="px-4 py-3 border-t border-[var(--border-default)]">
        <span className="text-xs font-mono text-[var(--text-muted)]">v0.1.0</span>
      </div>
    </aside>
  )
}
