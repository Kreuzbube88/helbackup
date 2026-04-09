import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../common/Button'
import { useToast } from '../../common/Toast'
import { api, type Target } from '../../../api'
import { useTargetWizardState } from './useTargetWizardState'
import { useTargetWizardSteps } from './useTargetWizardSteps'
import { TargetWizardBody } from './TargetWizardBody'
import { StepIndicator } from './StepIndicator'

interface Props {
  mode: 'create' | 'edit'
  initialTarget?: Target | null
  onCancel: () => void
  onSuccess: () => void
  /** expose dirty state to parent (for unsaved-changes confirmation) */
  onDirtyChange?: (dirty: boolean) => void
}

export function TargetWizard({ mode, initialTarget, onCancel, onSuccess, onDirtyChange }: Props) {
  const { t } = useTranslation('targets')
  const { toast } = useToast()

  const wizard = useTargetWizardState({ mode, initialTarget })
  const { state, update, isDirty, buildConfig } = wizard

  const steps = useTargetWizardSteps(state.type)

  const [stepIndex, setStepIndex] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [saving, setSaving] = useState(false)

  // Per-test-step state
  const [sshTestResult, setSshTestResult] = useState<boolean | null>(null)
  const [overrideTest, setOverrideTest] = useState(false)

  // Reset wizard step index if the type changes (steps array length differs)
  useEffect(() => {
    setStepIndex(0)
    setFurthest(0)
    setSshTestResult(null)
    setOverrideTest(false)
  }, [state.type])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const currentStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const ctx = useMemo(() => ({ sshTestResult, overrideTest }), [sshTestResult, overrideTest])

  const canProceed = currentStep.canProceed(state, ctx)

  function goNext() {
    if (!canProceed) return
    if (isLast) return
    const next = stepIndex + 1
    setStepIndex(next)
    setFurthest(prev => Math.max(prev, next))
  }

  function goBack() {
    if (stepIndex === 0) {
      onCancel()
      return
    }
    setStepIndex(stepIndex - 1)
  }

  function jumpTo(index: number) {
    if (index <= furthest) setStepIndex(index)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (mode === 'create') {
        await api.targets.create({
          name: state.name.trim(),
          type: state.type,
          enabled: state.enabled,
          config: buildConfig(),
        })
        toast(t('created'), 'success')
      } else if (initialTarget) {
        await api.targets.update(initialTarget.id, {
          name: state.name.trim(),
          type: state.type,
          enabled: state.enabled,
          config: buildConfig(),
        })
        toast(t('updated'), 'success')
      }
      onSuccess()
    } catch (err) {
      toast(err instanceof Error ? err.message : t(mode === 'create' ? 'create_error' : 'update_error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const labels = steps.map(s => t(s.labelKey))

  return (
    <div className="flex flex-col gap-4">
      <StepIndicator labels={labels} current={stepIndex} furthest={furthest} onJump={jumpTo} />

      <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
        <TargetWizardBody
          stepId={currentStep.id}
          state={state}
          update={update}
          mode={mode}
          sshTestResult={sshTestResult}
          setSshTestResult={setSshTestResult}
          overrideTest={overrideTest}
          setOverrideTest={setOverrideTest}
        />
      </div>

      <div className="flex gap-3 justify-between mt-2 pt-4 border-t border-[var(--border-default)]">
        <Button type="button" variant="ghost" onClick={goBack}>
          {stepIndex === 0 ? t('common:buttons.cancel') : t('wizard.back')}
        </Button>

        {isLast ? (
          <Button type="button" variant="primary" loading={saving} onClick={() => void handleSave()}>
            {t('common:buttons.save')}
          </Button>
        ) : (
          <Button type="button" variant="primary" disabled={!canProceed} onClick={goNext}>
            {t('wizard.next')}
          </Button>
        )}
      </div>
    </div>
  )
}
