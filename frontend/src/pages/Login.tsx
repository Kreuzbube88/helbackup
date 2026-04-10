import { useState, useEffect, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, ApiError } from '../api'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

export function Login() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { isAuthenticated, setAuth } = useStore()
  const { toast } = useToast()

  const [mountIssues, setMountIssues] = useState<Array<{ containerPath: string; required: string }>>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  useEffect(() => {
    api.mountCheck().then(r => { if (!r.ok) setMountIssues(r.issues) }).catch(() => {})
  }, [])

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.login(username, password, rememberMe)
      setAuth(data.token, data.user, rememberMe)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t('login.error_invalid'))
      } else {
        const msg = err instanceof Error ? err.message : t('login.error_generic')
        setError(t('login.error_generic'))
        toast(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRecovery() {
    if (newPassword !== newPasswordConfirm) {
      setRecoveryError(t('recovery.passwords_dont_match'))
      return
    }
    setRecoveryError('')
    setRecoveryLoading(true)
    try {
      await api.auth.recover(recoveryKey, newPassword)
      setRecoverySuccess(true)
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : t('login.error_generic'))
    } finally {
      setRecoveryLoading(false)
    }
  }

  function resetRecovery() {
    setShowRecovery(false)
    setRecoveryKey('')
    setNewPassword('')
    setNewPasswordConfirm('')
    setRecoveryError('')
    setRecoverySuccess(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Mount warning */}
        {mountIssues.length > 0 && (
          <div className="mb-6 flex flex-col gap-2 px-4 py-3 border border-[var(--status-warning)] bg-[var(--status-warning)]/10 text-[var(--status-warning)] text-xs">
            <div className="flex items-start gap-2">
              <TriangleAlert size={14} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{tc('mount_warning.title')}</span>
                <span className="text-[var(--text-secondary)]">{tc('mount_warning.description')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pl-5">
              {mountIssues.map(issue => (
                <div key={issue.containerPath} className="font-mono">
                  <span className="text-[var(--text-muted)]">{tc('mount_warning.required')} </span>
                  <span>{issue.required}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <img
            src="/logo.png"
            alt="HELBACKUP"
            className="h-32 w-auto"
            style={{ filter: 'drop-shadow(0 0 16px var(--theme-glow))' }}
          />
          <p className="text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] border-neon relative glow-intense border-holographic corner-cuts" style={{ animation: 'card-entrance 0.6s ease-out' }}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-glow)] to-transparent" />

          <div className="px-8 py-8">
            {!showRecovery ? (
              <>
                <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                  {t('login.title')}
                </h1>

                <form onSubmit={(e) => { void handleSubmit(e) }} className="flex flex-col gap-4">
                  <Input
                    label={t('login.username')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                  />
                  <Input
                    type="password"
                    label={t('login.password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    error={error}
                  />

                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="accent-[var(--theme-primary)]"
                    />
                    {t('login.remember_me')}
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="mt-2 w-full justify-center"
                  >
                    {t('login.submit')}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowRecovery(true)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--theme-primary)] transition-colors font-mono"
                  >
                    {t('recovery.forgot_password')}
                  </button>
                </div>
              </>
            ) : recoverySuccess ? (
              <>
                <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  {t('recovery.success_title')}
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  {t('recovery.success_message')}
                </p>
                <Button variant="primary" onClick={resetRecovery} className="w-full justify-center">
                  {t('recovery.back_to_login')}
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                  {t('recovery.title')}
                </h1>

                <div className="flex flex-col gap-4">
                  <Input
                    label={t('recovery.key_label')}
                    value={recoveryKey}
                    onChange={e => setRecoveryKey(e.target.value)}
                    placeholder="HLBK-XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                  />
                  <Input
                    type="password"
                    label={t('recovery.new_password')}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    label={t('recovery.confirm_password')}
                    value={newPasswordConfirm}
                    onChange={e => setNewPasswordConfirm(e.target.value)}
                    error={recoveryError}
                  />

                  <Button
                    variant="primary"
                    onClick={() => { void handleRecovery() }}
                    loading={recoveryLoading}
                    disabled={!recoveryKey || newPassword.length < 8}
                    className="w-full justify-center"
                  >
                    {t('recovery.submit')}
                  </Button>

                  <button
                    type="button"
                    onClick={resetRecovery}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-mono text-center"
                  >
                    ← {t('recovery.back_to_login')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom label */}
        <p className="text-center text-xs font-mono text-[var(--text-muted)] mt-6 tracking-widest">
          HEL*APPS
        </p>
      </div>
    </div>
  )
}
