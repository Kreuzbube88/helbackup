import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { api } from '../../api'

interface Props {
  backupId: string
  onUnlock: (sessionId: string) => void
  onCancel: () => void
}

export default function UnlockBackupDialog({ backupId, onUnlock, onCancel }: Props) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await api.decryption.unlock(backupId, password)
      onUnlock(result.sessionId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] border-2 border-[var(--border-default)] p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{t('decryption.unlock_backup')}</h3>

        <p className="mb-4 text-sm opacity-70">{t('decryption.unlock_hint')}</p>

        <Input
          type="password"
          label={t('decryption.encryption_password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && password && void handleUnlock()}
          autoFocus
        />

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border-2 border-red-500/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <Button
            variant="primary"
            onClick={() => void handleUnlock()}
            disabled={!password || loading}
            className="flex-1"
          >
            {loading ? t('decryption.unlocking') : t('decryption.unlock')}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {t('buttons.cancel')}
          </Button>
        </div>

        <div className="mt-4 text-xs opacity-70">
          {t('decryption.session_expires')}: 30 {t('decryption.minutes')}
        </div>
      </div>
    </div>
  )
}
