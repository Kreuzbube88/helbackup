import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { ConfirmModal } from '../common/ConfirmModal'
import { Input } from '../common/Input'
import { Select } from '../common/Select'
import { Button } from '../common/Button'
import { useToast } from '../common/Toast'
import { api } from '../../api'
import { NASTargetForm, type NASPowerConfig } from './NASTargetForm'
import { NASSetupHint } from './NASSetupHint'
import { HelpText } from '../common/HelpText'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type TargetType = 'local' | 'nas' | 'rclone'

export function TargetCreateModal({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('targets')

  const TARGET_TYPES = [
    { value: 'local', label: t('type_local') },
    { value: 'nas', label: t('type_nas') },
    { value: 'rclone', label: t('type_rclone') },
  ]
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sshKeyLoading, setSshKeyLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TargetType>('local')
  const [enabled, setEnabled] = useState(true)

  // local
  const [localPath, setLocalPath] = useState('/mnt/backups')

  // nas
  const [nasHost, setNasHost] = useState('')
  const [nasPort, setNasPort] = useState(22)
  const [nasUser, setNasUser] = useState('')
  const [nasPass, setNasPass] = useState('')
  const [nasPrivateKey, setNasPrivateKey] = useState('')
  const [nasPath, setNasPath] = useState('/backups')
  const [nasPower, setNasPower] = useState<NASPowerConfig>({
    enabled: false, mac: '', ip: '', autoShutdown: false,
  })

  // rclone
  const [remoteName, setRemoteName] = useState('')
  const [remotePath, setRemotePath] = useState('backups')

  function buildConfig(): Record<string, unknown> {
    switch (type) {
      case 'local': return { path: localPath }
      case 'nas': return { host: nasHost, port: nasPort, username: nasUser, password: nasPass, ...(nasPrivateKey ? { privateKey: nasPrivateKey } : {}), path: nasPath, power: nasPower }
      case 'rclone': return { remoteName, remotePath, provider: 'generic' }
    }
  }

  const isDirty = name !== '' ||
    (type === 'local' && localPath !== '/mnt/backups') ||
    (type === 'nas' && (nasHost !== '' || nasUser !== '')) ||
    (type === 'rclone' && remoteName !== '')

  const handleClose = () => {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  function resetForm() {
    setName('')
    setType('local')
    setEnabled(true)
    setLocalPath('/mnt/backups')
    setNasHost('')
    setNasPort(22)
    setNasUser('')
    setNasPass('')
    setNasPrivateKey('')
    setNasPath('/backups')
    setNasPower({ enabled: false, mac: '', ip: '', autoShutdown: false })
    setRemoteName('')
    setRemotePath('backups')
  }

  async function handleSetupSshKey() {
    setSshKeyLoading(true)
    try {
      const result = await api.nas.setupSshKey(nasHost, nasPort, nasUser, nasPass)
      setNasPrivateKey(result.privateKeyPath)
      toast(t('common:nas.ssh_key_deployed'), 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common:nas.ssh_key_error'), 'error')
    } finally {
      setSshKeyLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await api.targets.create({ name: name.trim(), type, enabled, config: buildConfig() })
      toast(t('created'), 'success')
      onSuccess()
      onClose()
      resetForm()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('create_error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Modal open={open} onClose={handleClose} title={t('create_new')} className="max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('name')}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
        <div>
          <Select
            label={t('type')}
            options={TARGET_TYPES}
            value={type}
            onChange={e => setType(e.target.value as TargetType)}
          />
          <HelpText text={t('help_type')} />
        </div>

        {type === 'local' && (
          <Input label={t('path')} value={localPath} onChange={e => setLocalPath(e.target.value)} required />
        )}

        {type === 'nas' && (
          <>
            <Input label={t('host')} value={nasHost} onChange={e => setNasHost(e.target.value)} required />
            <Input label={t('port')} type="number" value={nasPort} onChange={e => setNasPort(Number(e.target.value))} />
            <Input label={t('common:nas.username')} value={nasUser} onChange={e => setNasUser(e.target.value)} required />
            <Input label={t('common:nas.password')} type="password" value={nasPass} onChange={e => setNasPass(e.target.value)} placeholder={t('common:nas.password_placeholder')} />
            {nasHost && nasUser && nasPass && (
              <Button type="button" variant="secondary" loading={sshKeyLoading} onClick={handleSetupSshKey}>
                {t('common:nas.setup_ssh_key')}
              </Button>
            )}
            <NASSetupHint />
            <button type="button" onClick={() => setAdvancedOpen(v => !v)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-left">
              {advancedOpen ? '▾' : '▸'} {t('common:advanced')}
            </button>
            {advancedOpen && (
              <Input label={t('common:nas.private_key')} value={nasPrivateKey} onChange={e => setNasPrivateKey(e.target.value)} placeholder={t('common:nas.private_key_placeholder')} helpText={t('common:nas.private_key_hint')} />
            )}
            <Input label={t('path')} value={nasPath} onChange={e => setNasPath(e.target.value)} required />
            <div className="border border-[var(--border-default)] p-3">
              <NASTargetForm value={nasPower} onChange={setNasPower} sshHost={nasHost} sshUsername={nasUser} sshPassword={nasPass} />
            </div>
          </>
        )}

        {type === 'rclone' && (
          <>
            <Input label={t('remote_name')} value={remoteName} onChange={e => setRemoteName(e.target.value)} required />
            <Input label={t('remote_path')} value={remotePath} onChange={e => setRemotePath(e.target.value)} required />
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
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name.trim()}>
            {t('common:buttons.save')}
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmModal
      open={confirmClose}
      onConfirm={() => { setConfirmClose(false); resetForm(); onClose() }}
      onCancel={() => setConfirmClose(false)}
      title={t('common:unsaved_changes_title')}
      message={t('common:unsaved_changes')}
      confirmText={t('common:buttons.discard')}
      variant="warning"
    />
    </>
  )
}
