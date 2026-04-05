import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { ConfirmModal } from '../common/ConfirmModal'
import { useToast } from '../common/Toast'
import { api, type Job, type Target } from '../../api'
import { StepBasicInfo, type BasicInfo } from './wizard/StepBasicInfo'
import { StepBackupTypes, type BackupStepsConfig } from './wizard/StepBackupTypes'
import { StepAdvanced } from './wizard/StepAdvanced'
import { StepReview } from './wizard/StepReview'
import type { AdvancedSettingsValue } from './AdvancedSettings'
import type { ToolSelection } from '../tools/ToolSelector'

interface Props {
  job?: Job | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type WizardStep = 1 | 2 | 3 | 4

const DEFAULT_BASIC: BasicInfo = { name: '', schedule: null, enabled: true }

const DEFAULT_STEPS: BackupStepsConfig = {
  flash: null,
  appdata: null,
  vms: null,
  docker_images: null,
  system_config: null,
  cloud: null,
}

const DEFAULT_TOOLS: ToolSelection = {
  flash: 'rsync',
  appdata: 'rsync',
  vms: 'rsync',
  cloud: 'rclone',
}

const DEFAULT_ADVANCED: AdvancedSettingsValue = {
  useDatabaseDumps: false,
  verifyChecksums: true,
  retentionDays: undefined,
  retentionMinimum: 3,
  preBackupScript: undefined,
  postBackupScript: undefined,
  useEncryption: false,
}

function crypto_uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function buildSteps(backupSteps: BackupStepsConfig, advanced: AdvancedSettingsValue, tools: ToolSelection): unknown[] {
  const steps: unknown[] = []

  if (backupSteps.flash) {
    steps.push({
      id: crypto_uuid(), type: 'flash',
      config: {
        source: '/unraid/boot',
        targetId: backupSteps.flash.targetId,
        useEncryption: advanced.useEncryption || backupSteps.flash.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    })
  }

  if (backupSteps.appdata) {
    steps.push({
      id: crypto_uuid(), type: 'appdata',
      config: {
        source: '/unraid/user/appdata',
        targetId: backupSteps.appdata.targetId,
        containers: backupSteps.appdata.containers,
        stopContainers: backupSteps.appdata.stopContainers,
        method: tools.appdata,
        useDatabaseDumps: advanced.useDatabaseDumps || backupSteps.appdata.useDatabaseDumps,
        useEncryption: advanced.useEncryption || backupSteps.appdata.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    })
  }

  if (backupSteps.vms) {
    steps.push({
      id: crypto_uuid(), type: 'vms',
      config: {
        vms: backupSteps.vms.vms,
        destination: '/backups/vms',
        targetId: backupSteps.vms.targetId,
        includeDisks: backupSteps.vms.includeDisks,
        useEncryption: advanced.useEncryption || backupSteps.vms.useEncryption,
      },
      retry: { max_attempts: 1, backoff: 'linear' },
    })
  }

  if (backupSteps.docker_images) {
    steps.push({
      id: crypto_uuid(), type: 'docker_images',
      config: {
        images: backupSteps.docker_images.images,
        destination: '/backups/docker-images',
        targetId: backupSteps.docker_images.targetId,
        useEncryption: advanced.useEncryption || backupSteps.docker_images.useEncryption,
      },
      retry: { max_attempts: 1, backoff: 'linear' },
    })
  }

  if (backupSteps.system_config) {
    steps.push({
      id: crypto_uuid(), type: 'system_config',
      config: {
        destination: '/backups/system-config',
        targetId: backupSteps.system_config.targetId,
        includeItems: backupSteps.system_config.includeItems,
        useEncryption: advanced.useEncryption || backupSteps.system_config.useEncryption,
      },
      retry: { max_attempts: 2, backoff: 'linear' },
    })
  }

  if (backupSteps.cloud) {
    steps.push({
      id: crypto_uuid(), type: 'cloud',
      config: {
        source: backupSteps.cloud.sourcePath,
        remote: backupSteps.cloud.targetId,
        destination: 'cloud-backup',
        useEncryption: advanced.useEncryption || backupSteps.cloud.useEncryption,
      },
      retry: { max_attempts: 3, backoff: 'exponential' },
    })
  }

  return steps
}

export function JobWizard({ job, open, onClose, onSuccess }: Props) {
  const { t } = useTranslation('jobs')
  const { toast } = useToast()
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(DEFAULT_BASIC)
  const [backupSteps, setBackupSteps] = useState<BackupStepsConfig>(DEFAULT_STEPS)
  const [advanced, setAdvanced] = useState<AdvancedSettingsValue>(DEFAULT_ADVANCED)
  const [tools, setTools] = useState<ToolSelection>(DEFAULT_TOOLS)
  const [confirmClose, setConfirmClose] = useState(false)

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
      // Reconstruct step configs from existing job steps
      const steps = (job.steps ?? []) as Array<{ type: string; config: Record<string, unknown> }>
      const newBackupSteps = { ...DEFAULT_STEPS }
      for (const s of steps) {
        if (s.type === 'flash') {
          newBackupSteps.flash = { targetId: (s.config.targetId as string) ?? '', useEncryption: (s.config.useEncryption as boolean) ?? false }
        } else if (s.type === 'appdata') {
          if (s.config.method) {
            setTools(prev => ({ ...prev, appdata: (s.config.method as 'tar' | 'rsync') }))
          }
          newBackupSteps.appdata = {
            targetId: (s.config.targetId as string) ?? '',
            containers: (s.config.containers as string[]) ?? [],
            stopContainers: (s.config.stopContainers as boolean) ?? true,
            useDatabaseDumps: (s.config.useDatabaseDumps as boolean) ?? false,
            useEncryption: (s.config.useEncryption as boolean) ?? false,
          }
        } else if (s.type === 'vms') {
          newBackupSteps.vms = {
            targetId: (s.config.targetId as string) ?? '',
            vms: (s.config.vms as string[]) ?? [],
            includeDisks: (s.config.includeDisks as boolean) ?? false,
            useEncryption: (s.config.useEncryption as boolean) ?? false,
          }
        } else if (s.type === 'docker_images') {
          newBackupSteps.docker_images = {
            targetId: (s.config.targetId as string) ?? '',
            images: (s.config.images as string[]) ?? [],
            useEncryption: (s.config.useEncryption as boolean) ?? false,
          }
        } else if (s.type === 'system_config') {
          newBackupSteps.system_config = {
            targetId: (s.config.targetId as string) ?? '',
            includeItems: (s.config.includeItems as string[]) ?? [],
            useEncryption: (s.config.useEncryption as boolean) ?? false,
          }
        } else if (s.type === 'cloud') {
          newBackupSteps.cloud = {
            targetId: (s.config.remote as string) ?? '',
            sourcePath: (s.config.source as string) ?? '',
            useEncryption: (s.config.useEncryption as boolean) ?? false,
          }
        }
      }
      setBackupSteps(newBackupSteps)
    } else {
      setBasicInfo(DEFAULT_BASIC)
      setBackupSteps(DEFAULT_STEPS)
      setAdvanced(DEFAULT_ADVANCED)
      setTools(DEFAULT_TOOLS)
    }
    setStep(1)
  }, [open, job])

  async function handleSave() {
    if (!basicInfo.name.trim()) return
    setLoading(true)
    try {
      const steps = buildSteps(backupSteps, advanced, tools)
      if (job) {
        await api.jobs.update(job.id, {
          name: basicInfo.name.trim(),
          schedule: basicInfo.schedule,
          enabled: basicInfo.enabled,
          steps,
        })
        toast(t('updated'), 'success')
      } else {
        await api.jobs.create({
          name: basicInfo.name.trim(),
          ...(basicInfo.schedule ? { schedule: basicInfo.schedule } : {}),
          enabled: basicInfo.enabled,
          steps,
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

  const STEP_LABELS = [
    t('wizard_step_basic'),
    t('wizard_step_backup'),
    t('wizard_step_advanced'),
    t('wizard_step_review'),
  ]

  const title = job ? t('edit') : t('create_new')

  return (
    <Modal open={open} onClose={handleClose} title={title} className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <button
              type="button"
              className={[
                'flex items-center gap-1.5 text-xs py-1 px-2 transition-colors',
                step === i + 1
                  ? 'text-[var(--theme-accent)] font-medium'
                  : step > i + 1
                    ? 'text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]',
              ].join(' ')}
              onClick={() => step > i + 1 && setStep((i + 1) as WizardStep)}
              disabled={step <= i + 1}
            >
              <span className={[
                'w-4 h-4 rounded-full text-[10px] flex items-center justify-center',
                step === i + 1 ? 'bg-[var(--theme-accent)] text-black' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
              ].join(' ')}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < 3 && <div className="flex-1 h-px bg-[var(--border-default)]" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[300px] overflow-y-auto max-h-[60vh]">
        {step === 1 && <StepBasicInfo value={basicInfo} onChange={setBasicInfo} />}
        {step === 2 && <StepBackupTypes value={backupSteps} onChange={setBackupSteps} targets={targets} />}
        {step === 3 && <StepAdvanced value={advanced} onChange={setAdvanced} tools={tools} onToolsChange={setTools} />}
        {step === 4 && <StepReview basicInfo={basicInfo} backupSteps={backupSteps} advanced={advanced} targets={targets} />}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => step > 1 ? setStep((step - 1) as WizardStep) : handleClose()}
        >
          {step > 1 ? t('common:buttons.back') : t('common:buttons.cancel')}
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button
              type="button"
              variant="primary"
              disabled={(() => {
                if (step === 1) return !basicInfo.name.trim()
                if (step === 2) {
                  const enabled = Object.values(backupSteps).filter(v => v !== null) as Array<{ targetId: string }>
                  return enabled.length === 0 || enabled.some(v => !v.targetId)
                }
                return false
              })()}
              onClick={() => setStep((step + 1) as WizardStep)}
            >
              {t('common:buttons.next')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              loading={loading}
              disabled={!basicInfo.name.trim()}
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
  )
}
