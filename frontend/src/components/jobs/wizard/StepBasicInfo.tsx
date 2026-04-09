import { useTranslation } from 'react-i18next'
import { Input } from '../../common/Input'
import { HelpText } from '../../common/HelpText'
import { CronBuilder } from './CronBuilder'

export interface BasicInfo {
  name: string
  schedule: string | null
  enabled: boolean
  catchUpOnStart: boolean
}

interface Props {
  value: BasicInfo
  onChange: (value: BasicInfo) => void
}

export function StepBasicInfo({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')

  return (
    <div className="space-y-4">
      <div>
        <Input
          label={t('name')}
          value={value.name}
          onChange={e => onChange({ ...value, name: e.target.value })}
          required
          autoFocus
        />
        <HelpText text={t('help_name')} />
      </div>

      <div>
        <CronBuilder
          value={value.schedule}
          onChange={schedule => onChange({ ...value, schedule })}
        />
        <HelpText text={t('help_schedule')} />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={e => onChange({ ...value, enabled: e.target.checked })}
          className="accent-[var(--theme-primary)]"
        />
        {t('enabled')}
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value.catchUpOnStart}
          onChange={e => onChange({ ...value, catchUpOnStart: e.target.checked })}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{t('catch_up_on_start')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('help_catch_up_on_start')}</p>
        </div>
      </label>
    </div>
  )
}
