import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { ConfirmModal } from '../common/ConfirmModal'
import { TargetWizard } from './wizard/TargetWizard'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TargetCreateModal({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('targets')
  const [confirmClose, setConfirmClose] = useState(false)
  const [dirty, setDirty] = useState(false)

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
      <Modal open={open} onClose={handleClose} title={t('create_new')} className="max-w-3xl" disableBackdropClose>
        <TargetWizard
          mode="create"
          onCancel={handleClose}
          onSuccess={handleSuccess}
          onDirtyChange={setDirty}
        />
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
