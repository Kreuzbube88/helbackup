import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle, Info } from 'lucide-react'

type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  loading?: boolean
}

const variantIcon: Record<ConfirmVariant, React.ReactNode> = {
  danger: <AlertTriangle size={20} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={20} className="text-amber-400 shrink-0" />,
  info: <Info size={20} className="text-[var(--theme-primary)] shrink-0" />,
}

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="flex gap-3 mb-6">
        {variantIcon[variant]}
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelText ?? t('buttons.cancel')}
        </Button>
        <Button
          variant={variant === 'info' ? 'primary' : 'danger'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText ?? t('buttons.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
