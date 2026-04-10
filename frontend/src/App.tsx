// DESIGN RULE ENFORCEMENT:
// 1. NO browser alerts - use Toast/ConfirmModal
// 2. ALL destructive actions require ConfirmModal
// 3. ALL forms with user input use useUnsavedChanges
// 4. ALL styling via globals.css variables
// 5. NO hardcoded UI strings - use t()
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { useStore } from './store/useStore'
import { useUiStore } from './store/useUiStore'
import { api } from './api'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { Login } from './pages/Login'
import { SetupPage } from './pages/SetupPage'
import { Dashboard } from './pages/Dashboard'
import { Jobs } from './pages/Jobs'
import { Targets } from './pages/Targets'
import { Settings } from './pages/Settings'
import { LogsPage } from './pages/LogsPage'
import RecoveryPage from './pages/RecoveryPage'
import { ApiTokens } from './pages/ApiTokens'
import { HistoryPage } from './pages/HistoryPage'
import { NotificationLogPage } from './pages/NotificationLogPage'
import { AboutPage } from './pages/AboutPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { OnboardingTour, isOnboardingDone } from './components/onboarding/OnboardingTour'
import { FirstBackupWizard } from './components/onboarding/FirstBackupWizard'

function ProtectedLayout() {
  const { t } = useTranslation('common')
  const { isAuthenticated, setAuth, logout } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showFirstWizard, setShowFirstWizard] = useState(false)
  const [mountIssues, setMountIssues] = useState<Array<{ containerPath: string; required: string }>>([])

  useEffect(() => {
    api.mountCheck().then(r => { if (!r.ok) setMountIssues(r.issues) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    api.auth.me().then(data => {
      setAuth(localStorage.getItem('helbackup_token') ?? sessionStorage.getItem('helbackup_token') ?? '', data.user, !!localStorage.getItem('helbackup_token'))
    }).catch(() => {
      logout()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isAuthenticated && !isOnboardingDone()) {
      setShowOnboarding(true)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="h-full flex flex-col">
      <Header />
      {mountIssues.length > 0 && (
        <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-[var(--status-warning)] bg-[var(--status-warning)]/10 text-[var(--status-warning)] text-xs">
          <div className="flex items-start gap-2">
            <TriangleAlert size={14} className="shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{t('mount_warning.title')}</span>
              <span className="text-[var(--text-secondary)]">{t('mount_warning.description')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-0.5 pl-5">
            {mountIssues.map(issue => (
              <span key={issue.containerPath} className="font-mono">
                <span className="text-[var(--text-muted)]">{t('mount_warning.required')} </span>
                {issue.required}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto flex">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <OnboardingTour
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartGuide={() => setShowFirstWizard(true)}
      />
      <FirstBackupWizard
        open={showFirstWizard}
        onClose={() => setShowFirstWizard(false)}
        onSuccess={() => { /* data refreshed by pages on next mount */ }}
      />
    </div>
  )
}

export function App() {
  const { t, i18n } = useTranslation()
  const scanlineEnabled = useUiStore(s => s.scanlineEnabled)
  const [setupChecking, setSetupChecking] = useState(true)
  const [firstRun, setFirstRun] = useState(false)

  useEffect(() => {
    api.setup.checkStatus()
      .then(async s => {
        setFirstRun(s.firstRun)
        if (!s.firstRun) {
          try {
            const { language } = await api.auth.getLanguage()
            await i18n.changeLanguage(language)
          } catch { /* use default */ }
        }
      })
      .catch(() => { /* assume not first run on error */ })
      .finally(() => setSetupChecking(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (setupChecking) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="font-mono text-xs text-[var(--text-muted)] tracking-widest animate-pulse">
          {t('initializing')}
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      {scanlineEnabled && <div className="scanline-overlay" />}
      <Routes>
        {firstRun ? (
          <>
            <Route path="/setup" element={<SetupPage onComplete={() => setFirstRun(false)} />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/targets" element={<Targets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/logs/:runId" element={<LogsPage />} />
              <Route path="/logs" element={<Navigate to="/jobs" replace />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/recovery" element={<RecoveryPage />} />
              <Route path="/api-tokens" element={<ApiTokens />} />
              <Route path="/notification-log" element={<NotificationLogPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
