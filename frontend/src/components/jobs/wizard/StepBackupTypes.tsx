import { useTranslation } from 'react-i18next'
import { HardDrive, FolderOpen, Monitor, Container, Settings, Cloud, FolderCog, ChevronDown, ChevronUp } from 'lucide-react'
import { HelpText } from '../../common/HelpText'
import type { Target } from '../../../api'
import { FlashConfig, type FlashStepConfig } from './config/FlashConfig'
import { AppdataConfig, type AppdataStepConfig } from './config/AppdataConfig'
import { VMConfig, type VMStepConfig } from './config/VMConfig'
import { DockerImagesConfig, type DockerImagesStepConfig } from './config/DockerImagesConfig'
import { SystemConfigForm, type SystemConfigStepConfig } from './config/SystemConfigForm'
import { CloudConfig, type CloudStepConfig } from './config/CloudConfig'
import { CustomConfig, type CustomStepConfig } from './config/CustomConfig'

export type StepType = 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config' | 'cloud' | 'custom'

export interface BackupStepsConfig {
  flash: FlashStepConfig | null
  appdata: AppdataStepConfig | null
  vms: VMStepConfig | null
  docker_images: DockerImagesStepConfig | null
  system_config: SystemConfigStepConfig | null
  cloud: CloudStepConfig | null
  custom: CustomStepConfig | null
}

interface Props {
  value: BackupStepsConfig
  onChange: (value: BackupStepsConfig) => void
  targets: Target[]
}

const DEFAULT_CONFIGS = {
  flash: { targetId: '' },
  appdata: { targetId: '', containers: [], stopContainers: true, stopOrder: [], stopDelay: 10, restartDelay: 5 },
  vms: { targetId: '', vms: [], includeDisks: false },
  docker_images: { targetId: '', images: [] },
  system_config: { targetId: '', includeItems: ['boot_config', 'network', 'users', 'plugins'] },
  cloud: { targetId: '', sourcePath: '' },
  custom: { sourcePath: '', targetId: '', excludePatterns: [] },
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
  { type: 'cloud', icon: <Cloud size={16} />, labelKey: 'wizard_type_cloud', descKey: 'wizard_type_cloud_desc' },
  { type: 'custom', icon: <FolderCog size={16} />, labelKey: 'wizard_type_custom', descKey: 'wizard_type_custom_desc' },
]

export function StepBackupTypes({ value, onChange, targets }: Props) {
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
          <div key={type} className="border border-[var(--border-default)]">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-elevated)] transition-colors"
              onClick={() => toggle(type)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggle(type)}
                  className="accent-[var(--theme-primary)]"
                  onClick={e => e.stopPropagation()}
                />
                <span className="text-[var(--theme-accent)]">{icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t(labelKey)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t(descKey)}</p>
                </div>
              </div>
              {enabled
                ? <ChevronUp size={14} className="text-[var(--text-muted)]" />
                : <ChevronDown size={14} className="text-[var(--text-muted)]" />
              }
            </button>

            {enabled && (
              <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
                {type === 'flash' && (
                  <FlashConfig
                    value={value.flash!}
                    onChange={cfg => onChange({ ...value, flash: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'appdata' && (
                  <AppdataConfig
                    value={value.appdata!}
                    onChange={cfg => onChange({ ...value, appdata: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'vms' && (
                  <VMConfig
                    value={value.vms!}
                    onChange={cfg => onChange({ ...value, vms: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'docker_images' && (
                  <DockerImagesConfig
                    value={value.docker_images!}
                    onChange={cfg => onChange({ ...value, docker_images: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'system_config' && (
                  <SystemConfigForm
                    value={value.system_config!}
                    onChange={cfg => onChange({ ...value, system_config: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'cloud' && (
                  <CloudConfig
                    value={value.cloud!}
                    onChange={cfg => onChange({ ...value, cloud: cfg })}
                    targets={targets}
                  />
                )}
                {type === 'custom' && (
                  <CustomConfig
                    value={value.custom!}
                    onChange={cfg => onChange({ ...value, custom: cfg })}
                    targets={targets}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
