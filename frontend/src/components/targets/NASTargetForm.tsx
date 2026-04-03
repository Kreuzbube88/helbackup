import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { api } from '../../api'

export interface NASPowerConfig {
  enabled: boolean
  mac: string
  ip: string
  ssh: {
    username: string
    password?: string
    privateKey?: string
  }
  autoShutdown: boolean
}

interface Props {
  value: NASPowerConfig
  onChange: (value: NASPowerConfig) => void
}

export function NASTargetForm({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [wolTesting, setWolTesting] = useState(false)
  const [sshTesting, setSSHTesting] = useState(false)
  const [wolResult, setWolResult] = useState<boolean | null>(null)
  const [sshResult, setSSHResult] = useState<boolean | null>(null)

  const handleTestWoL = async () => {
    setWolTesting(true)
    setWolResult(null)
    try {
      const res = await api.nas.testWake(value.mac, value.ip || undefined)
      setWolResult(res.success)
    } catch {
      setWolResult(false)
    } finally {
      setWolTesting(false)
    }
  }

  const handleTestSSH = async () => {
    setSSHTesting(true)
    setSSHResult(null)
    try {
      const res = await api.nas.testSSH(
        value.ip,
        undefined,
        value.ssh.username,
        value.ssh.password,
        value.ssh.privateKey
      )
      setSSHResult(res.success)
    } catch {
      setSSHResult(false)
    } finally {
      setSSHTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          id="nas-power-enabled"
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="nas-power-enabled" className="font-medium text-sm cursor-pointer">
          {t('nas.enable_power_management')}
        </label>
      </div>

      {value.enabled && (
        <>
          <div className="border border-[var(--border-default)] p-4 space-y-3">
            <h4 className="font-bold text-sm">{t('nas.wake_on_lan')}</h4>
            <Input
              label={t('nas.mac_address')}
              value={value.mac}
              onChange={(e) => onChange({ ...value, mac: e.target.value })}
              placeholder="00:11:22:33:44:55"
            />
            <Input
              label={t('nas.ip_address')}
              value={value.ip}
              onChange={(e) => onChange({ ...value, ip: e.target.value })}
              placeholder="192.168.1.100"
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleTestWoL} loading={wolTesting}>
                {t('nas.test_wol')}
              </Button>
              {wolResult !== null && (
                <span className={wolResult ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                  {wolResult ? t('nas.wol_sent') : t('nas.wol_failed')}
                </span>
              )}
            </div>
          </div>

          <div className="border border-[var(--border-default)] p-4 space-y-3">
            <h4 className="font-bold text-sm">{t('nas.ssh_config')}</h4>
            <Input
              label={t('nas.username')}
              value={value.ssh.username}
              onChange={(e) => onChange({ ...value, ssh: { ...value.ssh, username: e.target.value } })}
              placeholder="admin"
            />
            <Input
              label={t('nas.password')}
              type="password"
              value={value.ssh.password ?? ''}
              onChange={(e) => onChange({ ...value, ssh: { ...value.ssh, password: e.target.value } })}
              placeholder={t('nas.password_placeholder')}
            />
            <p className="text-xs text-[var(--text-muted)]">{t('nas.ssh_key_hint')}</p>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleTestSSH} loading={sshTesting}>
                {t('nas.test_ssh')}
              </Button>
              {sshResult !== null && (
                <span className={sshResult ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                  {sshResult ? t('nas.ssh_ok') : t('nas.ssh_failed')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="nas-auto-shutdown"
              type="checkbox"
              checked={value.autoShutdown}
              onChange={(e) => onChange({ ...value, autoShutdown: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="nas-auto-shutdown" className="text-sm cursor-pointer">
              {t('nas.auto_shutdown')}
            </label>
          </div>

          <p className="text-xs text-[var(--text-muted)]">{t('nas.supported_systems')}</p>
        </>
      )}
    </div>
  )
}
