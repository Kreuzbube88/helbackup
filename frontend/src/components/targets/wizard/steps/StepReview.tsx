import { useTranslation } from 'react-i18next'
import type { TargetWizardState } from '../useTargetWizardState'

interface Props {
  state: TargetWizardState
}

export function StepReview({ state }: Props) {
  const { t } = useTranslation('targets')

  const rows: Array<{ section: string; items: Array<{ label: string; value: string }> }> = []

  rows.push({
    section: t('wizard.review_section_general'),
    items: [
      { label: t('name'), value: state.name },
      { label: t('type'), value: state.type === 'local' ? t('type_local') : t('type_nas') },
      { label: t('enabled'), value: state.enabled ? '✓' : '—' },
    ],
  })

  if (state.type === 'local') {
    rows.push({
      section: t('wizard.review_section_destination'),
      items: [{ label: t('path'), value: state.localPath }],
    })
  } else {
    rows.push({
      section: t('wizard.review_section_connection'),
      items: [
        { label: t('host'), value: state.nasHost },
        { label: t('port'), value: String(state.nasPort) },
        { label: t('common:nas.username'), value: state.nasUser },
        { label: t('common:nas.password'), value: state.nasPass ? '••••••' : '—' },
        ...(state.nasType ? [{ label: t('common:nas.type_label'), value: state.nasType }] : []),
      ],
    })
    rows.push({
      section: t('wizard.review_section_auth'),
      items: [
        { label: t('common:nas.private_key'), value: state.nasPrivateKey || '—' },
        { label: t('remote_path'), value: state.nasPath },
      ],
    })
    rows.push({
      section: t('wizard.review_section_power'),
      items: state.nasPower.enabled
        ? [
            { label: t('common:nas.mac_address'), value: state.nasPower.mac },
            { label: t('common:nas.ip_address'), value: state.nasPower.ip || '—' },
            { label: t('common:nas.auto_shutdown'), value: state.nasPower.autoShutdown ? '✓' : '—' },
          ]
        : [{ label: t('wizard.power_disabled'), value: '—' }],
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_review_desc')}</p>
      {rows.map(row => (
        <div key={row.section} className="border border-[var(--border-default)]">
          <div className="px-4 py-2 bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            {row.section}
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {row.items.map(item => (
              <div key={item.label} className="flex justify-between items-center px-4 py-2">
                <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                <span className="text-sm text-[var(--text-primary)] font-mono break-all text-right ml-3">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
