import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './styles/globals.css'
import { App } from './App'
import { ToastProvider } from './components/common/Toast'

// Apply saved theme on boot
const savedTheme = localStorage.getItem('helbackup_theme')
if (savedTheme && savedTheme !== 'blue') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)
