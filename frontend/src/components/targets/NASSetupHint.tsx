import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const SYSTEMS = ['synology', 'qnap', 'truenas', 'omv', 'unraid', 'linux'] as const
type NasSystem = typeof SYSTEMS[number]

const PERSISTENCE_WARNING = new Set<NasSystem>(['unraid', 'qnap'])

interface Props {
  nasType?: string
}

export function NASSetupHint({ nasType }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const selected = SYSTEMS.includes(nasType as NasSystem) ? nasType as NasSystem : undefined
  const showWarning = selected && PERSISTENCE_WARNING.has(selected)

  return (
    <div className="space-y-2">
      {selected && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {t(`common:nas.setup_hint_${selected}`)}
        </p>
      )}
      {showWarning && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-400 leading-relaxed">
          {t(`common:nas.warning_${selected}`)}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-left"
      >
        {open ? '▾' : '▸'} {t('common:nas.setup_hint_title')}
      </button>
      {open && (
        <div className="mt-1 border border-[var(--border-default)] p-3 space-y-2">
          {SYSTEMS.map(sys => (
            <p
              key={sys}
              className={`text-xs leading-relaxed ${selected === sys ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}
            >
              {t(`common:nas.setup_hint_${sys}`)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
