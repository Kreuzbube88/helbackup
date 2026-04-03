import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Palette } from 'lucide-react'

type Theme = 'blue' | 'purple' | 'green' | 'orange'

const THEMES: { id: Theme; label: string; color: string; glow: string }[] = [
  { id: 'blue',   label: 'Cyber Blue',    color: '#0EA5E9', glow: '#06B6D4' },
  { id: 'purple', label: 'Neon Purple',   color: '#7C3AED', glow: '#D946EF' },
  { id: 'green',  label: 'Matrix Green',  color: '#10B981', glow: '#059669' },
  { id: 'orange', label: 'Fire Orange',   color: '#F97316', glow: '#F59E0B' },
]

const STORAGE_KEY = 'helbackup_theme'

function applyTheme(theme: Theme): void {
  if (theme === 'blue') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'blue'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
  }

  return { theme, setTheme }
}

interface ThemeSelectorProps {
  compact?: boolean
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { t } = useTranslation('settings')
  const { theme, setTheme } = useTheme()

  if (compact) {
    return (
      <div className="flex gap-2 items-center">
        <Palette size={14} className="text-[var(--text-muted)]" />
        {THEMES.map(th => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            title={th.label}
            className="w-5 h-5 rounded-full border-2 transition-all"
            style={{
              backgroundColor: th.color,
              borderColor: theme === th.id ? th.glow : 'transparent',
              boxShadow: theme === th.id ? `0 0 8px ${th.glow}` : 'none',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-[var(--text-secondary)]">
        {t('theme.label', { defaultValue: 'Theme' })}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map(th => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            className={[
              'flex items-center gap-3 px-3 py-2 border transition-all text-sm',
              theme === th.id
                ? 'border-[var(--border-glow)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--theme-primary)]',
            ].join(' ')}
            style={theme === th.id ? { boxShadow: `0 0 8px ${th.glow}` } : undefined}
          >
            <span
              className="w-4 h-4 shrink-0 rounded-full"
              style={{ backgroundColor: th.color, boxShadow: `0 0 6px ${th.glow}` }}
            />
            {th.label}
          </button>
        ))}
      </div>
    </div>
  )
}
