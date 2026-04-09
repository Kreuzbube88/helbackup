import { useTranslation } from 'react-i18next'
import { NASTargetForm } from '../../NASTargetForm'
import type { TargetWizardState } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
}

export function StepNASPower({ state, update }: Props) {
  const { t } = useTranslation('targets')

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_nas_power_desc')}</p>
      <div className="border border-[var(--border-default)] p-3">
        <NASTargetForm
          value={state.nasPower}
          onChange={(v) => update('nasPower', v)}
          sshHost={state.nasHost}
          sshUsername={state.nasUser}
          sshPassword={state.nasPass}
          sshPrivateKey={state.nasPrivateKey}
        />
      </div>
    </div>
  )
}
