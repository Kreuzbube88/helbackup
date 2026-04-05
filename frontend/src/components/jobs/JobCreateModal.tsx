import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { useToast } from '../common/Toast'
import { api } from '../../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function isValidCron(expr: string): boolean {
  // Basic cron validation: 5 fields (min hour dom mon dow)
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  return parts.every(p => /^[\d*/,\-]+$/.test(p))
}

export function JobCreateModal({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('jobs')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [scheduleError, setScheduleError] = useState('')

  function validateSchedule(cron: string): boolean {
    if (!cron.trim()) {
      setScheduleError('')
      return true
    }
    if (!isValidCron(cron)) {
      setScheduleError(t('invalid_cron'))
      return false
    }
    setScheduleError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!validateSchedule(schedule)) return

    setLoading(true)
    try {
      await api.jobs.create({
        name: name.trim(),
        enabled,
        schedule: schedule.trim() || undefined,
        steps: [],
      })
      toast(t('created'), 'success')
      onSuccess()
      onClose()
      setName('')
      setSchedule('')
      setEnabled(true)
    } catch (err) {
      toast(err instanceof Error ? err.message : t('create_error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('create_new')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('name')}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label={t('schedule')}
          value={schedule}
          onChange={e => {
            setSchedule(e.target.value)
            validateSchedule(e.target.value)
          }}
          error={scheduleError}
          placeholder="*/5 * * * *"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="accent-[var(--theme-primary)]"
          />
          {t('enabled')}
        </label>
        <div className="flex gap-3 justify-end mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name.trim()}>
            {t('common:buttons.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
