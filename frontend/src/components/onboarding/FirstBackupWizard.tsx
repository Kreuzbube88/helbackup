import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HardDrive, Server, Cloud, CheckCircle2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { ConfirmModal } from '../common/ConfirmModal'
import { useToast } from '../common/Toast'
import { CronBuilder } from '../jobs/wizard/CronBuilder'
import { NASTargetForm, type NASPowerConfig } from '../targets/NASTargetForm'
import { api } from '../../api'
import { cryptoUUID } from '../../utils/format'

type TargetType = 'local' | 'nas' | 'rclone'
// Steps: 1=Target, 2=BackupTypes, 3=Schedule+Name, 4=Review, 5=Done
type Step = 1 | 2 | 3 | 4 | 5
type BackupType = 'flash' | 'appdata' | 'vms' | 'docker_images' | 'system_config'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_NAS_POWER: NASPowerConfig = {
  enabled: false, mac: '', ip: '', autoShutdown: false,
}

export function FirstBackupWizard({ open, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  // Target fields
  const [targetType, setTargetType] = useState<TargetType>('local')
  const [targetName, setTargetName] = useState('')
  const [localPath, setLocalPath] = useState('/mnt/backups')
  const [nasHost, setNasHost] = useState('')
  const [nasPort, setNasPort] = useState(22)
  const [nasUser, setNasUser] = useState('')
  const [nasPass, setNasPass] = useState('')
  const [nasPath, setNasPath] = useState('/backups')
  const [nasPower, setNasPower] = useState<NASPowerConfig>(DEFAULT_NAS_POWER)
  const [remoteName, setRemoteName] = useState('')
  const [remotePath, setRemotePath] = useState('backups')

  // Job fields
  const [jobName, setJobName] = useState('')
  const [schedule, setSchedule] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<BackupType>>(new Set(['appdata']))

  const isDirty = step > 1 || targetName.trim() !== ''

  function requestClose() {
    if (isDirty && step < 5) {
      setConfirmClose(true)
    } else {
      doClose()
    }
  }

  function doClose() {
    resetAll()
    onClose()
  }

  function resetAll() {
    setStep(1)
    setSaving(false)
    setConfirmClose(false)
    setTargetType('local')
    setTargetName('')
    setLocalPath('/mnt/backups')
    setNasHost('')
    setNasPort(22)
    setNasUser('')
    setNasPass('')
    setNasPath('/backups')
    setNasPower(DEFAULT_NAS_POWER)
    setRemoteName('')
    setRemotePath('backups')
    setJobName('')
    setSchedule(null)
    setSelectedTypes(new Set(['appdata']))
  }

  function buildTargetConfig(): Record<string, unknown> {
    switch (targetType) {
      case 'local': return { path: localPath }
      case 'nas': return { host: nasHost, port: nasPort, username: nasUser, password: nasPass, path: nasPath, power: nasPower }
      case 'rclone': return { remoteName, remotePath, provider: 'generic' }
    }
  }

  function canProceedStep1(): boolean {
    if (!targetName.trim()) return false
    if (targetType === 'local') return localPath.trim().length > 0
    if (targetType === 'nas') return nasHost.trim().length > 0 && nasUser.trim().length > 0
    return remoteName.trim().length > 0
  }

  async function handleFinish(runNow: boolean) {
    if (!jobName.trim() || selectedTypes.size === 0) return
    setSaving(true)
    try {
      const target = await api.targets.create({
        name: targetName.trim(),
        type: targetType,
        enabled: true,
        config: buildTargetConfig(),
      })

      const steps = Array.from(selectedTypes).map(type => {
        const base = { id: cryptoUUID(), retry: { max_attempts: 2, backoff: 'linear' as const } }
        switch (type) {
          case 'flash':
            return { ...base, type: 'flash', config: { source: '/unraid/boot', targetId: target.id, useEncryption: false } }
          case 'appdata':
            return { ...base, type: 'appdata', config: { source: '/unraid/user/appdata', targetId: target.id, containers: [], stopContainers: true, useDatabaseDumps: false, useEncryption: false } }
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
      setStep(5)
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

  const STEP_LABELS = [
    t('guide.step_target'),
    t('guide.step_backup'),
    t('guide.step_schedule'),
    t('guide.step_review'),
  ]

  const targetTypeCards: { value: TargetType; icon: React.ReactNode; label: string; desc: string }[] = [
    { value: 'local', icon: <HardDrive size={20} />, label: t('guide.step_target_type_local'), desc: t('guide.step_target_type_local_desc') },
    { value: 'nas',   icon: <Server size={20} />,    label: t('guide.step_target_type_nas'),   desc: t('guide.step_target_type_nas_desc') },
    { value: 'rclone',icon: <Cloud size={20} />,     label: t('guide.step_target_type_rclone'),desc: t('guide.step_target_type_rclone_desc') },
  ]

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        title={t('guide.first_backup_title')}
        className="max-w-2xl"
      >
        {/* Step indicator */}
        {step < 5 && (
          <div className="flex items-center gap-1 mb-6">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={[
                  'flex items-center gap-1.5 text-xs py-1 px-2',
                  step === i + 1 ? 'text-[var(--theme-accent)] font-medium' :
                  step > i + 1 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
                ].join(' ')}>
                  <span className={[
                    'w-4 h-4 rounded-full text-[10px] flex items-center justify-center',
                    step === i + 1 ? 'bg-[var(--theme-accent)] text-black' :
                    step > i + 1 ? 'bg-green-500 text-white' :
                    'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                  ].join(' ')}>
                    {step > i + 1 ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 3 && <div className="flex-1 h-px bg-[var(--border-default)]" />}
              </div>
            ))}
          </div>
        )}

        <div className="min-h-[300px] overflow-y-auto max-h-[60vh]">

          {/* Step 1 — Target */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">{t('guide.step_target_desc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {targetTypeCards.map(card => (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => setTargetType(card.value)}
                    className={[
                      'flex flex-col gap-2 p-3 border text-left transition-colors',
                      targetType === card.value
                        ? 'border-[var(--theme-accent)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border-default)] hover:bg-[var(--bg-elevated)]',
                    ].join(' ')}
                  >
                    <span className="text-[var(--theme-accent)]">{card.icon}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{card.label}</span>
                    <span className="text-xs text-[var(--text-muted)] leading-relaxed">{card.desc}</span>
                  </button>
                ))}
              </div>

              <Input
                label={t('guide.step_target_name_label')}
                value={targetName}
                onChange={e => setTargetName(e.target.value)}
                placeholder={t('guide.step_target_name_placeholder')}
                required
              />

              {targetType === 'local' && (
                <Input label="Path" value={localPath} onChange={e => setLocalPath(e.target.value)} required />
              )}

              {targetType === 'nas' && (
                <>
                  <Input label="Host" value={nasHost} onChange={e => setNasHost(e.target.value)} required />
                  <Input label="Port" type="number" value={nasPort} onChange={e => setNasPort(Number(e.target.value))} />
                  <Input label={t('common:nas.username')} value={nasUser} onChange={e => setNasUser(e.target.value)} required />
                  <Input label={t('common:nas.password')} type="password" value={nasPass} onChange={e => setNasPass(e.target.value)} />
                  <Input label="Path" value={nasPath} onChange={e => setNasPath(e.target.value)} required />
                  <div className="border border-[var(--border-default)] p-3">
                    <NASTargetForm value={nasPower} onChange={setNasPower} sshHost={nasHost} sshUsername={nasUser} sshPassword={nasPass} />
                  </div>
                </>
              )}

              {targetType === 'rclone' && (
                <>
                  <Input label="Remote Name" value={remoteName} onChange={e => setRemoteName(e.target.value)} required />
                  <Input label="Remote Path" value={remotePath} onChange={e => setRemotePath(e.target.value)} required />
                </>
              )}
            </div>
          )}

          {/* Step 2 — What to back up (simple selection only, no detail config) */}
          {step === 2 && (
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

          {/* Step 3 — Job name + schedule */}
          {step === 3 && (
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

          {/* Step 4 — Review */}
          {step === 4 && (
            <div className="border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">{t('guide.step_review_target')}</span>
                <span className="text-sm text-[var(--text-primary)] font-medium">{targetName}</span>
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

          {/* Step 5 — Done */}
          {step === 5 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle2 size={48} className="text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('guide.step_done')}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">{t('guide.step_done_text')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => step > 1 ? setStep((step - 1) as Step) : requestClose()}
            >
              {step > 1 ? t('guide.back') : t('common:buttons.cancel')}
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                variant="primary"
                disabled={
                  step === 1 ? !canProceedStep1() :
                  step === 2 ? selectedTypes.size === 0 :
                  step === 3 ? !jobName.trim() :
                  false
                }
                onClick={() => setStep((step + 1) as Step)}
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

        {step === 5 && (
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
