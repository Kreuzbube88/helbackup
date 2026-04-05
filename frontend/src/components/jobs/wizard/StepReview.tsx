import { useTranslation } from 'react-i18next'
import { HardDrive, FolderOpen, Monitor, Container, Settings, Cloud, Calendar, Zap } from 'lucide-react'
import type { BasicInfo } from './StepBasicInfo'
import type { BackupStepsConfig } from './StepBackupTypes'
import type { AdvancedSettingsValue } from '../AdvancedSettings'
import type { Target } from '../../../api'

interface Props {
  basicInfo: BasicInfo
  backupSteps: BackupStepsConfig
  advanced: AdvancedSettingsValue
  targets: Target[]
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  flash: <HardDrive size={14} />,
  appdata: <FolderOpen size={14} />,
  vms: <Monitor size={14} />,
  docker_images: <Container size={14} />,
  system_config: <Settings size={14} />,
  cloud: <Cloud size={14} />,
}

export function StepReview({ basicInfo, backupSteps, advanced, targets }: Props) {
  const { t } = useTranslation('jobs')

  const findTarget = (id: string) => targets.find(t => t.id === id)?.name ?? id

  const activeSteps = (Object.entries(backupSteps) as [string, unknown][]).filter(([, cfg]) => cfg !== null)

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="border border-[var(--border-default)] p-3">
        <p className="text-xs font-mono text-[var(--text-muted)] uppercase mb-2">{t('wizard_step_basic')}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{basicInfo.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {basicInfo.schedule ? (
            <>
              <Calendar size={11} className="text-[var(--text-muted)]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">{basicInfo.schedule}</span>
            </>
          ) : (
            <>
              <Zap size={11} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">{t('manual')}</span>
            </>
          )}
        </div>
      </div>

      {/* Backup steps */}
      <div className="border border-[var(--border-default)] p-3">
        <p className="text-xs font-mono text-[var(--text-muted)] uppercase mb-2">{t('wizard_step_backup')} ({activeSteps.length})</p>
        {activeSteps.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">{t('wizard_no_steps')}</p>
        ) : (
          <div className="space-y-1.5">
            {activeSteps.map(([type, cfg]) => {
              const config = cfg as Record<string, unknown>
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--theme-accent)]">{TYPE_ICONS[type]}</span>
                  <span className="text-[var(--text-primary)] capitalize">{type.replace('_', ' ')}</span>
                  {typeof config.targetId === 'string' && config.targetId && (
                    <span className="text-[var(--text-muted)]">→ {findTarget(config.targetId)}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Advanced */}
      <div className="border border-[var(--border-default)] p-3">
        <p className="text-xs font-mono text-[var(--text-muted)] uppercase mb-2">{t('wizard_step_advanced')}</p>
        <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
          {advanced.verifyChecksums && <p>✓ {t('verify_checksums')}</p>}
          {advanced.useDatabaseDumps && <p>✓ {t('use_database_dumps')}</p>}
          {advanced.useEncryption && <p>✓ {t('encrypt_backup')}</p>}
          {advanced.retentionDays && <p>✓ {t('delete_older_than_days')}: {advanced.retentionDays}d</p>}
          {advanced.preBackupScript && <p>✓ Pre: {advanced.preBackupScript}</p>}
          {advanced.postBackupScript && <p>✓ Post: {advanced.postBackupScript}</p>}
        </div>
      </div>
    </div>
  )
}
