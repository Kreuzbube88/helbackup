import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { ConfirmModal } from '../common/ConfirmModal'
import { useToast } from '../common/Toast'
import { api } from '../../api'

interface GFSConfig {
  dailyKeep: number
  weeklyKeep: number
  monthlyKeep: number
}

interface PreviewSummary {
  totalBackups: number
  keepCount: number
  deleteCount: number
  spaceFreed: number
  spaceSaved: number
}

interface PreviewKeep {
  daily: unknown[]
  weekly: unknown[]
  monthly: unknown[]
}

interface PreviewPlan {
  keep: PreviewKeep
  summary: PreviewSummary
}

interface SavingsResult {
  simple: { backupsKept: number; storageGB: number }
  gfs: { backupsKept: number; storageGB: number }
  savings: { storageGB: number; percent: number }
}

interface Props {
  targetId: number
  onClose: () => void
}

export default function GFSRetentionSettings({ targetId, onClose }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [scheme, setScheme] = useState<'simple' | 'gfs'>('simple')
  const [gfsConfig, setGfsConfig] = useState<GFSConfig>({ dailyKeep: 7, weeklyKeep: 4, monthlyKeep: 12 })
  const [preview, setPreview] = useState<PreviewPlan | null>(null)
  const [savings, setSavings] = useState<SavingsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    void loadConfig()
  }, [targetId])

  useEffect(() => {
    if (scheme === 'gfs') {
      void loadPreview()
      void loadSavings()
    }
  }, [scheme, gfsConfig])

  async function loadConfig() {
    try {
      const config = await api.targets.getGFSConfig(targetId)
      setScheme(config.retentionScheme as 'simple' | 'gfs')
      setGfsConfig(config.gfsConfig)
    } catch {
      toast(t('gfs.load_error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadPreview() {
    try {
      const result = await api.targets.previewGFSCleanup(targetId) as PreviewPlan
      setPreview(result)
    } catch {
      // preview is optional — silently ignore
    }
  }

  async function loadSavings() {
    try {
      const result = await api.targets.calculateGFSSavings({
        backupSizeGB: 100,
        backupsPerWeek: 7,
        currentRetentionDays: 30,
        gfsConfig,
      })
      setSavings(result)
    } catch {
      // optional — ignore
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.targets.updateGFSConfig(targetId, { retentionScheme: scheme, gfsConfig })
      toast(t('gfs.config_saved'), 'success')
      onClose()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleExecuteCleanup() {
    setConfirmOpen(false)
    setCleaning(true)
    try {
      await api.targets.executeGFSCleanup(targetId)
      toast(t('gfs.cleanup_success'), 'success')
      await loadPreview()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      toast(msg, 'error')
    } finally {
      setCleaning(false)
    }
  }

  function updateGfs(key: keyof GFSConfig, value: number) {
    setGfsConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return <div className="p-6 text-[var(--text-secondary)]">{t('loading')}</div>
  }

  const totalKept = gfsConfig.dailyKeep + gfsConfig.weeklyKeep + gfsConfig.monthlyKeep

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('gfs.title')}</h2>

      {/* Scheme selection */}
      <div className="border border-[var(--border-default)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{t('gfs.select_scheme')}</p>

        {(['simple', 'gfs'] as const).map(s => (
          <label key={s} className="flex items-start gap-3 p-4 border border-[var(--border-default)] cursor-pointer hover:border-[var(--theme-primary)] transition-colors">
            <input
              type="radio"
              checked={scheme === s}
              onChange={() => setScheme(s)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="font-medium text-[var(--text-primary)]">
                {s === 'simple' ? t('gfs.simple_retention') : t('gfs.gfs_retention')}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {s === 'simple' ? t('gfs.simple_description') : t('gfs.gfs_description')}
              </div>
              {s === 'gfs' && savings && (
                <div className="mt-2 text-xs text-emerald-400">
                  {t('gfs.estimated_savings')}: {savings.savings.percent}% ({savings.savings.storageGB} GB)
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* GFS configuration sliders */}
      {scheme === 'gfs' && (
        <>
          <div className="border border-[var(--border-default)] p-4 space-y-5">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">{t('gfs.configuration')}</p>

            {([
              { key: 'dailyKeep' as const, label: t('gfs.daily'), hint: t('gfs.daily_hint'), min: 1, max: 14 },
              { key: 'weeklyKeep' as const, label: t('gfs.weekly'), hint: t('gfs.weekly_hint'), min: 1, max: 8 },
              { key: 'monthlyKeep' as const, label: t('gfs.monthly'), hint: t('gfs.monthly_hint'), min: 1, max: 24 },
            ]).map(({ key, label, hint, min, max }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-primary)]">{label}</span>
                  <span className="font-mono text-[var(--theme-primary)]">{gfsConfig[key]}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={gfsConfig[key]}
                  onChange={e => updateGfs(key, parseInt(e.target.value))}
                  className="w-full accent-[var(--theme-primary)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>
              </div>
            ))}

            <div className="pt-2 border-t border-[var(--border-default)] text-sm flex justify-between">
              <span className="text-[var(--text-secondary)]">{t('gfs.total_backups')}</span>
              <span className="font-bold text-[var(--text-primary)]">{totalKept}</span>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="border border-[var(--border-default)] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">{t('gfs.cleanup_preview')}</p>
                {preview.summary.deleteCount > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cleaning}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {t('gfs.execute_cleanup')}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('gfs.keep'), value: preview.summary.keepCount, color: 'text-emerald-400' },
                  { label: t('gfs.delete'), value: preview.summary.deleteCount, color: 'text-red-400' },
                  { label: t('gfs.space_saved'), value: `${preview.summary.spaceSaved}%`, color: 'text-[var(--theme-primary)]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 border border-[var(--border-default)]">
                    <div className={`text-2xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-[var(--text-secondary)] space-y-1">
                <div className="flex justify-between">
                  <span>{t('gfs.daily')}</span>
                  <strong>{preview.keep.daily.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('gfs.weekly')}</span>
                  <strong>{preview.keep.weekly.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('gfs.monthly')}</span>
                  <strong>{preview.keep.monthly.length}</strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => void handleSave()} loading={saving} className="flex-1">
          {t('buttons.save')}
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1">
          {t('buttons.cancel')}
        </Button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onConfirm={() => void handleExecuteCleanup()}
        onCancel={() => setConfirmOpen(false)}
        title={t('gfs.confirm_cleanup_title')}
        message={t('gfs.confirm_cleanup_message', {
          count: preview?.summary.deleteCount ?? 0,
          space: ((preview?.summary.spaceFreed ?? 0) / 1024 ** 3).toFixed(2),
        })}
        variant="danger"
      />
    </div>
  )
}
