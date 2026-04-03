import { useTranslation } from 'react-i18next'
import { Card } from '../components/common/Card'
import { Activity, HardDrive, Briefcase, CheckCircle } from 'lucide-react'

export function Dashboard() {
  const { t } = useTranslation()

  const stats = [
    { label: t('nav.jobs'),    value: '0', icon: <Briefcase size={16} />,   color: 'var(--theme-primary)' },
    { label: t('nav.targets'), value: '0', icon: <HardDrive size={16} />,   color: 'var(--theme-accent)' },
    { label: t('status.success'), value: '0', icon: <CheckCircle size={16} />, color: '#10B981' },
    { label: t('status.running'), value: '0', icon: <Activity size={16} />,   color: '#F97316' },
  ]

  return (
    <div className="flex-1 p-6 overflow-auto bg-grid relative">
      {/* Background watermark */}
      <div className="fixed inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <img src="/logo.png" alt="" className="w-1/2 max-w-2xl" />
      </div>

      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6 relative">
        {t('nav.dashboard')}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative">
        {stats.map(stat => (
          <Card key={stat.label} hover glow className="flex items-center gap-4 border-holographic glow-intense card-lift relative overflow-hidden group corner-cuts">
            <div
              className="p-2 shrink-0"
              style={{ color: stat.color, backgroundColor: `${stat.color}18` }}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-[var(--text-primary)]">
                {stat.value}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex items-center justify-center py-16 border-holographic corner-cuts">
        <div className="text-center">
          <div className="pulse-glow inline-block mb-3">
            <Activity size={40} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Keine laufenden Jobs</p>
        </div>
      </Card>
    </div>
  )
}
