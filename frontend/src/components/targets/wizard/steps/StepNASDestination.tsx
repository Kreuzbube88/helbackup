import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../../common/Input'
import { Button } from '../../../common/Button'
import { useToast } from '../../../common/Toast'
import { api } from '../../../../api'
import type { TargetWizardState } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
  privateKeyPlaceholder?: string
}

export function StepNASDestination({ state, update, privateKeyPlaceholder }: Props) {
  const { t } = useTranslation('targets')
  const { toast } = useToast()
  const [advancedOpen, setAdvancedOpen] = useState(state.nasPrivateKey !== '' || state.nasKnownHostsFile !== '')
  const [sshKeyLoading, setSshKeyLoading] = useState(false)

  async function handleSetupSshKey() {
    setSshKeyLoading(true)
    try {
      const result = await api.nas.setupSshKey(state.nasHost, state.nasPort, state.nasUser, state.nasPass)
      update('nasPrivateKey', result.privateKeyPath)
      toast(t('common:nas.ssh_key_deployed'), 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common:nas.ssh_key_error'), 'error')
    } finally {
      setSshKeyLoading(false)
    }
  }

  const canDeployKey = state.nasHost.trim() !== '' && state.nasUser.trim() !== '' && state.nasPass.trim() !== ''

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_nas_destination_desc')}</p>

      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          loading={sshKeyLoading}
          disabled={!canDeployKey}
          onClick={handleSetupSshKey}
        >
          {t('common:nas.setup_ssh_key')}
        </Button>
        {!canDeployKey && (
          <p className="text-xs text-[var(--text-muted)]">{t('wizard.ssh_key_needs_password')}</p>
        )}
        {state.nasPrivateKey && (
          <p className="text-xs text-green-400 font-mono break-all">{state.nasPrivateKey}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen(v => !v)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-left"
      >
        {advancedOpen ? '▾' : '▸'} {t('common:advanced')}
      </button>
      {advancedOpen && (
        <div className="space-y-3">
          <Input
            label={t('common:nas.private_key')}
            value={state.nasPrivateKey}
            onChange={e => update('nasPrivateKey', e.target.value)}
            placeholder={privateKeyPlaceholder ?? t('common:nas.private_key_placeholder')}
            helpText={t('common:nas.private_key_hint')}
          />
          <Input
            label={t('wizard.known_hosts_file')}
            value={state.nasKnownHostsFile}
            onChange={e => update('nasKnownHostsFile', e.target.value)}
            placeholder="/app/config/ssh/known_hosts_mynas"
            helpText={t('wizard.known_hosts_file_hint')}
          />
        </div>
      )}

      <Input
        label={t('remote_path')}
        value={state.nasPath}
        onChange={e => update('nasPath', e.target.value)}
        required
      />
    </div>
  )
}
