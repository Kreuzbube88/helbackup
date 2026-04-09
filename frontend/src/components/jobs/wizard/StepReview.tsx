import { useTranslation } from 'react-i18next'
import { Calendar, Zap, Lock, Unlock, Clock } from 'lucide-react'
import type { BasicInfo } from './StepBasicInfo'
import { type BackupStepsConfig, type StepType, TYPE_META, TYPE_ORDER } from './StepBackupTypes'
import type { HooksValue } from './StepHooks'
import type { Target } from '../../../api'
import type { AppdataStepConfig } from './config/AppdataConfig'
import type { VMStepConfig } from './config/VMConfig'
import type { DockerImagesStepConfig } from './config/DockerImagesConfig'
import type { SystemConfigStepConfig } from './config/SystemConfigForm'
import type { CustomStepConfig } from './config/CustomConfig'

interface Props {
  basicInfo: BasicInfo
  backupSteps: BackupStepsConfig
  hooks: HooksValue
  targets: Target[]
}

function truncList(items: string[], limit = 5): string {
  if (items.length === 0) return '—'
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')} …+${items.length - limit}`
}

export function StepReview({ basicInfo, backupSteps, hooks, targets }: Props) {
  const { t } = useTranslation('jobs')

  const findTarget = (id: string): string => targets.find(t => t.id === id)?.name ?? id

  const active = TYPE_ORDER.filter(type => backupSteps[type] !== null)

  const renderDetails = (type: StepType) => {
    const cfg = backupSteps[type]
    if (!cfg) return null
    switch (type) {
      case 'flash':
        return <p className="text-xs text-[var(--text-muted)]">/boot → {findTarget(cfg.targetId)}</p>
      case 'appdata': {
        const c = cfg as AppdataStepConfig
        return (
          <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
            <p>{c.containers.length} {t('containers')}: {truncList(c.containers)}</p>
            <p>{t('wizard_backup_method')}: <span className="font-mono">{c.method}</span></p>
            {c.useDatabaseDumps && <p>✓ {t('use_database_dumps')}</p>}
          </div>
        )
      }
      case 'vms': {
        const c = cfg as VMStepConfig
        return (
          <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
            <p>{c.vms.length} VMs: {truncList(c.vms)}</p>
            {c.includeDisks && <p>✓ {t('include_vm_disks')}</p>}
          </div>
        )
      }
      case 'docker_images': {
        const c = cfg as DockerImagesStepConfig
        return <p className="text-xs text-[var(--text-muted)]">{c.images.length}: {truncList(c.images)}</p>
      }
      case 'system_config': {
        const c = cfg as SystemConfigStepConfig
        return <p className="text-xs text-[var(--text-muted)]">{truncList(c.includeItems)}</p>
      }
      case 'custom': {
        const c = cfg as CustomStepConfig
        return (
          <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
            <p className="font-mono break-all">{c.sourcePath}</p>
            {c.excludePatterns.length > 0 && <p>exclude: {c.excludePatterns.join(', ')}</p>}
          </div>
        )
      }
      case 'helbackup_self':
        return <p className="text-xs text-[var(--text-muted)]">HELBACKUP → {findTarget(cfg.targetId)}</p>
    }
  }

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
              <span className="text-xs font-mono text-[var(--text-muted)] break-all">{basicInfo.schedule}</span>
            </>
          ) : (
            <>
              <Zap size={11} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">{t('manual')}</span>
            </>
          )}
        </div>
      </div>

      {/* Per-type cards */}
      {active.map(type => {
        const cfg = backupSteps[type]!
        const meta = TYPE_META[type]
        return (
          <div key={type} className="border border-[var(--border-default)] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[var(--theme-accent)]">{meta.icon}</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">{t(meta.labelKey)}</p>
              <span className="text-xs text-[var(--text-muted)]">→ {findTarget(cfg.targetId)}</span>
            </div>
            {renderDetails(type)}
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pt-1">
              {cfg.useEncryption ? (
                <span className="flex items-center gap-1"><Lock size={11} /> {t('encrypt_backup')}</span>
              ) : (
                <span className="flex items-center gap-1"><Unlock size={11} /> {t('no_encryption')}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {typeof cfg.retentionDays === 'number' && cfg.retentionDays > 0
                  ? `${cfg.retentionDays}d · min ${cfg.retentionMinimum}`
                  : t('retention_none')}
              </span>
            </div>
          </div>
        )
      })}

      {active.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">{t('wizard_no_steps')}</p>
      )}

      {/* Hooks */}
      {(hooks.preBackupScript || hooks.postBackupScript) && (
        <div className="border border-[var(--border-default)] p-3">
          <p className="text-xs font-mono text-[var(--text-muted)] uppercase mb-2">{t('hooks')}</p>
          <div className="space-y-0.5 text-xs text-[var(--text-muted)]">
            {hooks.preBackupScript && <p>✓ {t('pre_hook')}: <span className="font-mono break-all">{hooks.preBackupScript}</span></p>}
            {hooks.postBackupScript && <p>✓ {t('post_hook')}: <span className="font-mono break-all">{hooks.postBackupScript}</span></p>}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)] italic">{t('checksums_always_on_note')}</p>
    </div>
  )
}
