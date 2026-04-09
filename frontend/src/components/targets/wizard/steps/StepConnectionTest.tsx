import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react'
import { Button } from '../../../common/Button'
import { api } from '../../../../api'
import type { TargetWizardState } from '../useTargetWizardState'

type Status = 'idle' | 'running' | 'pass' | 'fail'

interface Props {
  state: TargetWizardState
  sshTestResult: boolean | null
  setSshTestResult: (v: boolean | null) => void
  overrideTest: boolean
  setOverrideTest: (v: boolean) => void
}

export function StepConnectionTest({
  state,
  sshTestResult,
  setSshTestResult,
  overrideTest,
  setOverrideTest,
}: Props) {
  const { t } = useTranslation('targets')

  const wakeEnabled = state.nasPower.enabled && state.nasPower.mac.trim() !== ''
  const [sshStatus, setSshStatus] = useState<Status>(sshTestResult === null ? 'idle' : sshTestResult ? 'pass' : 'fail')
  const [wakeStatus, setWakeStatus] = useState<Status>('idle')
  const [sshError, setSshError] = useState<string | null>(null)
  const [wakeError, setWakeError] = useState<string | null>(null)

  const runTests = useCallback(async () => {
    setSshStatus('running')
    setSshError(null)
    setSshTestResult(null)

    if (wakeEnabled) {
      setWakeStatus('running')
      setWakeError(null)
      try {
        const r = await api.nas.testWake(state.nasPower.mac, state.nasPower.ip || undefined)
        setWakeStatus(r.success ? 'pass' : 'fail')
        if (!r.success && r.error) setWakeError(r.error)
      } catch (err) {
        setWakeStatus('fail')
        setWakeError(err instanceof Error ? err.message : String(err))
      }
    }

    try {
      const host = state.nasPower.ip || state.nasHost
      const r = await api.nas.testSSH(
        host,
        state.nasPort,
        state.nasUser,
        state.nasPass || undefined,
        state.nasPrivateKey || undefined,
      )
      setSshStatus(r.success ? 'pass' : 'fail')
      setSshTestResult(r.success)
      if (!r.success) setSshError(t('wizard.step_test_failed'))
    } catch (err) {
      setSshStatus('fail')
      setSshError(err instanceof Error ? err.message : String(err))
      setSshTestResult(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nasHost, state.nasPort, state.nasUser, state.nasPass, state.nasPrivateKey, state.nasPower.mac, state.nasPower.ip, wakeEnabled])

  useEffect(() => {
    if (sshTestResult === null) void runTests()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showOverride = sshStatus === 'fail'

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t('wizard.step_test_desc')}</p>

      <div className="border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
        {wakeEnabled && (
          <TestRow label={t('wizard.test_wake')} status={wakeStatus} error={wakeError} />
        )}
        <TestRow label={t('wizard.test_ssh')} status={sshStatus} error={sshError} />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void runTests()}
          disabled={sshStatus === 'running' || wakeStatus === 'running'}
        >
          {t('wizard.step_test_retry')}
        </Button>
      </div>

      {showOverride && (
        <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={overrideTest}
            onChange={e => setOverrideTest(e.target.checked)}
            className="accent-[var(--theme-primary)] mt-0.5"
          />
          <span>{t('wizard.step_test_override')}</span>
        </label>
      )}
    </div>
  )
}

function TestRow({ label, status, error }: { label: string; status: Status; error: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <StatusIcon status={status} />
      <span className="text-sm text-[var(--text-primary)] flex-1">{label}</span>
      {error && status === 'fail' && (
        <span className="text-xs text-red-400 truncate max-w-[60%]" title={error}>{error}</span>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'running') return <Loader2 size={16} className="text-[var(--theme-accent)] animate-spin" />
  if (status === 'pass') return <CheckCircle2 size={16} className="text-green-500" />
  if (status === 'fail') return <XCircle size={16} className="text-red-500" />
  return <Circle size={16} className="text-[var(--text-muted)]" />
}
