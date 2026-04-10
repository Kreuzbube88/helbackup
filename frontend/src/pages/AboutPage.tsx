import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Github, Package, BookOpen, Coffee } from 'lucide-react'
import { Card } from '../components/common/Card'
import { api } from '../api'
const GITHUB_URL = 'https://github.com/Kreuzbube88/helbackup'
const REGISTRY_URL = 'https://github.com/Kreuzbube88/helbackup/pkgs/container/helbackup'
const CHANGELOG_URL = 'https://github.com/Kreuzbube88/helbackup/releases/latest'
const DONATE_URL = 'https://paypal.me/kreuzbube88'

interface StackRow {
  labelKey: string
  valueKey: string
}

const STACK_ROWS: StackRow[] = [
  { labelKey: 'stack.runtime',   valueKey: 'stack.runtime_value' },
  { labelKey: 'stack.frontend',  valueKey: 'stack.frontend_value' },
  { labelKey: 'stack.backend',   valueKey: 'stack.backend_value' },
  { labelKey: 'stack.auth',      valueKey: 'stack.auth_value' },
  { labelKey: 'stack.backup',    valueKey: 'stack.backup_value' },
  { labelKey: 'stack.container', valueKey: 'stack.container_value' },
]

const LINK_ITEMS = [
  { href: GITHUB_URL,    icon: <Github size={14} />,    labelKey: 'links.github' },
  { href: REGISTRY_URL,  icon: <Package size={14} />,   labelKey: 'links.registry' },
  { href: CHANGELOG_URL, icon: <BookOpen size={14} />,  labelKey: 'links.changelog' },
  { href: DONATE_URL,    icon: <Coffee size={14} />,    labelKey: 'links.donate' },
]

export function AboutPage() {
  const { t } = useTranslation('about')
  const [version, setVersion] = useState('...')

  useEffect(() => {
    api.status.getHealth().then(h => setVersion(h.version)).catch(() => setVersion('?'))
  }, [])

  return (
    <div className="flex-1 p-6 overflow-auto relative">
      {/* Background watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6 max-w-xl mx-auto">

        {/* Logo + version */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="relative">
            {/* glow ring behind logo */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 60px var(--theme-glow), 0 0 120px rgba(6,182,212,0.15)' }}
            />
            <img
              src="/logo.png"
              alt="HELBACKUP"
              className="relative w-[340px] h-[340px] object-contain"
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs px-2 py-0.5 border border-[var(--theme-accent)] text-[var(--theme-accent)] tracking-widest"
              style={{ boxShadow: '0 0 8px var(--theme-glow)' }}
            >
              v{version}
            </span>
          </div>

          <p className="text-sm text-[var(--text-muted)] text-center tracking-wide">
            {t('tagline')}
          </p>
        </div>

        {/* About */}
        <Card className="w-full corner-cuts">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 text-center">
            {t('title')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
            {t('description')}
          </p>
        </Card>

        {/* Stack */}
        <Card className="w-full corner-cuts">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            {t('section_stack')}
          </h2>
          <div className="flex flex-col divide-y divide-[var(--border-default)]">
            {STACK_ROWS.map(row => (
              <div key={row.labelKey} className="flex items-center justify-between py-2 gap-4">
                <span className="text-xs text-[var(--text-muted)] shrink-0">{t(row.labelKey)}</span>
                <span className="text-xs font-mono text-[var(--theme-accent)] text-right">{t(row.valueKey)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Deployment */}
        <Card className="w-full corner-cuts">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            {t('section_deploy')}
          </h2>
          <div className="flex flex-col divide-y divide-[var(--border-default)]">
            <div className="flex items-center justify-between py-2 gap-4">
              <span className="text-xs text-[var(--text-muted)] shrink-0">{t('deploy.registry')}</span>
              <span className="text-xs font-mono text-[var(--theme-accent)] text-right">ghcr.io/kreuzbube88/helbackup</span>
            </div>
            <div className="flex items-center justify-between py-2 gap-4">
              <span className="text-xs text-[var(--text-muted)] shrink-0">{t('deploy.build')}</span>
              <span className="text-xs font-mono text-[var(--theme-accent)] text-right">GitHub Actions</span>
            </div>
          </div>
        </Card>

        {/* Links */}
        <Card className="w-full corner-cuts">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            {t('section_links')}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {LINK_ITEMS.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 text-xs font-medium',
                  'border border-[var(--border-default)] text-[var(--text-primary)]',
                  'hover:border-[var(--theme-primary)] hover:shadow-md hover:-translate-y-0.5',
                  'transition-all duration-150',
                ].join(' ')}
              >
                <span className="text-[var(--theme-accent)]">{link.icon}</span>
                {t(link.labelKey)}
              </a>
            ))}
          </div>
        </Card>

      </div>
    </div>
  )
}
