import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { ConfirmModal } from '../common/ConfirmModal'
import { Input } from '../common/Input'
import { Select } from '../common/Select'
import { Button } from '../common/Button'
import { useToast } from '../common/Toast'
import { api, type Target } from '../../api'
import { NASTargetForm, type NASPowerConfig } from './NASTargetForm'
import { NASSetupHint } from './NASSetupHint'

interface Props {
  target: Target | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type TargetType = 'local' | 'nas'

export function TargetEditModal({ target, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('targets')

  const TARGET_TYPES = [
    { value: 'local', label: t('type_local') },
    { value: 'nas',   label: t('type_nas') },
  ]
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sshKeyLoading, setSshKeyLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TargetType>('local')
  const [enabled, setEnabled] = useState(true)

  const [localPath, setLocalPath] = useState('')
  const [nasHost, setNasHost] = useState('')
  const [nasPort, setNasPort] = useState(22)
  const [nasUser, setNasUser] = useState('')
  const [nasPass, setNasPass] = useState('')
  const [nasPrivateKey, setNasPrivateKey] = useState('')
  const [nasType, setNasType] = useState('')
  const [nasPath, setNasPath] = useState('')
  const [nasPower, setNasPower] = useState<NASPowerConfig>({
    enabled: false, mac: '', ip: '', autoShutdown: false,
  })
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
      setNasPrivateKey((cfg.privateKey as string) ?? '')
      setNasType((cfg.nasType as string) ?? '')
      setAdvancedOpen(!!(cfg.privateKey as string | undefined))
      setNasPath((cfg.path as string) ?? '')
      setNasPower((cfg.power as NASPowerConfig | undefined) ?? {
        enabled: false, mac: '', ip: '', autoShutdown: false,
      })
    }
  }, [target])

  const isDirty = target !== null && (
    name !== target.name ||
    type !== (target.type as TargetType) ||
    enabled !== target.enabled ||
    (type === 'local' && localPath !== ((target.config.path as string) ?? '')) ||
    (type === 'nas' && (
      nasHost !== ((target.config.host as string) ?? '') ||
      nasUser !== ((target.config.username as string) ?? '') ||
      nasPass !== '' ||
      nasPath !== ((target.config.path as string) ?? '')
    ))
  )

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

  const handleClose = () => {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  function buildConfig(): Record<string, unknown> {
    switch (type) {
      case 'local':  return { path: localPath }
      case 'nas':    return { host: nasHost, port: nasPort, username: nasUser, ...(nasPass ? { password: nasPass } : {}), ...(nasPrivateKey ? { privateKey: nasPrivateKey } : {}), ...(nasType ? { nasType } : {}), path: nasPath, power: nasPower }
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
    <>
    <Modal open={open} onClose={handleClose} title={t('edit')} className="max-w-3xl" disableBackdropClose>
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
          <Input label={t('path')} value={localPath} onChange={e => setLocalPath(e.target.value)} required />
        )}

        {type === 'nas' && (
          <>
            <Input label={t('host')} value={nasHost} onChange={e => setNasHost(e.target.value)} required />
            <Input label={t('port')} type="number" value={nasPort} onChange={e => setNasPort(Number(e.target.value))} />
            <Input label={t('common:nas.username')} value={nasUser} onChange={e => setNasUser(e.target.value)} required />
            <Input label={t('common:nas.password')} type="password" value={nasPass} onChange={e => setNasPass(e.target.value)} placeholder={t('keep_current_hint')} />
            <Select
              label={t('common:nas.type_label')}
              options={[
                { value: '', label: t('common:nas.type_placeholder') },
                { value: 'synology', label: t('common:nas.type_synology') },
                { value: 'qnap', label: t('common:nas.type_qnap') },
                { value: 'truenas', label: t('common:nas.type_truenas') },
                { value: 'omv', label: t('common:nas.type_omv') },
                { value: 'unraid', label: t('common:nas.type_unraid') },
                { value: 'linux', label: t('common:nas.type_linux') },
              ]}
              value={nasType}
              onChange={e => setNasType(e.target.value)}
            />
            {nasHost && nasUser && nasPass && (
              <Button type="button" variant="secondary" loading={sshKeyLoading} onClick={handleSetupSshKey}>
                {t('common:nas.setup_ssh_key')}
              </Button>
            )}
            <NASSetupHint nasType={nasType} />
            <button type="button" onClick={() => setAdvancedOpen(v => !v)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-left">
              {advancedOpen ? '▾' : '▸'} {t('common:advanced')}
            </button>
            {advancedOpen && (
              <Input label={t('common:nas.private_key')} value={nasPrivateKey} onChange={e => setNasPrivateKey(e.target.value)} placeholder={t('keep_current_hint')} helpText={t('common:nas.private_key_hint')} />
            )}
            <Input label={t('path')} value={nasPath} onChange={e => setNasPath(e.target.value)} required />
            <div className="border border-[var(--border-default)] p-3">
              <NASTargetForm value={nasPower} onChange={setNasPower} sshHost={nasHost} sshUsername={nasUser} sshPassword={nasPass} sshPrivateKey={nasPrivateKey} />
            </div>
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
      onConfirm={() => { setConfirmClose(false); onClose() }}
      onCancel={() => setConfirmClose(false)}
      title={t('common:unsaved_changes_title')}
      message={t('common:unsaved_changes')}
      confirmText={t('common:buttons.discard')}
      variant="warning"
    />
    </>
  )
}
