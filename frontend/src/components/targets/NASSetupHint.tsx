import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const SYSTEMS = [
  'synology',
  'qnap',
  'truenas',
  'omv',
  'unraid',
  'linux',
] as const

export function NASSetupHint() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-left"
      >
        {open ? '▾' : '▸'} {t('common:nas.setup_hint_title')}
      </button>
      {open && (
        <div className="mt-2 border border-[var(--border-default)] p-3 space-y-2">
          {SYSTEMS.map(sys => (
            <p key={sys} className="text-xs text-[var(--text-muted)] leading-relaxed">
              {t(`common:nas.setup_hint_${sys}`)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
