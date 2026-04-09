import { useTranslation } from 'react-i18next'
import { Input } from '../../../common/Input'
import { Select } from '../../../common/Select'
import { NASSetupHint } from '../../NASSetupHint'
import type { TargetWizardState } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
  passwordPlaceholder?: string
}

export function StepNASConnection({ state, update, passwordPlaceholder }: Props) {
  const { t } = useTranslation('targets')

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_nas_connection_desc')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input
            label={t('host')}
            value={state.nasHost}
            onChange={e => update('nasHost', e.target.value)}
            required
            autoFocus
          />
        </div>
        <Input
          label={t('port')}
          type="number"
          value={state.nasPort}
          onChange={e => update('nasPort', Number(e.target.value))}
        />
      </div>

      <Input
        label={t('common:nas.username')}
        value={state.nasUser}
        onChange={e => update('nasUser', e.target.value)}
        required
      />

      <Input
        label={t('common:nas.password')}
        type="password"
        value={state.nasPass}
        onChange={e => update('nasPass', e.target.value)}
        placeholder={passwordPlaceholder ?? t('common:nas.password_placeholder')}
      />

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
        value={state.nasType}
        onChange={e => update('nasType', e.target.value)}
      />

      <NASSetupHint nasType={state.nasType} />
    </div>
  )
}
