import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { ConfirmModal } from '../common/ConfirmModal'
import { useToast } from '../common/Toast'
import { CronBuilder } from '../jobs/wizard/CronBuilder'
import { api } from '../../api'
import { cryptoUUID } from '../../utils/format'
import { useTargetWizardState } from '../targets/wizard/useTargetWizardState'
import { useTargetWizardSteps } from '../targets/wizard/useTargetWizardSteps'
import { TargetWizardBody } from '../targets/wizard/TargetWizardBody'
import { StepIndicator } from '../targets/wizard/StepIndicator'

// Outer steps: 1=Target, 2=BackupTypes, 3=Schedule+Name, 4=Review, 5=Done
type OuterStep = 1 | 2 | 3 | 4 | 5
type BackupType = 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function FirstBackupWizard({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [outerStep, setOuterStep] = useState<OuterStep>(1)
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  // Target sub-flow (delegated to shared hook)
  const wizard = useTargetWizardState({ mode: 'create' })
  const targetSteps = useTargetWizardSteps(wizard.state.type)
  const [targetSubIndex, setTargetSubIndex] = useState(0)
  const [targetFurthest, setTargetFurthest] = useState(0)
  const [sshTestResult, setSshTestResult] = useState<boolean | null>(null)
  const [overrideTest, setOverrideTest] = useState(false)

  // Job fields
  const [jobName, setJobName] = useState('')
  const [schedule, setSchedule] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<BackupType>>(new Set(['appdata']))

  const isDirty = outerStep > 1 || wizard.isDirty

  function requestClose() {
    if (isDirty && outerStep < 5) setConfirmClose(true)
    else doClose()
  }

  function doClose() {
    resetAll()
    onClose()
  }

  function resetAll() {
    setOuterStep(1)
    setSaving(false)
    setConfirmClose(false)
    wizard.reset()
    setTargetSubIndex(0)
    setTargetFurthest(0)
    setSshTestResult(null)
    setOverrideTest(false)
    setJobName('')
    setSchedule(null)
    setSelectedTypes(new Set(['appdata']))
  }

  const ctx = useMemo(() => ({ sshTestResult, overrideTest }), [sshTestResult, overrideTest])
  const currentTargetStep = targetSteps[targetSubIndex]
  const isLastTargetSub = targetSubIndex === targetSteps.length - 1
  const canProceedTargetSub = currentTargetStep.canProceed(wizard.state, ctx)

  function targetSubNext() {
    if (!canProceedTargetSub) return
    if (isLastTargetSub) {
      setOuterStep(2)
      return
    }
    const next = targetSubIndex + 1
    setTargetSubIndex(next)
    setTargetFurthest(prev => Math.max(prev, next))
  }

  function targetSubBack() {
    if (targetSubIndex === 0) {
      requestClose()
      return
    }
    setTargetSubIndex(targetSubIndex - 1)
  }

  // Reset target sub state when type switches
  useEffect(() => {
    setTargetSubIndex(0)
    setTargetFurthest(0)
    setSshTestResult(null)
    setOverrideTest(false)
  }, [wizard.state.type])

  async function handleFinish(runNow: boolean) {
    if (!jobName.trim() || selectedTypes.size === 0) return
    setSaving(true)
    try {
      const target = await api.targets.create({
        name: wizard.state.name.trim(),
        type: wizard.state.type,
        enabled: true,
        config: wizard.buildConfig(),
      })

      const steps = Array.from(selectedTypes).map(type => {
        const base = { id: cryptoUUID(), retry: { max_attempts: 2, backoff: 'linear' as const } }
        switch (type) {
          case 'flash':
            return { ...base, type: 'flash', config: { targetId: target.id, useEncryption: false } }
          case 'appdata':
            return { ...base, type: 'appdata', config: { targetId: target.id, containers: [], stopContainers: true, useDatabaseDumps: false, useEncryption: false } }
          case 'vms':
            return { ...base, type: 'vms', config: { vms: [], destination: '/backups/vms', targetId: target.id, includeDisks: false, useEncryption: false } }
          case 'docker_images':
            return { ...base, type: 'docker_images', config: { images: [], destination: '/backups/docker-images', targetId: target.id, useEncryption: false } }
          case 'system_config':
            return { ...base, type: 'system_config', config: { destination: '/backups/system-config', targetId: target.id, includeItems: ['boot_config', 'network', 'users', 'plugins'], useEncryption: false } }
        }
      })

      const job = await api.jobs.create({
        name: jobName.trim(),
        ...(schedule ? { schedule } : {}),
        enabled: true,
        steps,
      })

      if (runNow) {
        try {
          await api.jobs.execute(job.id)
          toast(t('jobs:execution_started'), 'success')
        } catch { /* non-fatal */ }
      }

      onSuccess()
      setOuterStep(5)
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common:unknown_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const typeLabels: Record<BackupType, string> = {
    flash: t('jobs:wizard_type_flash'),
    appdata: t('jobs:wizard_type_appdata'),
    vms: t('jobs:wizard_type_vms'),
    docker_images: t('jobs:wizard_type_docker'),
    system_config: t('jobs:wizard_type_sysconfig'),
  }

  const typeHints: Record<BackupType, string> = {
    flash: t('guide.backup_flash_hint'),
    appdata: t('guide.backup_appdata_hint'),
    vms: t('guide.backup_vms_hint'),
    docker_images: t('guide.backup_docker_hint'),
    system_config: t('guide.backup_sysconfig_hint'),
  }

  const OUTER_LABELS = [
    t('guide.step_target'),
    t('guide.step_backup'),
    t('guide.step_schedule'),
    t('guide.step_review'),
  ]

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={t('guide.first_backup_title')}
        className="max-w-2xl"
        disableBackdropClose
      >
        {outerStep < 5 && (
          <StepIndicator labels={OUTER_LABELS} current={outerStep - 1} furthest={outerStep - 1} />
        )}

        <div className="min-h-[300px] overflow-y-auto max-h-[60vh]">

          {/* Outer Step 1 — Target sub-flow */}
          {outerStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-[var(--border-default)] pb-3">
                <StepIndicator
                  labels={targetSteps.map(s => t(`targets:${s.labelKey}`))}
                  current={targetSubIndex}
                  furthest={targetFurthest}
                  onJump={(i) => i <= targetFurthest && setTargetSubIndex(i)}
                />
              </div>
              <TargetWizardBody
                stepId={currentTargetStep.id}
                state={wizard.state}
                update={wizard.update}
                mode="create"
                sshTestResult={sshTestResult}
                setSshTestResult={setSshTestResult}
                overrideTest={overrideTest}
                setOverrideTest={setOverrideTest}
              />
            </div>
          )}

          {outerStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted)]">{t('guide.step_backup_desc')}</p>
              <div className="space-y-2">
                {(Object.keys(typeLabels) as BackupType[]).map(type => (
                  <label
                    key={type}
                    className="flex items-start gap-3 p-3 border border-[var(--border-default)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(type)}
                      onChange={e => {
                        const next = new Set(selectedTypes)
                        if (e.target.checked) next.add(type)
                        else next.delete(type)
                        setSelectedTypes(next)
                      }}
                      className="accent-[var(--theme-primary)] mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{typeLabels[type]}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{typeHints[type]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {outerStep === 3 && (
            <div className="space-y-4">
              <Input
                label={t('guide.job_name_label')}
                value={jobName}
                onChange={e => setJobName(e.target.value)}
                placeholder={t('guide.job_name_placeholder')}
                required
                autoFocus
              />
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-3">{t('guide.step_schedule_desc')}</p>
                <CronBuilder value={schedule} onChange={setSchedule} />
              </div>
            </div>
          )}

          {outerStep === 4 && (
            <div className="border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">{t('guide.step_review_target')}</span>
                <span className="text-sm text-[var(--text-primary)] font-medium">{wizard.state.name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">{t('jobs:name')}</span>
                <span className="text-sm text-[var(--text-primary)] font-medium">{jobName}</span>
              </div>
              <div className="flex justify-between items-start px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">{t('guide.step_review_backup_types')}</span>
                <div className="flex flex-col items-end gap-0.5">
                  {Array.from(selectedTypes).map(type => (
                    <span key={type} className="text-xs text-[var(--text-primary)]">{typeLabels[type]}</span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">{t('guide.step_review_schedule')}</span>
                <span className="text-sm text-[var(--text-primary)]">{schedule ?? t('guide.step_review_manual')}</span>
              </div>
            </div>
          )}

          {outerStep === 5 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 size={48} className="text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('guide.step_done')}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">{t('guide.step_done_text')}</p>
              </div>
            </div>
          )}
        </div>

        {outerStep < 5 && (
          <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
            {outerStep === 1 ? (
              <Button type="button" variant="ghost" onClick={targetSubBack}>
                {targetSubIndex === 0 ? t('common:buttons.cancel') : t('guide.back')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setOuterStep((outerStep - 1) as OuterStep)}>
                {t('guide.back')}
              </Button>
            )}

            {outerStep === 1 ? (
              <Button
                type="button"
                variant="primary"
                disabled={!canProceedTargetSub}
                onClick={targetSubNext}
              >
                {t('common:buttons.next')}
              </Button>
            ) : outerStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                disabled={
                  outerStep === 2 ? selectedTypes.size === 0 :
                  outerStep === 3 ? !jobName.trim() :
                  false
                }
                onClick={() => setOuterStep((outerStep + 1) as OuterStep)}
              >
                {t('common:buttons.next')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={saving}
                  onClick={() => void handleFinish(false)}
                >
                  {t('common:buttons.save')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={saving}
                  onClick={() => void handleFinish(true)}
                >
                  {t('guide.run_now')}
                </Button>
              </div>
            )}
          </div>
        )}

        {outerStep === 5 && (
          <div className="flex gap-3 justify-center mt-6 pt-4 border-t border-[var(--border-default)]">
            <Button type="button" variant="ghost" onClick={resetAll}>
              {t('guide.create_more')}
            </Button>
            <Button type="button" variant="primary" onClick={() => { resetAll(); onClose() }}>
              {t('guide.go_to_dashboard')}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmClose}
        onConfirm={() => { setConfirmClose(false); doClose() }}
        onCancel={() => setConfirmClose(false)}
        title={t('guide.abort_title')}
        message={t('guide.abort_message')}
        confirmText={t('guide.abort_confirm')}
        variant="warning"
      />
    </>
  )
}
