import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { Input } from '../common/Input'
import { Select } from '../common/Select'
import { Button } from '../common/Button'
import { useToast } from '../common/Toast'
import { api, type Target } from '../../api'

interface Props {
  target: Target | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const TARGET_TYPES = [
  { value: 'local', label: 'Local Filesystem' },
  { value: 'nas',   label: 'NAS (SSH/Rsync)' },
  { value: 'rclone',label: 'Cloud (Rclone)' },
]

type TargetType = 'local' | 'nas' | 'rclone'

export function TargetEditModal({ target, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('targets')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TargetType>('local')
  const [enabled, setEnabled] = useState(true)

  const [localPath, setLocalPath] = useState('')
  const [nasHost, setNasHost] = useState('')
  const [nasPort, setNasPort] = useState(22)
  const [nasUser, setNasUser] = useState('')
  const [nasPass, setNasPass] = useState('')
  const [nasPath, setNasPath] = useState('')
  const [remoteName, setRemoteName] = useState('')
  const [remotePath, setRemotePath] = useState('')

  useEffect(() => {
    if (!target) return
    setName(target.name)
    setEnabled(target.enabled)
    const cfg = target.config
    const t2 = target.type as TargetType
    setType(t2)
    if (t2 === 'local') {
      setLocalPath((cfg.path as string) ?? '')
    } else if (t2 === 'nas') {
      setNasHost((cfg.host as string) ?? '')
      setNasPort((cfg.port as number) ?? 22)
      setNasUser((cfg.username as string) ?? '')
      setNasPass('')
      setNasPath((cfg.path as string) ?? '')
    } else if (t2 === 'rclone') {
      setRemoteName((cfg.remoteName as string) ?? '')
      setRemotePath((cfg.remotePath as string) ?? '')
    }
  }, [target])

  function buildConfig(): Record<string, unknown> {
    switch (type) {
      case 'local':  return { path: localPath }
      case 'nas':    return { host: nasHost, port: nasPort, username: nasUser, ...(nasPass ? { password: nasPass } : {}), path: nasPath }
      case 'rclone': return { remoteName, remotePath, provider: 'generic' }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target || !name.trim()) return

    setLoading(true)
    try {
      await api.targets.update(target.id, {
        name: name.trim(),
        type,
        enabled,
        config: buildConfig(),
      })
      toast(t('updated'), 'success')
      onSuccess()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('update_error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!target) return null

  return (
    <Modal open={open} onClose={onClose} title={t('edit')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('name')}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
        <Select
          label={t('type')}
          options={TARGET_TYPES}
          value={type}
          onChange={e => setType(e.target.value as TargetType)}
        />

        {type === 'local' && (
          <Input label="Path" value={localPath} onChange={e => setLocalPath(e.target.value)} required />
        )}

        {type === 'nas' && (
          <>
            <Input label="Host" value={nasHost} onChange={e => setNasHost(e.target.value)} required />
            <Input label="Port" type="number" value={nasPort} onChange={e => setNasPort(Number(e.target.value))} />
            <Input label={t('common:nas.username')} value={nasUser} onChange={e => setNasUser(e.target.value)} required />
            <Input label={t('common:nas.password')} type="password" value={nasPass} onChange={e => setNasPass(e.target.value)} placeholder="Leave blank to keep current" />
            <Input label="Path" value={nasPath} onChange={e => setNasPath(e.target.value)} required />
          </>
        )}

        {type === 'rclone' && (
          <>
            <Input label="Remote Name" value={remoteName} onChange={e => setRemoteName(e.target.value)} required />
            <Input label="Remote Path" value={remotePath} onChange={e => setRemotePath(e.target.value)} required />
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="accent-[var(--theme-primary)]"
          />
          {t('enabled')}
        </label>

        <div className="flex gap-3 justify-end mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name.trim()}>
            {t('common:buttons.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
