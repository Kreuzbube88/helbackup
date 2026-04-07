import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../common/Input'
import { Select } from '../../common/Select'

type Preset = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, '0') + ':00',
}))

const MINUTES = [0, 5, 10, 15, 20, 30, 45].map(m => ({
  value: String(m),
  label: String(m).padStart(2, '0'),
}))

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

const MONTHDAYS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))

function detectPreset(cron: string | null): Preset {
  if (!cron) return 'manual'
  if (cron === '0 * * * *') return 'hourly'
  if (/^(\d+) (\d+) \* \* \*$/.test(cron)) return 'daily'
  if (/^(\d+) (\d+) \* \* (\d)$/.test(cron)) return 'weekly'
  if (/^(\d+) (\d+) (\d+) \* \*$/.test(cron)) return 'monthly'
  return 'custom'
}

function parseCronParts(cron: string | null) {
  if (!cron) return { hour: '2', minute: '0', weekday: '1', monthday: '1' }
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return { hour: '2', minute: '0', weekday: '1', monthday: '1' }
  return {
    minute: parts[0] === '*' ? '0' : parts[0],
    hour: parts[1] === '*' ? '2' : parts[1],
    monthday: parts[2] === '*' ? '1' : parts[2],
    weekday: parts[4] === '*' ? '1' : parts[4],
  }
}

export function CronBuilder({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')
  const initial = parseCronParts(value)
  const [preset, setPreset] = useState<Preset>(() => detectPreset(value))
  const [hour, setHour] = useState(initial.hour)
  const [minute, setMinute] = useState(initial.minute)
  const [weekday, setWeekday] = useState(initial.weekday)
  const [monthday, setMonthday] = useState(initial.monthday)
  const [customCron, setCustomCron] = useState(value ?? '')

  useEffect(() => {
    if (preset === 'manual') { onChange(null); return }
    if (preset === 'hourly') { onChange('0 * * * *'); return }
    if (preset === 'daily') { onChange(`${minute} ${hour} * * *`); return }
    if (preset === 'weekly') { onChange(`${minute} ${hour} * * ${weekday}`); return }
    if (preset === 'monthly') { onChange(`${minute} ${hour} ${monthday} * *`); return }
    if (preset === 'custom') {
      const parts = customCron.trim().split(/\s+/)
      onChange(parts.length === 5 ? customCron.trim() : null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, hour, minute, weekday, monthday, customCron])

  const PRESETS = [
    { value: 'manual', label: t('cron_manual') },
    { value: 'hourly', label: t('cron_hourly') },
    { value: 'daily', label: t('cron_daily') },
    { value: 'weekly', label: t('cron_weekly') },
    { value: 'monthly', label: t('cron_monthly') },
    { value: 'custom', label: t('cron_custom') },
  ]

  return (
    <div className="space-y-3">
      <Select
        label={t('schedule')}
        options={PRESETS}
        value={preset}
        onChange={e => setPreset(e.target.value as Preset)}
      />

      {(preset === 'daily' || preset === 'weekly' || preset === 'monthly') && (
        <div className="flex gap-3">
          <Select label={t('cron_hour')} options={HOURS} value={hour} onChange={e => setHour(e.target.value)} />
          <Select label={t('cron_minute')} options={MINUTES} value={minute} onChange={e => setMinute(e.target.value)} />
        </div>
      )}

      {preset === 'weekly' && (
        <Select label={t('cron_weekday')} options={WEEKDAYS} value={weekday} onChange={e => setWeekday(e.target.value)} />
      )}

      {preset === 'monthly' && (
        <Select label={t('cron_monthday')} options={MONTHDAYS} value={monthday} onChange={e => setMonthday(e.target.value)} />
      )}

      {preset === 'custom' && (
        <Input
          label={t('cron_expression')}
          value={customCron}
          onChange={e => setCustomCron(e.target.value)}
          placeholder="0 2 * * *"
        />
      )}

      {value && (
        <p className="text-xs font-mono text-[var(--text-muted)]">{value}</p>
      )}
    </div>
  )
}
