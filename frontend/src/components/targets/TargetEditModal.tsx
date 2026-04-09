import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { ConfirmModal } from '../common/ConfirmModal'
import { TargetWizard } from './wizard/TargetWizard'
import type { Target } from '../../api'

interface Props {
  target: Target | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TargetEditModal({ target, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('targets')
  const [confirmClose, setConfirmClose] = useState(false)
  const [dirty, setDirty] = useState(false)

  if (!target) return null

  const handleClose = () => {
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const handleSuccess = () => {
    setDirty(false)
    onSuccess()
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title={t('edit')} className="max-w-[96rem]" disableBackdropClose>
        <div className="mx-auto w-full max-w-3xl">
          <TargetWizard
            mode="edit"
            initialTarget={target}
            onCancel={handleClose}
            onSuccess={handleSuccess}
            onDirtyChange={setDirty}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={confirmClose}
        onConfirm={() => { setConfirmClose(false); setDirty(false); onClose() }}
        onCancel={() => setConfirmClose(false)}
        title={t('common:unsaved_changes_title')}
        message={t('common:unsaved_changes')}
        confirmText={t('common:buttons.discard')}
        variant="warning"
      />
    </>
  )
}
