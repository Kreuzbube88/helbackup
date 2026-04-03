import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/common/Card'
import { ThemeSelector } from '../components/common/ThemeSelector'
import { Select } from '../components/common/Select'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { useToast } from '../components/common/Toast'
import { api } from '../api'

const LANG_OPTIONS = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]

export function Settings() {
  const { t, i18n } = useTranslation('settings')
  const { toast } = useToast()
  const [lang, setLang] = useState(i18n.language.startsWith('de') ? 'de' : 'en')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  function handleLangChange(value: string) {
    setLang(value)
    void i18n.changeLanguage(value)
    localStorage.setItem('helbackup_lang', value)
    toast(t('language.label', { ns: 'settings' }) + ' geändert', 'success')
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwError('Passwörter stimmen nicht überein')
      return
    }
    if (newPassword.length < 8) {
      setPwError('Mindestens 8 Zeichen erforderlich')
      return
    }
    setPwLoading(true)
    try {
      await api.auth.changePassword(currentPassword, newPassword)
      toast('Passwort geändert', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler'
      setPwError(msg === 'Current password incorrect' ? 'Aktuelles Passwort falsch' : msg)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6 overflow-auto max-w-2xl relative">
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
          <form onSubmit={(e) => { void handlePasswordChange(e) }} className="flex flex-col gap-3">
            <Input
              type="password"
              label="Aktuelles Passwort"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Neues Passwort"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Neues Passwort bestätigen"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              error={pwError}
              required
            />
            <Button type="submit" variant="primary" size="sm" loading={pwLoading} className="self-start mt-1">
              {t('account.change_password')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
