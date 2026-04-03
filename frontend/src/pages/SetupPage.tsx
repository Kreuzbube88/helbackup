import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { api } from '../api'

type Step = 'intro' | 'credentials' | 'recovery'

interface Props {
  onComplete: () => void
}

export function SetupPage({ onComplete }: Props) {
  const { t } = useTranslation('common')

  const [step, setStep] = useState<Step>('intro')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = password.length >= 8 && password === passwordConfirm

  async function handleCreateAdmin() {
    setError('')
    setLoading(true)
    try {
      const result = await api.setup.completeSetup(username, password)
      setRecoveryKey(result.recoveryKey)
      setStep('recovery')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.error_generic'))
    } finally {
      setLoading(false)
    }
  }

  function downloadRecoveryKey() {
    const content = [
      'HELBACKUP RECOVERY KEY',
      '',
      `Username: ${username}`,
      `Recovery Key: ${recoveryKey}`,
      '',
      'IMPORTANT: Keep this file in a safe place!',
      'Without this key, password recovery is impossible.',
      '',
      `Created: ${new Date().toLocaleString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `helbackup-recovery-${username}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center px-4">
        <div className="relative w-full max-w-lg">
          <div className="bg-[var(--bg-card)] border-neon glow-intense border-holographic corner-cuts px-8 py-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-glow)] to-transparent" />

            <div className="flex flex-col items-center gap-3 mb-8">
              <img src="/logo.png" alt="HELBACKUP" className="h-24 w-auto"
                style={{ filter: 'drop-shadow(0 0 16px var(--theme-glow))' }} />
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {t('setup.welcome')}
              </h1>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 mb-6 space-y-2">
              <p className="text-sm font-medium text-[var(--text-secondary)]">{t('setup.what_happens')}:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--text-primary)]">
                <li>{t('setup.step_1')}</li>
                <li>{t('setup.step_2')}</li>
                <li>{t('setup.step_3')}</li>
              </ol>
            </div>

            <Button variant="primary" onClick={() => setStep('credentials')} className="w-full justify-center">
              {t('setup.begin_setup')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'credentials') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm">
          <div className="bg-[var(--bg-card)] border-neon glow-intense border-holographic corner-cuts px-8 py-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-glow)] to-transparent" />

            <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
              {t('setup.create_admin')}
            </h1>

            <div className="flex flex-col gap-4 mb-6">
              <Input
                label={t('setup.username')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
              <Input
                type="password"
                label={t('setup.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Input
                type="password"
                label={t('setup.password_confirm')}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
              />

              {password.length > 0 && passwordConfirm.length > 0 && (
                <p className={`text-xs font-mono ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordsMatch ? `✓ ${t('setup.passwords_match')}` : `✗ ${t('setup.passwords_dont_match')}`}
                </p>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('intro')} className="flex-1 justify-center">
                {t('buttons.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => { void handleCreateAdmin() }}
                disabled={!passwordsMatch || username.length < 3}
                loading={loading}
                className="flex-1 justify-center"
              >
                {t('setup.create_account')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center px-4">
      <div className="relative w-full max-w-lg">
        <div className="bg-[var(--bg-card)] border-2 border-red-500 corner-cuts px-8 py-8"
          style={{ boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>

          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {t('setup.recovery_key')}
          </h1>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 mb-4">
            <p className="font-mono text-xl text-center tracking-widest text-[var(--text-primary)] select-all mb-4">
              {recoveryKey}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={downloadRecoveryKey} className="flex-1 justify-center text-xs">
                {t('setup.download_key')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => { void navigator.clipboard.writeText(recoveryKey) }}
                className="flex-1 justify-center text-xs"
              >
                {t('setup.copy_key')}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 mb-4 space-y-1">
            <p className="text-xs font-semibold text-yellow-400">{t('setup.critical_warning')}:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-secondary)]">
              <li>{t('setup.warning_1')}</li>
              <li>{t('setup.warning_2')}</li>
              <li>{t('setup.warning_3')}</li>
            </ul>
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={downloaded}
                onChange={e => setDownloaded(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--text-primary)]">{t('setup.confirm_downloaded')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={understood}
                onChange={e => setUnderstood(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--text-primary)]">{t('setup.confirm_understood')}</span>
            </label>
          </div>

          <Button
            variant="primary"
            onClick={onComplete}
            disabled={!downloaded || !understood}
            className="w-full justify-center"
          >
            {t('setup.complete_setup')}
          </Button>
        </div>
      </div>
    </div>
  )
}
