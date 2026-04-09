import { useTranslation } from 'react-i18next'
import type { TargetWizardState } from './useTargetWizardState'
import type { StepId } from './useTargetWizardSteps'
import { StepTypeAndName } from './steps/StepTypeAndName'
import { StepLocalPath } from './steps/StepLocalPath'
import { StepNASConnection } from './steps/StepNASConnection'
import { StepNASDestination } from './steps/StepNASDestination'
import { StepNASPower } from './steps/StepNASPower'
import { StepConnectionTest } from './steps/StepConnectionTest'
import { StepReview } from './steps/StepReview'

interface Props {
  stepId: StepId
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
  mode: 'create' | 'edit'
  sshTestResult: boolean | null
  setSshTestResult: (v: boolean | null) => void
  overrideTest: boolean
  setOverrideTest: (v: boolean) => void
  lockType?: boolean
}

export function TargetWizardBody({
  stepId,
  state,
  update,
  mode,
  sshTestResult,
  setSshTestResult,
  overrideTest,
  setOverrideTest,
  lockType,
}: Props) {
  const { t } = useTranslation('targets')
  const passwordPlaceholder = mode === 'edit' ? t('keep_current_hint') : undefined
  const privateKeyPlaceholder = mode === 'edit' ? t('keep_current_hint') : undefined

  switch (stepId) {
    case 'type_name':
      return <StepTypeAndName state={state} update={update} lockType={lockType ?? mode === 'edit'} />
    case 'local_path':
      return <StepLocalPath state={state} update={update} />
    case 'nas_connection':
      return <StepNASConnection state={state} update={update} passwordPlaceholder={passwordPlaceholder} />
    case 'nas_destination':
      return <StepNASDestination state={state} update={update} privateKeyPlaceholder={privateKeyPlaceholder} />
    case 'nas_power':
      return <StepNASPower state={state} update={update} />
    case 'nas_test':
      return (
        <StepConnectionTest
          state={state}
          sshTestResult={sshTestResult}
          setSshTestResult={setSshTestResult}
          overrideTest={overrideTest}
          setOverrideTest={setOverrideTest}
        />
      )
    case 'review':
      return <StepReview state={state} />
  }
}
