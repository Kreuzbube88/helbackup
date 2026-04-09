import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  disableBackdropClose?: boolean
}

export function Modal({ open, onClose, title, children, className = '', disableBackdropClose = false }: ModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (!disableBackdropClose && e.target === e.currentTarget) onClose() }}
    >
      <div
        className={[
          'relative w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]',
          'shadow-xl flex flex-col max-h-[90vh] min-w-0',
          className,
          'max-w-[95vw]',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Neon top border accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-glow)] to-transparent" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('buttons.close', { defaultValue: 'Close' })}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
      </div>
    </div>
  )
}
