import { useTranslation } from 'react-i18next'
import { Input } from '../../../common/Input'
import { HelpText } from '../../../common/HelpText'
import type { TargetWizardState } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
}

export function StepLocalPath({ state, update }: Props) {
  const { t } = useTranslation('targets')
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_local_path_desc')}</p>
      <Input
        label={t('path')}
        value={state.localPath}
        onChange={e => update('localPath', e.target.value)}
        required
        autoFocus
      />
      <HelpText text={t('wizard.step_local_path_hint')} />
    </div>
  )
}
