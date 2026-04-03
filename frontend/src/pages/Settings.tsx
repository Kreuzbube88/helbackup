import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/common/Card'
import { ThemeSelector } from '../components/common/ThemeSelector'
import { Select } from '../components/common/Select'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

const LANG_OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]

export function Settings() {
  const { t, i18n } = useTranslation('settings')
  const { toast } = useToast()
  const [lang, setLang] = useState(i18n.language.startsWith('de') ? 'de' : 'en')

  function handleLangChange(value: string) {
    setLang(value)
    void i18n.changeLanguage(value)
    localStorage.setItem('helbackup_lang', value)
    toast(t('language.label', { ns: 'settings' }) + ' geändert', 'success')
  }

  return (
    <div className="flex-1 p-6 overflow-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        {t('title')}
      </h1>

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
            {t('general.title')}
          </h2>
          <div className="flex flex-col gap-4">
            <ThemeSelector />
            <Select
              label={t('language.label')}
              options={LANG_OPTIONS}
              value={lang}
              onChange={e => handleLangChange(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
            {t('account.title')}
          </h2>
          <Button variant="secondary" size="sm">
            {t('account.change_password')}
          </Button>
        </Card>
      </div>
    </div>
  )
}
