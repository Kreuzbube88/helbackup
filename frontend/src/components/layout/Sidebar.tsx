import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Briefcase,
  HardDrive,
  History,
  RefreshCw,
  Settings,
  Key,
  Bell,
  Info,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  labelKey: string
}

const MAIN_NAV: NavItem[] = [
  { to: '/',         icon: <LayoutDashboard size={16} />, labelKey: 'nav.dashboard' },
  { to: '/jobs',     icon: <Briefcase size={16} />,       labelKey: 'nav.jobs' },
  { to: '/targets',  icon: <HardDrive size={16} />,       labelKey: 'nav.targets' },
  { to: '/history',  icon: <History size={16} />,         labelKey: 'nav.history' },
  { to: '/recovery', icon: <RefreshCw size={16} />,       labelKey: 'nav.recovery' },
]

const SYSTEM_NAV: NavItem[] = [
  { to: '/api-tokens',       icon: <Key size={16} />,      labelKey: 'nav.api_tokens' },
  { to: '/notification-log', icon: <Bell size={16} />,     labelKey: 'nav.notification_log' },
  { to: '/settings',         icon: <Settings size={16} />, labelKey: 'nav.settings' },
  { to: '/about',            icon: <Info size={16} />,     labelKey: 'nav.about' },
]

function NavGroup({ items, t }: { items: NavItem[]; t: (key: string) => string }) {
  return (
    <>
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'group flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 rounded-r-md',
              isActive
                ? 'text-[var(--theme-glow)] border-l-4 border-[var(--theme-glow)] bg-[var(--bg-elevated)] pl-[10px] shadow-[inset_4px_0_12px_var(--theme-glow)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border-l-4 border-transparent rounded-md',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-[var(--theme-primary)]' : 'opacity-60 group-hover:opacity-100 transition-opacity'}>
                {item.icon}
              </span>
              <span>{t(item.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  )
}

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col shrink-0">
      {/* Nav */}
      <nav className="flex-1 pt-5 pb-4 px-2 flex flex-col gap-0.5">
        <NavGroup items={MAIN_NAV} t={t} />

        {/* System section */}
        <div className="mt-4 mb-1 px-3 flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] opacity-60">System</span>
          <div className="flex-1 h-px bg-[var(--border-default)] opacity-40" />
        </div>

        <NavGroup items={SYSTEM_NAV} t={t} />
      </nav>

      {/* Version */}
      <div className="px-4 py-3 border-t border-[var(--border-default)]">
        <span className="text-xs font-mono text-[var(--text-muted)]">v0.1.0</span>
      </div>
    </aside>
  )
}
