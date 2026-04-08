import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldX, Info } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { recovery } from '../../api';

interface ChecksumEntry {
  path: string;
  hash: string;
}

interface VerifyResults {
  passed: number;
  failed: number;
  missing: number;
  error?: string;
  note?: string;
}

interface Props {
  backupId: string;
  checksums: ChecksumEntry[];
  onComplete: () => void;
  onClose?: () => void;
}

export default function VerifyBackup({ backupId, checksums, onComplete, onClose }: Props) {
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState<VerifyResults | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await recovery.verifyBackup(backupId);
      setResults({ passed: result.passed, failed: result.failed, missing: result.missing, note: (result as { note?: string }).note });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResults({ passed: 0, failed: checksums.length, missing: 0, error: msg });
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <Card className="corner-cuts p-6 text-center border-[var(--theme-primary)]">
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 border-2 border-[var(--theme-glow)] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{t('recovery.verifying_backup')}…</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{t('recovery.verifying_checksums')}</p>
      </Card>
    );
  }

  if (results) {
    if (results.note === 'remote-not-accessible') {
      return (
        <Card className="corner-cuts p-6 border-[var(--theme-primary)]/60">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 border border-[var(--theme-primary)]/40 flex-shrink-0">
              <Info size={16} className="text-[var(--theme-glow)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t('recovery.nas_verify_title')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('recovery.nas_verify_body')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onComplete}>
              {t('recovery.proceed_with_restore')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose ?? onComplete}>
              {t('buttons.cancel')}
            </Button>
          </div>
        </Card>
      );
    }

    if (results.note === 'no-checksums') {
      return (
        <Card className="corner-cuts p-6 border-[var(--theme-primary)]/60">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 border border-[var(--theme-primary)]/40 flex-shrink-0">
              <Info size={16} className="text-[var(--theme-glow)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t('recovery.no_checksums_title')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{t('recovery.no_checksums_body')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onComplete}>
              {t('recovery.proceed_with_restore')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose ?? onComplete}>
              {t('buttons.cancel')}
            </Button>
          </div>
        </Card>
      );
    }

    const allPassed = results.failed === 0 && results.missing === 0;

    return (
      <Card className={`corner-cuts p-6 ${allPassed ? 'border-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.15)]' : 'border-red-500/60 shadow-[0_0_16px_rgba(239,68,68,0.15)]'}`}>
        <div className="flex items-center gap-2 mb-4">
          {allPassed
            ? <ShieldCheck size={18} className="text-emerald-400" />
            : <ShieldX size={18} className="text-red-400" />
          }
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t('recovery.verification_complete')}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[var(--bg-secondary)] border border-emerald-500/30 p-3 text-center">
            <div className="text-2xl font-bold font-mono text-emerald-400">{results.passed}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('recovery.passed')}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-red-500/30 p-3 text-center">
            <div className="text-2xl font-bold font-mono text-red-400">{results.failed}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('recovery.failed')}</div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-amber-500/30 p-3 text-center">
            <div className="text-2xl font-bold font-mono text-amber-400">{results.missing}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('recovery.missing')}</div>
          </div>
        </div>

        {!allPassed && (
          <div className="flex items-start gap-2 bg-[var(--bg-secondary)] border border-red-500/40 p-3 mb-4 text-xs text-[var(--text-secondary)]">
            <ShieldX size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-red-400">{t('recovery.verification_failed')}</span>
              {' — '}
              {t('recovery.verification_failed_hint')}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {allPassed ? (
            <Button variant="primary" size="sm" onClick={onComplete}>
              {t('recovery.proceed_with_restore')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose ?? onComplete}>
                {t('buttons.close')}
              </Button>
              <Button variant="secondary" size="sm" className="border-amber-500/60 text-amber-400 hover:border-amber-400" onClick={onComplete}>
                {t('recovery.proceed_anyway')}
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="corner-cuts p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 border border-[var(--theme-glow)]/40 flex-shrink-0">
          <ShieldCheck size={16} className="text-[var(--theme-glow)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('recovery.verify_backup')}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">{t('recovery.verify_backup_description')}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] p-3 mb-4 text-xs font-mono text-[var(--text-muted)]">
        {t('recovery.checksums_count')}: <span className="text-[var(--theme-glow)]">{checksums.length}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleVerify}>
          {t('recovery.start_verification')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onComplete}>
          {t('recovery.skip_verification')}
        </Button>
      </div>
    </Card>
  );
}
