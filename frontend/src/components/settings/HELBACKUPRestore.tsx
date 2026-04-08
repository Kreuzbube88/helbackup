import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Upload, ShieldAlert } from 'lucide-react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { api } from '../../api'

export function HELBACKUPRestore() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const isEncrypted = file?.name.endsWith('.gpg') ?? false

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setFile(e.target.files?.[0] ?? null)
  }

  async function handleRestore() {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      // Read file as ArrayBuffer → base64
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      // chunk to avoid stack overflow on large files
      const CHUNK = 8192
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
      }
      const fileData = btoa(binary)

      await api.helbackup.restore(fileData, isEncrypted ? password : undefined)
      setDone(true)
      // Navigate to login after container restart delay
      setTimeout(() => navigate('/login'), 6000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-emerald-400 font-mono">{t('helbackup.restore_success')}</p>
        <p className="text-xs text-[var(--text-muted)]">{t('helbackup.restore_restarting')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-muted)]">{t('helbackup.restore_hint')}</p>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".gz,.gpg"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload size={12} />
          {file ? file.name : t('helbackup.choose_file')}
        </Button>
        {file && (
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
        )}
      </div>

      {isEncrypted && (
        <Input
          type="password"
          label={t('helbackup.encryption_password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('helbackup.encryption_password_hint')}
        />
      )}

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      <div className="flex items-start gap-2 p-2 border border-amber-500/30 bg-amber-500/5">
        <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">{t('helbackup.restore_warning')}</p>
      </div>

      <Button
        variant="primary"
        size="sm"
        disabled={!file || loading || (isEncrypted && !password)}
        loading={loading}
        onClick={() => void handleRestore()}
        className="self-start"
      >
        {t('helbackup.restore_btn')}
      </Button>
    </div>
  )
}
