import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { ConfirmModal } from '../common/ConfirmModal'
import { recovery as recoveryApi, type RestoreOptions, type RestorePlan } from '../../api'

interface Manifest {
  backup_id?: string
  backupId?: string
  [key: string]: unknown
}

interface Props {
  manifest: Manifest
  onClose: () => void
}

type WizardStep = 'select' | 'plan' | 'done'

const DEFAULT_OPTIONS: RestoreOptions = {
  includeFlash: true,
  includeAppdata: true,
  includeVMs: true,
  includeDockerImages: true,
  includeSystemConfig: true,
  includeDatabases: true,
}

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as (keyof RestoreOptions)[]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function FullServerRestoreWizard({ manifest, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>('select')
  const [options, setOptions] = useState<RestoreOptions>({ ...DEFAULT_OPTIONS })
  const [plan, setPlan] = useState<RestorePlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const backupId = manifest.backup_id ?? manifest.backupId ?? ''

  const handleGeneratePlan = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await recoveryApi.generateRestorePlan(backupId, options)
      setPlan(result)
      setStep('plan')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = () => {
    if (!plan) return
    setConfirmOpen(true)
  }

  const doExecute = async () => {
    if (!plan) return
    setConfirmOpen(false)
    setError(null)
    try {
      await recoveryApi.executeFullRestore(backupId, plan)
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExecuting(false)
    }
  }

  const toggleOption = (key: keyof RestoreOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (step === 'select') {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('recovery.full_server_restore_title')}</h2>
          <Button variant="secondary" onClick={onClose}>{t('buttons.cancel')}</Button>
        </div>

        <div className="border-2 border-[var(--border-default)] p-6">
          <h3 className="font-bold mb-4">{t('recovery.select_restore_items')}</h3>
          <div className="space-y-3">
            {OPTION_KEYS.map(key => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[key] !== false}
                  onChange={() => toggleOption(key)}
                  className="w-5 h-5"
                />
                <span>{t(`recovery.restore_option_${key}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="border-2 border-red-500 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <Button variant="primary" onClick={handleGeneratePlan} disabled={loading} className="flex-1">
            {loading ? t('loading') : t('recovery.generate_plan')}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('buttons.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'plan' && plan) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('recovery.restore_plan_title')}</h2>
          <Button variant="secondary" onClick={onClose}>{t('buttons.cancel')}</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 border-2 border-blue-500">
            <div className="text-3xl font-bold">{plan.items.length}</div>
            <div className="text-sm opacity-70">{t('recovery.plan_items')}</div>
          </div>
          <div className="text-center p-4 border-2 border-green-500">
            <div className="text-3xl font-bold">{formatBytes(plan.totalSize)}</div>
            <div className="text-sm opacity-70">{t('recovery.plan_size')}</div>
          </div>
          <div className="text-center p-4 border-2 border-purple-500">
            <div className="text-3xl font-bold">{formatDuration(plan.estimatedDuration)}</div>
            <div className="text-sm opacity-70">{t('recovery.plan_duration')}</div>
          </div>
        </div>

        {/* Execution order */}
        <div className="border-2 border-[var(--border-default)] p-6">
          <h3 className="font-bold mb-4">{t('recovery.execution_order')}</h3>
          {plan.executionOrder.map((group, idx) => (
            <div key={idx} className="mb-4">
              <div className="font-bold text-sm mb-1">{t('recovery.step_n', { n: idx + 1 })}:</div>
              <div className="space-y-1 pl-4">
                {group.map((item, i) => (
                  <div key={i} className="text-sm flex items-start gap-2">
                    <span>•</span>
                    <span>
                      {item.name}
                      {item.warnings.length > 0 && (
                        <span className="ml-2 text-yellow-600 text-xs">⚠ {item.warnings[0]}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pre-flight checks */}
        <div className="border-2 border-[var(--border-default)] p-6">
          <h3 className="font-bold mb-4">{t('recovery.preflight_checks')}</h3>

          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span>{t('recovery.disk_space')}:</span>
              <span className={plan.preFlightChecks.diskSpace.sufficient ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {plan.preFlightChecks.diskSpace.sufficient ? `✓ ${t('recovery.sufficient')}` : `✗ ${t('recovery.insufficient')}`}
              </span>
            </div>
            <div className="text-sm opacity-70">
              {t('recovery.required')}: {formatBytes(plan.preFlightChecks.diskSpace.required)} /
              {' '}{t('recovery.available')}: {formatBytes(plan.preFlightChecks.diskSpace.available)}
            </div>
          </div>

          {plan.preFlightChecks.conflicts.length > 0 && (
            <div className="mb-4">
              <div className="font-bold text-yellow-600 mb-1">⚠ {t('recovery.conflicts')}:</div>
              {plan.preFlightChecks.conflicts.map((c, i) => (
                <div key={i} className="text-sm pl-4">• {c.name}: {c.message}</div>
              ))}
            </div>
          )}

          {plan.preFlightChecks.warnings.length > 0 && (
            <div>
              <div className="font-bold mb-1">{t('recovery.warnings')}:</div>
              {plan.preFlightChecks.warnings.map((w, i) => (
                <div key={i} className="text-sm pl-4">• {w}</div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="border-2 border-red-500 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={handleExecute}
            disabled={executing || !plan.preFlightChecks.diskSpace.sufficient}
            className="flex-1"
          >
            {executing ? t('recovery.executing') : t('recovery.execute_restore')}
          </Button>
          <Button variant="secondary" onClick={() => setStep('select')} className="flex-1">
            {t('recovery.back')}
          </Button>
        </div>

        <ConfirmModal
          open={confirmOpen}
          onConfirm={() => { void doExecute() }}
          onCancel={() => setConfirmOpen(false)}
          title={t('recovery.full_server_restore_title')}
          message={t('recovery.full_server_restore_confirm')}
          variant="danger"
          loading={executing}
        />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">✓ {t('recovery.restore_started')}</h2>

        <div className="border-2 border-green-500 p-6">
          <p className="mb-4">{t('recovery.restore_in_progress')}</p>
          <div className="space-y-2 text-sm">
            <p>• {t('recovery.check_logs')}</p>
            <p>• {t('recovery.manual_steps_may_apply')}</p>
            <p>• {t('recovery.reboot_required_flash')}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="primary" onClick={() => navigate('/logs')} className="flex-1">
            {t('recovery.view_logs')}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('buttons.close')}
          </Button>
        </div>
      </div>
    )
  }

  return null
}
