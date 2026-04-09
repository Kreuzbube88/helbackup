import { useTranslation } from 'react-i18next'
import { HardDrive, FolderOpen, Monitor, Container, Settings, FolderCog, Shield } from 'lucide-react'
import { HelpText } from '../../common/HelpText'
import type { FlashStepConfig } from './config/FlashConfig'
import type { AppdataStepConfig } from './config/AppdataConfig'
import type { VMStepConfig } from './config/VMConfig'
import type { DockerImagesStepConfig } from './config/DockerImagesConfig'
import type { SystemConfigStepConfig } from './config/SystemConfigForm'
import type { CustomStepConfig } from './config/CustomConfig'
import type { HELBACKUPSelfStepConfig } from './config/HELBACKUPSelfConfig'

export type StepType = 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config' | 'custom' | 'helbackup_self'

export interface BackupStepsConfig {
  flash: FlashStepConfig | null
  appdata: AppdataStepConfig | null
  vms: VMStepConfig | null
  docker_images: DockerImagesStepConfig | null
  system_config: SystemConfigStepConfig | null
  custom: CustomStepConfig | null
  helbackup_self: HELBACKUPSelfStepConfig | null
}

export const TYPE_ORDER: StepType[] = [
  'flash', 'appdata', 'vms', 'docker_images', 'system_config', 'custom', 'helbackup_self',
]

export const DEFAULT_CONFIGS: {
  flash: FlashStepConfig
  appdata: AppdataStepConfig
  vms: VMStepConfig
  docker_images: DockerImagesStepConfig
  system_config: SystemConfigStepConfig
  custom: CustomStepConfig
  helbackup_self: HELBACKUPSelfStepConfig
} = {
  flash: { targetId: '', useEncryption: false, retentionMinimum: 3 },
  appdata: {
    targetId: '', containers: [], stopContainers: true, stopOrder: [], stopDelay: 10, restartDelay: 5,
    method: 'rsync', useDatabaseDumps: false, useEncryption: false, retentionMinimum: 3,
  },
  vms: { targetId: '', vms: [], includeDisks: false, useEncryption: false, retentionMinimum: 3 },
  docker_images: { targetId: '', images: [], useEncryption: false, retentionMinimum: 3 },
  system_config: {
    targetId: '',
    includeItems: ['boot_config', 'network', 'users', 'plugins'],
    useEncryption: false, retentionMinimum: 3,
  },
  custom: { sourcePath: '', targetId: '', excludePatterns: [], useEncryption: false, retentionMinimum: 3 },
  helbackup_self: { targetId: '', useEncryption: false, retentionMinimum: 3 },
}

interface Props {
  value: BackupStepsConfig
  onChange: (value: BackupStepsConfig) => void
}

interface StepTypeInfo {
  type: StepType
  icon: React.ReactNode
  labelKey: string
  descKey: string
}

const STEP_TYPES: StepTypeInfo[] = [
  { type: 'flash', icon: <HardDrive size={16} />, labelKey: 'wizard_type_flash', descKey: 'wizard_type_flash_desc' },
  { type: 'appdata', icon: <FolderOpen size={16} />, labelKey: 'wizard_type_appdata', descKey: 'wizard_type_appdata_desc' },
  { type: 'vms', icon: <Monitor size={16} />, labelKey: 'wizard_type_vms', descKey: 'wizard_type_vms_desc' },
  { type: 'docker_images', icon: <Container size={16} />, labelKey: 'wizard_type_docker', descKey: 'wizard_type_docker_desc' },
  { type: 'system_config', icon: <Settings size={16} />, labelKey: 'wizard_type_sysconfig', descKey: 'wizard_type_sysconfig_desc' },
  { type: 'custom', icon: <FolderCog size={16} />, labelKey: 'wizard_type_custom', descKey: 'wizard_type_custom_desc' },
  { type: 'helbackup_self', icon: <Shield size={16} />, labelKey: 'wizard_type_helbackup', descKey: 'wizard_type_helbackup_desc' },
]

export const TYPE_META: Record<StepType, { icon: React.ReactNode; labelKey: string }> = STEP_TYPES.reduce(
  (acc, s) => { acc[s.type] = { icon: s.icon, labelKey: s.labelKey }; return acc },
  {} as Record<StepType, { icon: React.ReactNode; labelKey: string }>,
)

export function StepBackupTypes({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  const toggle = (type: StepType) => {
    if (value[type] !== null) {
      onChange({ ...value, [type]: null })
    } else {
      onChange({ ...value, [type]: DEFAULT_CONFIGS[type] })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-1">
        <p className="text-sm text-[var(--text-muted)]">{t('wizard_backup_types_hint')}</p>
        <HelpText text={t('help_backup_types')} />
      </div>

      {STEP_TYPES.map(({ type, icon, labelKey, descKey }) => {
        const enabled = value[type] !== null
        return (
          <button
            key={type}
            type="button"
            className={[
              'w-full flex items-center gap-3 p-3 border transition-colors text-left',
              enabled
                ? 'border-[var(--theme-accent)] bg-[var(--bg-elevated)]'
                : 'border-[var(--border-default)] hover:bg-[var(--bg-elevated)]',
            ].join(' ')}
            onClick={() => toggle(type)}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => toggle(type)}
              className="accent-[var(--theme-primary)]"
              onClick={e => e.stopPropagation()}
            />
            <span className="text-[var(--theme-accent)]">{icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t(labelKey)}</p>
              <p className="text-xs text-[var(--text-muted)]">{t(descKey)}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
