import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { useToast } from '../common/Toast'
import { ConfirmModal } from '../common/ConfirmModal'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { HELBACKUPRestore } from './HELBACKUPRestore'
import { api } from '../../api'

const EMPTY_PW_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function SystemTab() {
  const { t } = useTranslation('settings')
  const { toast } = useToast()

  const [formData, setFormData] = useState(EMPTY_PW_FORM)
  const { hasChanges, resetChanges } = useUnsavedChanges(formData)

  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  const [logRetentionDays, setLogRetentionDays] = useState(90)
  const [systemLoading, setSystemLoading] = useState(false)

  useEffect(() => {
    api.settings.get().then(s => setLogRetentionDays(s.logRetentionDays)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  async function handleSystemSave(e: React.FormEvent) {
    e.preventDefault()
    setSystemLoading(true)
    try {
      const res = await api.settings.update({ logRetentionDays })
      setLogRetentionDays(res.logRetentionDays)
      toast(t('system.saved'), 'success')
    } catch {
      toast(t('common:error'), 'error')
    } finally {
      setSystemLoading(false)
    }
  }

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (formData.newPassword !== formData.confirmPassword) {
      setPwError(t('account.error_mismatch'))
      return
    }
    if (formData.newPassword.length < 8) {
      setPwError(t('account.error_too_short'))
      return
    }
    setShowPwConfirm(true)
  }

  async function handlePasswordChange() {
    setShowPwConfirm(false)
    setPwLoading(true)
    try {
      await api.auth.changePassword(formData.currentPassword, formData.newPassword)
      toast(t('account.password_changed'), 'success')
      setFormData(EMPTY_PW_FORM)
      resetChanges(EMPTY_PW_FORM)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setPwError(msg === 'Current password incorrect' ? t('account.error_wrong_current') : msg)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
          {t('account.title')}
        </h2>
        <form onSubmit={handlePwSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            label={t('account.current_password')}
            value={formData.currentPassword}
            onChange={e => setFormData(f => ({ ...f, currentPassword: e.target.value }))}
            required
          />
          <Input
            type="password"
            label={t('account.new_password')}
            value={formData.newPassword}
            onChange={e => setFormData(f => ({ ...f, newPassword: e.target.value }))}
            required
          />
          <Input
            type="password"
            label={t('account.confirm_password')}
            value={formData.confirmPassword}
            onChange={e => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
            error={pwError}
            required
          />
          <Button type="submit" variant="primary" size="sm" loading={pwLoading} className="self-start mt-1">
            {t('account.change_password')}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
          {t('system.title')}
        </h2>
        <form onSubmit={e => { void handleSystemSave(e) }} className="flex flex-col gap-3">
          <Input
            type="number"
            label={t('system.log_retention_label')}
            value={String(logRetentionDays)}
            onChange={e => setLogRetentionDays(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="3650"
            helpText={t('system.log_retention_hint')}
          />
          <Button type="submit" variant="primary" size="sm" loading={systemLoading} className="self-start">
            {t('system.save')}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
          {t('helbackup.title')}
        </h2>
        <HELBACKUPRestore />
      </Card>

      <ConfirmModal
        open={showPwConfirm}
        onConfirm={() => { void handlePasswordChange() }}
        onCancel={() => setShowPwConfirm(false)}
        title={t('account.password_change_confirm')}
        message={t('account.password_change_confirm_message')}
        variant="warning"
        loading={pwLoading}
      />
    </div>
  )
}
