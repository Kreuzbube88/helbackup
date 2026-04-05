import { useTranslation } from 'react-i18next'
import { HardDrive, Briefcase, Zap } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'

const STORAGE_KEY = 'helbackup_onboarding_done'

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markOnboardingDone(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

interface Props {
  open: boolean
  onClose: () => void
  onStartGuide: () => void
}

export function OnboardingTour({ open, onClose, onStartGuide }: Props) {
  const { t } = useTranslation()

  function handleSkip() {
    markOnboardingDone()
    onClose()
  }

  function handleStart() {
    markOnboardingDone()
    onClose()
    onStartGuide()
  }

  return (
    <Modal open={open} onClose={handleSkip} title={t('guide.onboarding_title')} className="max-w-lg">
      <div className="space-y-5">
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t('guide.onboarding_text')}
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <HardDrive size={16} className="text-[var(--theme-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('guide.step_target')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('guide.step_target_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <Briefcase size={16} className="text-[var(--theme-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('guide.step_backup')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('guide.step_backup_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <Zap size={16} className="text-[var(--theme-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {t('guide.step_schedule')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('guide.step_schedule_desc')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-[var(--border-default)]">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            {t('guide.skip')}
          </Button>
          <Button type="button" variant="primary" onClick={handleStart}>
            {t('guide.start_guide')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
