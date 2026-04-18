import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api'
import type { Container } from '../../api'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  /** When provided, skips the internal fetch and uses this list directly */
  preloadedContainers?: Container[]
}

export default function DockerImageSelector({ value, onChange, preloadedContainers }: Props) {
  const { t } = useTranslation('jobs')
  const [fetchedContainers, setFetchedContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(!preloadedContainers)
  const [error, setError] = useState<string | null>(null)

  const containers = preloadedContainers ?? fetchedContainers

  const load = () => {
    if (preloadedContainers) return
    setLoading(true)
    setError(null)
    api.docker.listContainers()
      .then(data => setFetchedContainers([...data].sort((a, b) => {
        const nameA = a.Names[0]?.replace('/', '') ?? ''
        const nameB = b.Names[0]?.replace('/', '') ?? ''
        return nameA.localeCompare(nameB)
      })))
      .catch(() => setError(t('fetch_error_containers')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (preloadedContainers) {
      setLoading(false)
    } else {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!preloadedContainers])

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(n => n !== name))
    } else {
      onChange([...value, name])
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm">{t('select_containers')}</h3>

      {loading && (
        <p className="text-sm text-[var(--text-muted)]">{t('loading_containers')}</p>
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

      {!loading && !error && containers.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">{t('no_containers_found')}</p>
      )}

      {!loading && !error && containers.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto border border-[var(--border-default)] p-2">
          {containers.map(c => {
            const name = c.Names[0]?.replace('/', '') ?? c.Id.slice(0, 12)
            const isRunning = c.State === 'running'
            return (
              <label key={c.Id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)] px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={value.includes(name)}
                  onChange={() => toggle(name)}
                  className="accent-[var(--theme-primary)]"
                />
                <span className="flex-1 text-[var(--text-primary)]">{name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${isRunning ? 'text-[var(--status-success)]' : 'text-[var(--text-muted)]'}`}>
                  {isRunning ? t('container_state_running') : t('container_state_stopped')}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
