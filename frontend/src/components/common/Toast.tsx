import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]',
  error: 'border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.3)]',
  info: 'border-[var(--theme-primary)] shadow-[var(--shadow-glow)]',
  warning: 'border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.3)]',
}

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-[var(--theme-primary)] shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, variant }])
    const timer = setTimeout(() => dismiss(id), 5000)
    timers.current.set(id, timer)
  }, [dismiss])

  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(item => (
          <div
            key={item.id}
            className={[
              'flex items-start gap-3 px-4 py-3',
              'bg-[var(--bg-elevated)] border',
              'animate-slide-in pointer-events-auto',
              variantStyles[item.variant],
            ].join(' ')}
          >
            {variantIcon[item.variant]}
            <span className="text-sm text-[var(--text-primary)] flex-1 leading-relaxed">
              {item.message}
            </span>
            <button
              onClick={() => dismiss(item.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
