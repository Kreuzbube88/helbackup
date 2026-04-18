import type { BasicInfo } from './StepBasicInfo'
import type { BackupStepsConfig, StepType } from './StepBackupTypes'
import type { FlashStepConfig } from './config/FlashConfig'
import type { AppdataStepConfig } from './config/AppdataConfig'
import type { VMStepConfig } from './config/VMConfig'
import type { DockerImagesStepConfig } from './config/DockerImagesConfig'
import type { SystemConfigStepConfig } from './config/SystemConfigForm'
import type { CustomStepConfig } from './config/CustomConfig'
import type { HELBACKUPSelfStepConfig } from './config/HELBACKUPSelfConfig'

export type StepId =
  | { kind: 'basic' }
  | { kind: 'types' }
  | { kind: 'type'; type: StepType }
  | { kind: 'hooks' }
  | { kind: 'review' }

export interface WizardState {
  basicInfo: BasicInfo
  backupSteps: BackupStepsConfig
}

export function isBasicValid(b: BasicInfo): boolean {
  return b.name.trim() !== ''
}

export function isTypesValid(s: BackupStepsConfig): boolean {
  return Object.values(s).some(v => v !== null)
}

export function isTypeConfigValid(type: StepType, cfg: unknown): boolean {
  if (!cfg || typeof cfg !== 'object') return false
  switch (type) {
    case 'flash': {
      const c = cfg as FlashStepConfig
      return c.targetId !== ''
    }
    case 'appdata': {
      const c = cfg as AppdataStepConfig
      return c.targetId !== '' && (c.allContainersDynamic === true || c.containers.length > 0)
    }
    case 'vms': {
      const c = cfg as VMStepConfig
      return c.targetId !== '' && c.vms.length > 0
    }
    case 'docker_images': {
      const c = cfg as DockerImagesStepConfig
      return c.targetId !== '' && c.images.length > 0
    }
    case 'system_config': {
      const c = cfg as SystemConfigStepConfig
      return c.targetId !== '' && c.includeItems.length > 0
    }
    case 'custom': {
      const c = cfg as CustomStepConfig
      return c.targetId !== '' && c.sourcePath.trim() !== ''
    }
    case 'helbackup_self': {
      const c = cfg as HELBACKUPSelfStepConfig
      return c.targetId !== ''
    }
  }
}

export function isStepValid(step: StepId, state: WizardState): boolean {
  switch (step.kind) {
    case 'basic':
      return isBasicValid(state.basicInfo)
    case 'types':
      return isTypesValid(state.backupSteps)
    case 'type': {
      const cfg = state.backupSteps[step.type]
      if (cfg === null) return true
      return isTypeConfigValid(step.type, cfg)
    }
    case 'hooks':
      return true
    case 'review':
      return isBasicValid(state.basicInfo)
        && isTypesValid(state.backupSteps)
        && (Object.entries(state.backupSteps) as Array<[StepType, unknown]>)
          .filter(([, cfg]) => cfg !== null)
          .every(([type, cfg]) => isTypeConfigValid(type, cfg))
  }
}
