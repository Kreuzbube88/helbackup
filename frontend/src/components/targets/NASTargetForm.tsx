import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { api } from '../../api'

export interface NASPowerConfig {
  enabled: boolean
  mac: string
  ip: string
  autoShutdown: boolean
}

interface Props {
  value: NASPowerConfig
  onChange: (value: NASPowerConfig) => void
  sshHost: string
  sshUsername: string
  sshPassword: string
}

export function NASTargetForm({ value, onChange, sshHost, sshUsername, sshPassword }: Props) {
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
      // Use power IP if set (WOL target), fall back to main SSH host
      const host = value.ip || sshHost
      const res = await api.nas.testSSH(host, undefined, sshUsername, sshPassword || undefined)
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={handleTestWoL} loading={wolTesting}>
                {t('nas.test_wol')}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleTestSSH} loading={sshTesting} disabled={!sshUsername}>
                {t('nas.test_ssh')}
              </Button>
              {wolResult !== null && (
                <span className={wolResult ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                  {wolResult ? t('nas.wol_sent') : t('nas.wol_failed')}
                </span>
              )}
              {sshResult !== null && (
                <span className={sshResult ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                  {sshResult ? t('nas.ssh_ok') : t('nas.ssh_failed')}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('nas.ssh_uses_main_credentials')}</p>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                id="nas-auto-shutdown"
                type="checkbox"
                checked={value.autoShutdown}
                onChange={(e) => onChange({ ...value, autoShutdown: e.target.checked })}
                className="w-4 h-4"
              />
              {t('nas.auto_shutdown')}
            </label>
            <p className="text-xs text-[var(--text-muted)]">{t('nas.supported_systems')}</p>
          </div>
        </>
      )}
    </div>
  )
}
