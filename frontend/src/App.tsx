// DESIGN RULE ENFORCEMENT:
// 1. NO browser alerts - use Toast/ConfirmModal
// 2. ALL destructive actions require ConfirmModal
// 3. ALL forms with user input use useUnsavedChanges
// 4. ALL styling via globals.css variables
// 5. NO hardcoded UI strings - use t()
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useStore } from './store/useStore'
import { api } from './api'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Jobs } from './pages/Jobs'
import { Targets } from './pages/Targets'
import { Settings } from './pages/Settings'

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
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <div className="scanline-overlay" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
