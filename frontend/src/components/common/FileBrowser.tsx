import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Folder, ChevronUp } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { api } from '../../api'

interface FsEntry {
  name: string
  path: string
}

interface BrowseResult {
  path: string
  parent: string | null
  parentAllowed: boolean
  entries: FsEntry[]
}

interface FileBrowserProps {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
  initialPath?: string
  title?: string
}

export function FileBrowser({ open, onClose, onSelect, initialPath = '/unraid/user', title }: FileBrowserProps) {
  const { t } = useTranslation('common')
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [result, setResult] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const browse = useCallback((path: string, fallbackAttempt = false) => {
    setLoading(true)
    setError(null)
    api.fs.browse(path)
      .then(r => { setResult(r); setCurrentPath(r.path) })
      .catch(() => {
        // If initial path doesn't exist, try the parent directory automatically
        if (!fallbackAttempt) {
          const parent = path.replace(/\/[^/]+\/?$/, '') || '/unraid/user'
          if (parent !== path) {
            browse(parent, true)
            return
          }
        }
        setError(t('file_browser.error_not_found'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (open) browse(initialPath)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSelect() {
    onSelect(currentPath)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t('file_browser.title')}
      className="max-w-md"
    >
      <div className="flex flex-col gap-3">
        {/* Quick access */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--text-muted)]">{t('file_browser.quick_access')}:</span>
          {([
            { label: t('file_browser.root_user_share'), path: '/unraid/user' },
            { label: t('file_browser.root_cache'), path: '/mnt/cache' },
          ] as { label: string; path: string }[]).map(root => (
            <button
              key={root.path}
              type="button"
              onClick={() => browse(root.path)}
              className="text-xs font-mono px-2 py-0.5 border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-colors"
            >
              {root.label}
            </button>
          ))}
        </div>

        {/* Current path */}
        <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2 truncate">
          {currentPath}
        </div>

        {/* Entry list */}
        <div className="flex flex-col border border-[var(--border-default)] overflow-y-auto max-h-72">
          {/* Go up */}
          {result?.parent && result.parentAllowed && (
            <button
              type="button"
              onClick={() => browse(result.parent!)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-default)]"
            >
              <ChevronUp size={14} className="text-[var(--text-muted)]" />
              <span className="font-mono">..</span>
            </button>
          )}

          {loading && (
            <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center animate-pulse">
              {t('file_browser.loading')}
            </div>
          )}

          {!loading && error && (
            <div className="px-3 py-3 text-xs text-[var(--status-error)]">{error}</div>
          )}

          {!loading && !error && result?.entries.length === 0 && (
            <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center italic">
              {t('file_browser.empty')}
            </div>
          )}

          {!loading && !error && result?.entries.map(entry => (
            <button
              key={entry.path}
              type="button"
              onClick={() => browse(entry.path)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-default)] last:border-b-0"
            >
              <Folder size={14} className="text-[var(--theme-accent)] shrink-0" />
              <span className="font-mono text-xs truncate">{entry.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSelect} disabled={loading}>
            {t('file_browser.select_btn')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
