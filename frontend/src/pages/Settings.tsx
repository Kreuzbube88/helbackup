import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/common/Card'
import { ThemeSelector } from '../components/common/ThemeSelector'
import { Select } from '../components/common/Select'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { useToast } from '../components/common/Toast'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { api } from '../api'
import { NotificationSettings } from '../components/notifications/NotificationSettings'

const LANG_OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]

const EMPTY_PW_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function Settings() {
  const { t, i18n } = useTranslation('settings')
  const { toast } = useToast()
  const [lang, setLang] = useState(i18n.language.startsWith('de') ? 'de' : 'en')

  const [formData, setFormData] = useState(EMPTY_PW_FORM)
  const { hasChanges, resetChanges } = useUnsavedChanges(formData)

  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  // Warn on browser close/refresh when form has unsaved data
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  function handleLangChange(value: string) {
    setLang(value)
    void i18n.changeLanguage(value)
    localStorage.setItem('helbackup_lang', value)
    toast(t('language.changed'), 'success')
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
    <div className="flex-1 p-6 overflow-auto max-w-4xl relative">
      {/* Background watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6 relative">
        {t('title')}
      </h1>

      <div className="flex flex-col gap-4 relative">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
            {t('general.title')}
          </h2>
          <div className="flex flex-col gap-4">
            <ThemeSelector />
            <Select
              label={t('language.label')}
              options={LANG_OPTIONS}
              value={lang}
              onChange={e => handleLangChange(e.target.value)}
            />
          </div>
        </Card>

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
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-6 uppercase tracking-wider">
            {t('settings:notifications.title', 'Notifications')}
          </h2>
          <NotificationSettings />
        </Card>
      </div>

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
