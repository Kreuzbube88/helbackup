import { useTranslation } from 'react-i18next'
import { HardDrive, Server } from 'lucide-react'
import { Input } from '../../../common/Input'
import type { TargetWizardState, TargetType } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
  lockType?: boolean
}

export function StepTypeAndName({ state, update, lockType }: Props) {
  const { t } = useTranslation('targets')

  const cards: { value: TargetType; icon: React.ReactNode; label: string; desc: string }[] = [
    { value: 'local', icon: <HardDrive size={20} />, label: t('type_local'), desc: t('wizard.step_type_local_desc') },
    { value: 'nas',   icon: <Server size={20} />,    label: t('type_nas'),   desc: t('wizard.step_type_nas_desc') },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_type_name_desc')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {cards.map(card => (
          <button
            key={card.value}
            type="button"
            disabled={lockType}
            onClick={() => !lockType && update('type', card.value)}
            className={[
              'flex flex-col gap-2 p-3 border text-left transition-colors',
              state.type === card.value
                ? 'border-[var(--theme-accent)] bg-[var(--bg-elevated)]'
                : 'border-[var(--border-default)] hover:bg-[var(--bg-elevated)]',
              lockType ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span className="text-[var(--theme-accent)]">{card.icon}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{card.label}</span>
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">{card.desc}</span>
          </button>
        ))}
      </div>

      <Input
        label={t('name')}
        value={state.name}
        onChange={e => update('name', e.target.value)}
        autoFocus
        required
      />

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={e => update('enabled', e.target.checked)}
          className="accent-[var(--theme-primary)]"
        />
        {t('enabled')}
      </label>
    </div>
  )
}
