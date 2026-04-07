import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { api } from '../../api'

interface Props {
  onComplete: () => void
  onCancel: () => void
}

type Step = 'intro' | 'password' | 'recovery'

export default function EncryptionSetupWizard({ onComplete, onCancel }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('intro')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordMatch = password === passwordConfirm && password.length >= 12

  const handleSetup = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const result = await api.encryption.setup(password)
      setRecoveryKey(result.recoveryKey)
      setStep('recovery')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common:error'))
    } finally {
      setLoading(false)
    }
  }

  const downloadRecoveryKey = (): void => {
    const content = [
      'HELBACKUP ENCRYPTION RECOVERY KEY',
      '',
      `Recovery Key: ${recoveryKey}`,
      '',
      'WARNING: Keep this file in a SAFE place!',
      'Without this key, encrypted backups CANNOT be restored if you forget your password.',
      '',
      `Created: ${new Date().toLocaleString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'helbackup-encryption-recovery.txt'
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
  }

  if (step === 'intro') {
    return (
      <div className="border-2 border-yellow-500 bg-[var(--bg-elevated)] p-6 space-y-4">
        <h3 className="text-lg font-bold">{t('common:encryption.setup_wizard')}</h3>

        <div className="border border-[var(--border-default)] p-4 space-y-2">
          <p className="font-medium text-sm">{t('common:encryption.what_is_this')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
            <li>{t('common:encryption.feature_1')}</li>
            <li>{t('common:encryption.feature_2')}</li>
            <li>{t('common:encryption.feature_3')}</li>
          </ul>
        </div>

        <div className="border-2 border-red-500 bg-red-950/20 p-4 space-y-2">
          <p className="font-bold text-sm text-red-400">{t('common:encryption.warning')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
            <li>{t('common:encryption.warning_1')}</li>
            <li>{t('common:encryption.warning_2')}</li>
            <li>{t('common:encryption.warning_3')}</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onClick={() => setStep('password')}>
            {t('common:encryption.continue')}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t('common:buttons.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'password') {
    return (
      <div className="border-2 border-[var(--theme-primary)] bg-[var(--bg-elevated)] p-6 space-y-4">
        <h3 className="text-lg font-bold">{t('common:encryption.create_password')}</h3>

        <div className="space-y-4">
          <Input
            type="password"
            label={t('common:encryption.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('common:encryption.password_hint')}
          />

          <Input
            type="password"
            label={t('common:encryption.password_confirm')}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder={t('common:encryption.password_repeat')}
          />

          {password.length > 0 && passwordConfirm.length > 0 && (
            <p className={`text-sm ${passwordMatch ? 'text-green-400' : 'text-red-400'}`}>
              {passwordMatch
                ? `✓ ${t('common:encryption.passwords_match')}`
                : `✗ ${t('common:encryption.passwords_dont_match')}`}
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleSetup}
            disabled={!passwordMatch}
            loading={loading}
          >
            {t('common:encryption.setup')}
          </Button>
          <Button variant="secondary" onClick={() => setStep('intro')}>
            {t('common:recovery.back')}
          </Button>
        </div>
      </div>
    )
  }

  // step === 'recovery'
  return (
    <div className="border-2 border-red-500 bg-[var(--bg-elevated)] p-6 space-y-4">
      <h3 className="text-lg font-bold">{t('common:encryption.recovery_key')}</h3>

      <div className="border-2 border-[var(--border-default)] p-4 space-y-3">
        <p className="font-mono text-base text-center select-all text-[var(--theme-primary)]">
          {recoveryKey}
        </p>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={downloadRecoveryKey} className="flex-1">
            {t('common:encryption.download_key')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { navigator.clipboard.writeText(recoveryKey).catch(() => { window.prompt('Copy this key:', recoveryKey) }) }}
            className="flex-1"
          >
            {t('common:encryption.copy_key')}
          </Button>
        </div>
      </div>

      <div className="border-2 border-yellow-500 bg-yellow-900/20 p-4 space-y-2">
        <p className="font-bold text-sm text-yellow-400">{t('common:encryption.critical')}:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
          <li>{t('common:encryption.recovery_warning_1')}</li>
          <li>{t('common:encryption.recovery_warning_2')}</li>
          <li>{t('common:encryption.recovery_warning_3')}</li>
        </ul>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={downloaded}
            onChange={(e) => setDownloaded(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">{t('common:encryption.confirm_downloaded')}</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">{t('common:encryption.confirm_understood')}</span>
        </label>
      </div>

      <Button
        variant="primary"
        onClick={onComplete}
        disabled={!downloaded || !understood}
        className="w-full"
      >
        {t('common:encryption.complete')}
      </Button>
    </div>
  )
}
