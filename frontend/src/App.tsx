// Force rebuild 2026-04-05
// DESIGN RULE ENFORCEMENT:
// 1. NO browser alerts - use Toast/ConfirmModal
// 2. ALL destructive actions require ConfirmModal
// 3. ALL forms with user input use useUnsavedChanges
// 4. ALL styling via globals.css variables
// 5. NO hardcoded UI strings - use t()
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from './store/useStore'
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
import { ErrorBoundary } from './components/common/ErrorBoundary'

function ProtectedLayout() {
  const { isAuthenticated, setAuth, logout } = useStore()

  useEffect(() => {
    if (!isAuthenticated) return
    api.auth.me().then(data => {
      setAuth(localStorage.getItem('helbackup_token')!, data.user)
    }).catch(() => {
      logout()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto flex">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export function App() {
  const { i18n } = useTranslation()
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
          INITIALIZING...
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="scanline-overlay" />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
