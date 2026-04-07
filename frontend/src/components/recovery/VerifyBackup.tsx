import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
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
      setResults({ passed: result.passed, failed: result.failed, missing: result.missing });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResults({ passed: 0, failed: checksums.length, missing: 0, error: msg });
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="border-2 border-blue-500 bg-[var(--bg-secondary)] p-6 text-center">
        <div className="text-xl font-bold mb-4">{t('recovery.verifying_backup')}...</div>
        <div className="text-sm opacity-70">{t('recovery.verifying_checksums')}</div>
      </div>
    );
  }

  if (results) {
    if (results.note === 'no-checksums') {
      return (
        <div className="border-2 border-blue-400 p-6 bg-[var(--bg-secondary)]">
          <h3 className="text-xl font-bold mb-4">ℹ {t('recovery.no_checksums_title')}</h3>
          <p className="text-sm mb-6 text-[var(--text-secondary)]">{t('recovery.no_checksums_body')}</p>
          <div className="flex gap-4">
            <Button variant="primary" onClick={onComplete}>
              {t('recovery.proceed_with_restore')}
            </Button>
            <Button variant="secondary" onClick={onClose ?? onComplete}>
              {t('buttons.cancel')}
            </Button>
          </div>
        </div>
      );
    }

    const allPassed = results.failed === 0 && results.missing === 0;

    return (
      <div className={`border-2 p-6 ${allPassed ? 'border-green-500' : 'border-red-500'} bg-[var(--bg-secondary)]`}>
        <h3 className="text-xl font-bold mb-4">
          {allPassed ? '✓ ' : '✗ '}
          {t('recovery.verification_complete')}
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">{results.passed}</div>
            <div className="text-sm">{t('recovery.passed')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{results.failed}</div>
            <div className="text-sm">{t('recovery.failed')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">{results.missing}</div>
            <div className="text-sm">{t('recovery.missing')}</div>
          </div>
        </div>

        {!allPassed && (
          <div className="bg-[var(--bg-elevated)] border-2 border-red-500 p-4 mb-4">
            <p className="font-bold">⚠️ {t('recovery.verification_failed')}</p>
            <p className="text-sm mt-2">{t('recovery.verification_failed_hint')}</p>
          </div>
        )}

        <div className="flex gap-4">
          {allPassed ? (
            <Button variant="primary" onClick={onComplete}>
              {t('recovery.proceed_with_restore')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose ?? onComplete}>
                {t('buttons.close')}
              </Button>
              <Button variant="primary" className="bg-yellow-600 hover:bg-yellow-700" onClick={onComplete}>
                {t('recovery.proceed_anyway')}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-[var(--border-default)] p-6">
      <h3 className="text-xl font-bold mb-4">{t('recovery.verify_backup')}</h3>

      <p className="mb-4 opacity-70">{t('recovery.verify_backup_description')}</p>

      <div className="bg-[var(--bg-elevated)] border-2 border-blue-500 p-4 mb-6">
        <p className="text-sm">
          {t('recovery.checksums_count')}: <strong>{checksums.length}</strong>
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant="primary" onClick={handleVerify}>
          {t('recovery.start_verification')}
        </Button>
        <Button variant="secondary" onClick={onComplete}>
          {t('recovery.skip_verification')}
        </Button>
      </div>
    </div>
  );
}
