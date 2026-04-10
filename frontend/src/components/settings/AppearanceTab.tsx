import { useTranslation } from 'react-i18next'
import { Card } from '../common/Card'
import { ThemeSelector } from '../common/ThemeSelector'
import { Select } from '../common/Select'
import { useToast } from '../common/Toast'
import { useUiStore } from '../../store/useUiStore'

const LANG_OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]

interface Props {
  lang: string
  onLangChange: (value: string) => void
}

export function AppearanceTab({ lang, onLangChange }: Props) {
  const { t } = useTranslation('settings')
  const { toast } = useToast()
  const { scanlineEnabled, setScanlineEnabled } = useUiStore()

  function handleLangChange(value: string) {
    onLangChange(value)
    toast(t('language.changed'), 'success')
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
        {t('tabs.appearance')}
      </h2>
      <div className="flex flex-col gap-4">
        <ThemeSelector />
        <Select
          label={t('language.label')}
          options={LANG_OPTIONS}
          value={lang}
          onChange={e => handleLangChange(e.target.value)}
        />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={scanlineEnabled}
            onChange={e => setScanlineEnabled(e.target.checked)}
            className="mt-0.5 accent-[var(--theme-primary)]"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('appearance.scanline_label')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('appearance.scanline_hint')}</p>
          </div>
        </label>
      </div>
    </Card>
  )
}
