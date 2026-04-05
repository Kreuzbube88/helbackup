import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import type { VmInfo } from '../../api'

interface Props {
  value: string[]
  includeDisks: boolean
  onChange: (value: string[]) => void
  onIncludeDisksChange: (value: boolean) => void
}

export default function VMSelector({ value, includeDisks, onChange, onIncludeDisksChange }: Props) {
  const { t } = useTranslation('jobs')
  const [vms, setVms] = useState<VmInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.vms.list()
      .then(setVms)
      .catch(() => setError(t('fetch_error_vms')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(n => n !== name))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">{t('select_vms')}</h3>

      {loading && (
        <p className="text-sm text-[var(--text-muted)]">{t('loading_vms')}</p>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--status-error)]">{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-xs text-[var(--theme-primary)] underline"
          >
            {t('common:buttons.retry')}
          </button>
        </div>
      )}

      {!loading && !error && vms.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">{t('no_vms_found')}</p>
      )}

      {!loading && !error && vms.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto border border-[var(--border-default)] p-2">
          {vms.map(vm => {
            const isRunning = vm.state === 'running'
            return (
              <label key={vm.name} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)] px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={value.includes(vm.name)}
                  onChange={() => toggle(vm.name)}
                  className="accent-[var(--theme-primary)]"
                />
                <span className="flex-1 text-[var(--text-primary)]">{vm.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${isRunning ? 'text-[var(--status-success)]' : 'text-[var(--text-muted)]'}`}>
                  {isRunning ? t('vm_state_running') : t('vm_state_off')}
                </span>
              </label>
            )
          })}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
        <input
          type="checkbox"
          checked={includeDisks}
          onChange={e => onIncludeDisksChange(e.target.checked)}
          className="accent-[var(--theme-primary)]"
        />
        {t('include_vm_disks')}
      </label>
    </div>
  )
}
