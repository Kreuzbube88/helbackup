import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { ConfirmModal } from '../common/ConfirmModal'
import { useToast } from '../common/Toast'
import { api, type Job, type Target } from '../../api'
import { StepBasicInfo, type BasicInfo } from './wizard/StepBasicInfo'
import {
  StepBackupTypes,
  type BackupStepsConfig,
  type StepType,
  TYPE_ORDER,
  TYPE_META,
  DEFAULT_CONFIGS,
} from './wizard/StepBackupTypes'
import { StepHooks, type HooksValue } from './wizard/StepHooks'
import { StepReview } from './wizard/StepReview'
import { FlashConfig } from './wizard/config/FlashConfig'
import { AppdataConfig, type AppdataStepConfig } from './wizard/config/AppdataConfig'
import { VMConfig } from './wizard/config/VMConfig'
import { DockerImagesConfig } from './wizard/config/DockerImagesConfig'
import { SystemConfigForm } from './wizard/config/SystemConfigForm'
import { CustomConfig } from './wizard/config/CustomConfig'
import { HELBACKUPSelfConfig } from './wizard/config/HELBACKUPSelfConfig'
import { isStepValid, type StepId, type WizardState } from './wizard/validation'
import { cryptoUUID } from '../../utils/format'

interface Props {
  job?: Job | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_BASIC: BasicInfo = { name: '', schedule: null, enabled: true }

const DEFAULT_STEPS: BackupStepsConfig = {
  flash: null, appdata: null, vms: null, docker_images: null,
  system_config: null, custom: null, helbackup_self: null,
}

const DEFAULT_HOOKS: HooksValue = { preBackupScript: undefined, postBackupScript: undefined }

function buildSteps(backupSteps: BackupStepsConfig): unknown[] {
  const out: unknown[] = []

  const pushWithRetention = (step: Record<string, unknown>, cfg: { retentionDays?: number; retentionMinimum: number }) => {
    if (typeof cfg.retentionDays === 'number' && cfg.retentionDays > 0) {
      step.config = {
        ...(step.config as Record<string, unknown>),
        retentionDays: cfg.retentionDays,
        retentionMinimum: cfg.retentionMinimum,
      }
    }
    out.push(step)
  }

  if (backupSteps.flash) {
    const f = backupSteps.flash
    pushWithRetention({
      id: cryptoUUID(), type: 'flash',
      config: {
        source: '/unraid/boot',
        targetId: f.targetId,
        useEncryption: f.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    }, f)
  }

  if (backupSteps.appdata) {
    const a = backupSteps.appdata
    pushWithRetention({
      id: cryptoUUID(), type: 'appdata',
      config: {
        source: '/unraid/user/appdata',
        targetId: a.targetId,
        containers: a.containers,
        stopContainers: a.stopContainers,
        stopOrder: a.stopOrder.length > 0 ? a.stopOrder : a.containers,
        stopDelay: a.stopDelay,
        restartDelay: a.restartDelay,
        method: a.method,
        useDatabaseDumps: a.useDatabaseDumps,
        databaseContainers: a.useDatabaseDumps ? a.containers : [],
        useEncryption: a.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    }, a)
  }

  if (backupSteps.vms) {
    const v = backupSteps.vms
    pushWithRetention({
      id: cryptoUUID(), type: 'vms',
      config: {
        vms: v.vms,
        destination: '/backups/vms',
        targetId: v.targetId,
        includeDisks: v.includeDisks,
        useEncryption: v.useEncryption,
      },
      retry: { max_attempts: 1, backoff: 'linear' },
    }, v)
  }

  if (backupSteps.docker_images) {
    const d = backupSteps.docker_images
    pushWithRetention({
      id: cryptoUUID(), type: 'docker_images',
      config: {
        images: d.images,
        destination: '/backups/docker-images',
        targetId: d.targetId,
        useEncryption: d.useEncryption,
      },
      retry: { max_attempts: 1, backoff: 'linear' },
    }, d)
  }

  if (backupSteps.system_config) {
    const s = backupSteps.system_config
    pushWithRetention({
      id: cryptoUUID(), type: 'system_config',
      config: {
        destination: '/backups/system-config',
        targetId: s.targetId,
        includeItems: s.includeItems,
        useEncryption: s.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    }, s)
  }

  if (backupSteps.custom) {
    const c = backupSteps.custom
    pushWithRetention({
      id: cryptoUUID(), type: 'custom',
      config: {
        sourcePath: c.sourcePath,
        targetId: c.targetId,
        excludePatterns: c.excludePatterns,
        useEncryption: c.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    }, c)
  }

  if (backupSteps.helbackup_self) {
    const h = backupSteps.helbackup_self
    pushWithRetention({
      id: cryptoUUID(), type: 'helbackup_self',
      config: {
        targetId: h.targetId,
        useEncryption: h.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    }, h)
  }

  return out
}

export function JobWizard({ job, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('jobs')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(DEFAULT_BASIC)
  const [backupSteps, setBackupSteps] = useState<BackupStepsConfig>(DEFAULT_STEPS)
  const [hooks, setHooks] = useState<HooksValue>(DEFAULT_HOOKS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [confirmClose, setConfirmClose] = useState(false)

  // Dynamic step list
  const steps = useMemo<StepId[]>(() => {
    return [
      { kind: 'basic' },
      { kind: 'types' },
      ...TYPE_ORDER.filter(type => backupSteps[type] !== null).map(type => ({ kind: 'type' as const, type })),
      { kind: 'hooks' },
      { kind: 'review' },
    ]
  }, [backupSteps])

  // Clamp currentIndex when steps list shrinks
  useEffect(() => {
    if (currentIndex > steps.length - 1) setCurrentIndex(steps.length - 1)
  }, [steps.length, currentIndex])

  const state: WizardState = { basicInfo, backupSteps }
  const currentStep = steps[currentIndex]
  const isDirty = basicInfo.name.trim() !== '' || Object.values(backupSteps).some(v => v !== null)

  const handleClose = () => {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  useEffect(() => {
    if (!open) return
    api.targets.getAll().then(setTargets).catch(() => { /* non-critical */ })

    if (job) {
      setBasicInfo({ name: job.name, schedule: job.schedule, enabled: job.enabled })
      const jobSteps = (job.steps ?? []) as Array<{ type: string; config: Record<string, unknown> }>
      const newBackupSteps: BackupStepsConfig = { ...DEFAULT_STEPS }

      const readRetention = (c: Record<string, unknown>): { retentionDays?: number; retentionMinimum: number } => ({
        retentionDays: typeof c.retentionDays === 'number' ? c.retentionDays : undefined,
        retentionMinimum: typeof c.retentionMinimum === 'number' ? c.retentionMinimum : 3,
      })

      for (const s of jobSteps) {
        const c = s.config
        const enc = c.useEncryption === true
        if (s.type === 'flash') {
          newBackupSteps.flash = {
            ...DEFAULT_CONFIGS.flash,
            targetId: (c.targetId as string) ?? '',
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'appdata') {
          const method: AppdataStepConfig['method'] = c.method === 'tar' ? 'tar' : 'rsync'
          newBackupSteps.appdata = {
            ...DEFAULT_CONFIGS.appdata,
            targetId: (c.targetId as string) ?? '',
            containers: (c.containers as string[]) ?? [],
            stopContainers: (c.stopContainers as boolean) ?? true,
            stopOrder: (c.stopOrder as string[]) ?? (c.containers as string[]) ?? [],
            stopDelay: typeof c.stopDelay === 'number' ? c.stopDelay : 10,
            restartDelay: typeof c.restartDelay === 'number' ? c.restartDelay : 5,
            method,
            useDatabaseDumps: c.useDatabaseDumps === true,
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'vms') {
          newBackupSteps.vms = {
            ...DEFAULT_CONFIGS.vms,
            targetId: (c.targetId as string) ?? '',
            vms: (c.vms as string[]) ?? [],
            includeDisks: (c.includeDisks as boolean) ?? false,
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'docker_images') {
          newBackupSteps.docker_images = {
            ...DEFAULT_CONFIGS.docker_images,
            targetId: (c.targetId as string) ?? '',
            images: (c.images as string[]) ?? [],
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'system_config') {
          newBackupSteps.system_config = {
            ...DEFAULT_CONFIGS.system_config,
            targetId: (c.targetId as string) ?? '',
            includeItems: (c.includeItems as string[]) ?? [],
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'custom') {
          newBackupSteps.custom = {
            ...DEFAULT_CONFIGS.custom,
            sourcePath: (c.sourcePath as string) ?? '',
            targetId: (c.targetId as string) ?? '',
            excludePatterns: (c.excludePatterns as string[]) ?? [],
            useEncryption: enc,
            ...readRetention(c),
          }
        } else if (s.type === 'helbackup_self') {
          newBackupSteps.helbackup_self = {
            ...DEFAULT_CONFIGS.helbackup_self,
            targetId: (c.targetId as string) ?? '',
            useEncryption: enc,
            ...readRetention(c),
          }
        }
      }
      setBackupSteps(newBackupSteps)
      setHooks({
        preBackupScript: job.pre_backup_script ?? undefined,
        postBackupScript: job.post_backup_script ?? undefined,
      })
    } else {
      setBasicInfo(DEFAULT_BASIC)
      setBackupSteps(DEFAULT_STEPS)
      setHooks(DEFAULT_HOOKS)
    }
    setCurrentIndex(0)
  }, [open, job])

  async function handleSave() {
    if (!basicInfo.name.trim()) return
    setLoading(true)
    try {
      const built = buildSteps(backupSteps)
      if (job) {
        await api.jobs.update(job.id, {
          name: basicInfo.name.trim(),
          schedule: basicInfo.schedule,
          enabled: basicInfo.enabled,
          steps: built,
          preBackupScript: hooks.preBackupScript ?? null,
          postBackupScript: hooks.postBackupScript ?? null,
        })
        toast(t('updated'), 'success')
      } else {
        await api.jobs.create({
          name: basicInfo.name.trim(),
          ...(basicInfo.schedule ? { schedule: basicInfo.schedule } : {}),
          enabled: basicInfo.enabled,
          steps: built,
          ...(hooks.preBackupScript ? { preBackupScript: hooks.preBackupScript } : {}),
          ...(hooks.postBackupScript ? { postBackupScript: hooks.postBackupScript } : {}),
        })
        toast(t('created'), 'success')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : (job ? t('update_error') : t('create_error')), 'error')
    } finally {
      setLoading(false)
    }
  }

  const stepLabel = (s: StepId): string => {
    switch (s.kind) {
      case 'basic': return t('wizard_step_basic')
      case 'types': return t('wizard_step_backup')
      case 'type': return t(TYPE_META[s.type].labelKey)
      case 'hooks': return t('wizard_step_hooks')
      case 'review': return t('wizard_step_review')
    }
  }

  const isLast = currentIndex === steps.length - 1
  const canNext = isStepValid(currentStep, state)
  const allValid = steps.every(s => isStepValid(s, state))

  const title = job ? t('edit') : t('create_new')

  return (
    <>
    <Modal open={open} onClose={handleClose} title={title} className="max-w-[112rem]" disableBackdropClose>
      {/* Step indicator */}
      <div className="flex items-center gap-1 gap-y-1.5 mb-6 flex-wrap">
        {steps.map((s, i) => {
          const isCurrent = i === currentIndex
          const isDone = i < currentIndex
          return (
            <div key={`${s.kind}-${'type' in s ? s.type : i}`} className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                className={[
                  'flex items-center gap-1.5 text-xs py-1 px-2 transition-colors',
                  isCurrent
                    ? 'text-[var(--theme-accent)] font-medium'
                    : isDone
                      ? 'text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]',
                ].join(' ')}
                onClick={() => isDone && setCurrentIndex(i)}
                disabled={!isDone}
              >
                <span className={[
                  'w-4 h-4 rounded-full text-[10px] flex items-center justify-center',
                  isCurrent ? 'bg-[var(--theme-accent)] text-black' : isDone ? 'bg-green-500 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                ].join(' ')}>
                  {isDone ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{stepLabel(s)}</span>
              </button>
              {i < steps.length - 1 && <div className="w-4 h-px bg-[var(--border-default)]" />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[420px] overflow-y-auto overflow-x-hidden max-h-[72vh] min-w-0">
        {currentStep.kind === 'basic' && (
          <StepBasicInfo value={basicInfo} onChange={setBasicInfo} />
        )}
        {currentStep.kind === 'types' && (
          <StepBackupTypes value={backupSteps} onChange={setBackupSteps} />
        )}
        {currentStep.kind === 'type' && (() => {
          const type: StepType = currentStep.type
          if (type === 'flash' && backupSteps.flash) {
            return <FlashConfig value={backupSteps.flash} onChange={cfg => setBackupSteps({ ...backupSteps, flash: cfg })} targets={targets} />
          }
          if (type === 'appdata' && backupSteps.appdata) {
            return <AppdataConfig value={backupSteps.appdata} onChange={cfg => setBackupSteps({ ...backupSteps, appdata: cfg })} targets={targets} />
          }
          if (type === 'vms' && backupSteps.vms) {
            return <VMConfig value={backupSteps.vms} onChange={cfg => setBackupSteps({ ...backupSteps, vms: cfg })} targets={targets} />
          }
          if (type === 'docker_images' && backupSteps.docker_images) {
            return <DockerImagesConfig value={backupSteps.docker_images} onChange={cfg => setBackupSteps({ ...backupSteps, docker_images: cfg })} targets={targets} />
          }
          if (type === 'system_config' && backupSteps.system_config) {
            return <SystemConfigForm value={backupSteps.system_config} onChange={cfg => setBackupSteps({ ...backupSteps, system_config: cfg })} targets={targets} />
          }
          if (type === 'custom' && backupSteps.custom) {
            return <CustomConfig value={backupSteps.custom} onChange={cfg => setBackupSteps({ ...backupSteps, custom: cfg })} targets={targets} />
          }
          if (type === 'helbackup_self' && backupSteps.helbackup_self) {
            return <HELBACKUPSelfConfig value={backupSteps.helbackup_self} onChange={cfg => setBackupSteps({ ...backupSteps, helbackup_self: cfg })} targets={targets} />
          }
          return null
        })()}
        {currentStep.kind === 'hooks' && (
          <StepHooks value={hooks} onChange={setHooks} />
        )}
        {currentStep.kind === 'review' && (
          <StepReview basicInfo={basicInfo} backupSteps={backupSteps} hooks={hooks} targets={targets} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => currentIndex > 0 ? setCurrentIndex(currentIndex - 1) : handleClose()}
        >
          {currentIndex > 0 ? t('common:buttons.back') : t('common:buttons.cancel')}
        </Button>

        <div className="flex gap-2">
          {!isLast ? (
            <Button
              type="button"
              variant="primary"
              disabled={!canNext}
              onClick={() => setCurrentIndex(currentIndex + 1)}
            >
              {t('common:buttons.next')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              loading={loading}
              disabled={!allValid}
              onClick={() => void handleSave()}
            >
              {t('common:buttons.save')}
            </Button>
          )}
        </div>
      </div>
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
