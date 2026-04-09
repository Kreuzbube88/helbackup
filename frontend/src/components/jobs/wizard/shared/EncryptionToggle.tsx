import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../../api'
import EncryptionSetupWizard from '../../../encryption/EncryptionSetupWizard'

interface Props {
  value: boolean
  onChange: (value: boolean) => void
}

export function EncryptionToggle({ value, onChange }: Props) {
  const { t } = useTranslation('jobs')
  const [configured, setConfigured] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    api.encryption.checkStatus()
      .then(({ configured }) => setConfigured(configured))
      .catch(() => { /* non-critical */ })
  }, [])

  return (
    <div className="pt-3 border-t border-[var(--border-default)]">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => {
            if (e.target.checked && !configured) {
              setShowSetup(true)
            } else {
              onChange(e.target.checked)
            }
          }}
          className="mt-0.5 accent-[var(--theme-primary)]"
        />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{t('encrypt_backup')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('encryption_hint')}</p>
          <p className="text-[11px] text-[var(--text-muted)] italic mt-1">{t('encryption_timing_note')}</p>
        </div>
      </label>

      {showSetup && (
        <EncryptionSetupWizard
          onComplete={() => {
            setShowSetup(false)
            setConfigured(true)
            onChange(true)
          }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  )
}
