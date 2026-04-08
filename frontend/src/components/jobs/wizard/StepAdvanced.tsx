import { useTranslation } from 'react-i18next'
import AdvancedSettings, { type AdvancedSettingsValue } from '../AdvancedSettings'
import ToolSelector, { type ToolSelection } from '../../tools/ToolSelector'
import type { BackupStepsConfig } from './StepBackupTypes'

interface Props {
  value: AdvancedSettingsValue
  onChange: (value: AdvancedSettingsValue) => void
  tools: ToolSelection
  onToolsChange: (value: ToolSelection) => void
  backupSteps: BackupStepsConfig
}

export function StepAdvanced({ value, onChange, tools, onToolsChange, backupSteps }: Props) {
  const { t } = useTranslation('jobs')

  const enabledTypes = new Set<'flash' | 'appdata' | 'vms'>([
    ...(backupSteps.flash ? (['flash'] as const) : []),
    ...(backupSteps.appdata ? (['appdata'] as const) : []),
    ...(backupSteps.vms ? (['vms'] as const) : []),
  ])

  return (
    <div className="space-y-6">
      <AdvancedSettings value={value} onChange={onChange} />
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('wizard_backup_method')}</p>
        <ToolSelector value={tools} onChange={onToolsChange} enabledTypes={enabledTypes} />
      </div>
    </div>
  )
}
