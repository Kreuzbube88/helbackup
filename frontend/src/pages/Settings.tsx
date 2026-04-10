import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppearanceTab } from '../components/settings/AppearanceTab'
import { BackupTab } from '../components/settings/BackupTab'
import { SystemTab } from '../components/settings/SystemTab'
import { NotificationSettings } from '../components/notifications/NotificationSettings'
import { Card } from '../components/common/Card'

type Tab = 'appearance' | 'notifications' | 'backup' | 'system'

export function Settings() {
  const { t, i18n } = useTranslation('settings')
  const [tab, setTab] = useState<Tab>('appearance')
  const [lang, setLang] = useState(i18n.language.startsWith('de') ? 'de' : 'en')

  function handleLangChange(value: string) {
    setLang(value)
    void i18n.changeLanguage(value)
    localStorage.setItem('helbackup_lang', value)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'appearance', label: t('tabs.appearance') },
    { id: 'notifications', label: t('tabs.notifications') },
    { id: 'backup', label: t('tabs.backup') },
    { id: 'system', label: t('tabs.system') },
  ]

  return (
    <div className="flex-1 p-6 overflow-auto relative">
      {/* Background watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6 relative">
        {t('title')}
      </h1>

      {/* Tab bar */}
      <div className="relative flex border-b border-[var(--border-default)] mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-b-2 border-[var(--theme-primary)] text-[var(--text-primary)] -mb-px'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative flex flex-col gap-4">
        {tab === 'appearance' && (
          <AppearanceTab lang={lang} onLangChange={handleLangChange} />
        )}

        {tab === 'notifications' && (
          <Card>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-6 uppercase tracking-wider">
              {t('tabs.notifications')}
            </h2>
            <NotificationSettings />
          </Card>
        )}

        {tab === 'backup' && <BackupTab />}

        {tab === 'system' && <SystemTab />}
      </div>
    </div>
  )
}
