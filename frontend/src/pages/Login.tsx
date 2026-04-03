import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/useStore'
import { api } from '../api'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useToast } from '../components/common/Toast'

export function Login() {
  const { t } = useTranslation('auth')
  const { isAuthenticated, setAuth } = useStore()
  const { toast } = useToast()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.auth.login(username, password)
      setAuth(data.token, data.user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('login.error_generic')
      if (msg === 'Invalid credentials') {
        setError(t('login.error_invalid'))
      } else {
        setError(t('login.error_generic'))
        toast(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
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

        {/* Login Card */}
        <div className="bg-[var(--bg-card)] border-2 border-[var(--border-glow)] shadow-xl border-neon relative">
          {/* Neon top line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-glow)] to-transparent" />

          <div className="px-8 py-8">
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

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="mt-2 w-full justify-center"
              >
                {t('login.submit')}
              </Button>
            </form>
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
