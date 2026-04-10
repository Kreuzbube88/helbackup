import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { FileBrowser } from '../common/FileBrowser'
import { useToast } from '../common/Toast'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { api } from '../../api'

interface BackupSettings {
  appdataSourcePath: string
  flashSourcePath: string
  rsyncBwlimitKb: number
}

const DEFAULT: BackupSettings = {
  appdataSourcePath: '/unraid/user/appdata',
  flashSourcePath: '/unraid/boot',
  rsyncBwlimitKb: 0,
}

export function BackupTab() {
  const { t } = useTranslation('settings')
  const { toast } = useToast()
  const [settings, setSettings] = useState<BackupSettings>(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [browserTarget, setBrowserTarget] = useState<'appdata' | 'flash' | null>(null)

  const { hasChanges, resetChanges } = useUnsavedChanges(settings)

  useEffect(() => {
    api.settings.get().then(s => {
      const loaded: BackupSettings = {
        appdataSourcePath: s.appdataSourcePath,
        flashSourcePath: s.flashSourcePath,
        rsyncBwlimitKb: s.rsyncBwlimitKb,
      }
      setSettings(loaded)
      resetChanges(loaded)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.settings.update({
        appdataSourcePath: settings.appdataSourcePath,
        flashSourcePath: settings.flashSourcePath,
        rsyncBwlimitKb: settings.rsyncBwlimitKb,
      })
      const updated: BackupSettings = {
        appdataSourcePath: res.appdataSourcePath,
        flashSourcePath: res.flashSourcePath,
        rsyncBwlimitKb: res.rsyncBwlimitKb,
      }
      setSettings(updated)
      resetChanges(updated)
      toast(t('backup.saved'), 'success')
    } catch {
      toast(t('common:error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleBrowserSelect(path: string) {
    if (browserTarget === 'appdata') {
      setSettings(s => ({ ...s, appdataSourcePath: path }))
    } else if (browserTarget === 'flash') {
      setSettings(s => ({ ...s, flashSourcePath: path }))
    }
    setBrowserTarget(null)
  }

  return (
    <>
      <Card>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
          {t('backup.title')}
        </h2>
        <form onSubmit={e => { void handleSave(e) }} className="flex flex-col gap-5">

          {/* Appdata source path */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t('backup.appdata_path_label')}</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">{t('backup.appdata_path_hint')}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.appdataSourcePath}
                onChange={e => setSettings(s => ({ ...s, appdataSourcePath: e.target.value }))}
                className="flex-1 font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setBrowserTarget('appdata'); setBrowserOpen(true) }}
              >
                {t('backup.browse')}
              </Button>
            </div>
          </div>

          {/* Flash source path */}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t('backup.flash_source_label')}</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">{t('backup.flash_source_hint')}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.flashSourcePath}
                onChange={e => setSettings(s => ({ ...s, flashSourcePath: e.target.value }))}
                className="flex-1 font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setBrowserTarget('flash'); setBrowserOpen(true) }}
              >
                {t('backup.browse')}
              </Button>
            </div>
          </div>

          {/* Rsync bandwidth limit */}
          <Input
            type="number"
            label={t('backup.bwlimit_label')}
            value={String(settings.rsyncBwlimitKb)}
            onChange={e => setSettings(s => ({ ...s, rsyncBwlimitKb: Math.max(0, parseInt(e.target.value) || 0) }))}
            min="0"
            max="1000000"
            helpText={t('backup.bwlimit_hint')}
          />

          <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!hasChanges} className="self-start">
            {t('backup.save')}
          </Button>
        </form>
      </Card>

      <FileBrowser
        open={browserOpen}
        onClose={() => { setBrowserOpen(false); setBrowserTarget(null) }}
        onSelect={handleBrowserSelect}
        initialPath={browserTarget === 'flash' ? '/unraid/boot' : '/unraid/user'}
        title={browserTarget === 'flash' ? t('backup.flash_source_label') : t('backup.appdata_path_label')}
      />
    </>
  )
}
