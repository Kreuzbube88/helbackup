import type { TargetWizardState } from './useTargetWizardState'

export type StepId =
  | 'type_name'
  | 'local_path'
  | 'nas_connection'
  | 'nas_destination'
  | 'nas_power'
  | 'nas_test'
  | 'review'

export interface WizardStep {
  id: StepId
  labelKey: string
  canProceed: (state: TargetWizardState, ctx: StepContext) => boolean
}

export interface StepContext {
  /** result of the SSH test on the test step (true=ok, false=fail, null=not run) */
  sshTestResult: boolean | null
  /** user override for failed test */
  overrideTest: boolean
}

const STEP_TYPE_NAME: WizardStep = {
  id: 'type_name',
  labelKey: 'wizard.step_type_name',
  canProceed: (s) => s.name.trim() !== '',
}

const STEP_LOCAL_PATH: WizardStep = {
  id: 'local_path',
  labelKey: 'wizard.step_local_path',
  canProceed: (s) => s.localPath.trim() !== '',
}

const STEP_NAS_CONNECTION: WizardStep = {
  id: 'nas_connection',
  labelKey: 'wizard.step_nas_connection',
  canProceed: (s) => s.nasHost.trim() !== '' && s.nasUser.trim() !== '',
}

const STEP_NAS_DESTINATION: WizardStep = {
  id: 'nas_destination',
  labelKey: 'wizard.step_nas_destination',
  canProceed: (s) => s.nasPath.trim() !== '',
}

const STEP_NAS_POWER: WizardStep = {
  id: 'nas_power',
  labelKey: 'wizard.step_nas_power',
  canProceed: (s) => !s.nasPower.enabled || s.nasPower.mac.trim() !== '',
}

const STEP_NAS_TEST: WizardStep = {
  id: 'nas_test',
  labelKey: 'wizard.step_test',
  canProceed: (_s, ctx) => ctx.sshTestResult === true || ctx.overrideTest,
}

const STEP_REVIEW: WizardStep = {
  id: 'review',
  labelKey: 'wizard.step_review',
  canProceed: () => true,
}

export function useTargetWizardSteps(type: TargetWizardState['type']): WizardStep[] {
  if (type === 'local') {
    return [STEP_TYPE_NAME, STEP_LOCAL_PATH, STEP_REVIEW]
  }
  return [
    STEP_TYPE_NAME,
    STEP_NAS_CONNECTION,
    STEP_NAS_DESTINATION,
    STEP_NAS_POWER,
    STEP_NAS_TEST,
    STEP_REVIEW,
  ]
}
