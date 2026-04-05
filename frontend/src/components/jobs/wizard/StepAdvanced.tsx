import { useTranslation } from 'react-i18next'
import AdvancedSettings, { type AdvancedSettingsValue } from '../AdvancedSettings'
import ToolSelector, { type ToolSelection } from '../../tools/ToolSelector'

interface Props {
  value: AdvancedSettingsValue
  onChange: (value: AdvancedSettingsValue) => void
  tools: ToolSelection
  onToolsChange: (value: ToolSelection) => void
}

export function StepAdvanced({ value, onChange, tools, onToolsChange }: Props) {
  const { t } = useTranslation('jobs')
  return (
    <div className="space-y-6">
      <AdvancedSettings value={value} onChange={onChange} />
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('wizard_backup_method')}</p>
        <ToolSelector value={tools} onChange={onToolsChange} />
      </div>
    </div>
  )
}
