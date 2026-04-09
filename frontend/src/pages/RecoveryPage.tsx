import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldOff, AlertTriangle } from 'lucide-react';
import { recovery as recoveryApi, type BackupManifest } from '../api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import ManifestBrowser from '../components/recovery/ManifestBrowser';
import RestoreWizard from '../components/recovery/RestoreWizard';
import FullServerRestoreWizard from '../components/recovery/FullServerRestoreWizard';
import { FirstBackupWizard } from '../components/onboarding/FirstBackupWizard';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/common/Toast';

type Manifest = BackupManifest

export default function RecoveryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [selectedManifest, setSelectedManifest] = useState<Manifest | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showFullServerWizard, setShowFullServerWizard] = useState(false);
  const [fullServerManifest, setFullServerManifest] = useState<Manifest | null>(null);
  const [fullServerBackupTypes, setFullServerBackupTypes] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadManifests();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await recoveryApi.getStatus();
      setIsRecoveryMode(status.enabled);
    } catch {
      // non-critical
    }
  };

  const loadManifests = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await recoveryApi.getManifests();
      setManifests(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEnableRecovery = async () => {
    try {
      await recoveryApi.enable();
      setIsRecoveryMode(true);
      await loadManifests();
      toast(t('recovery.recovery_mode_enabled'), 'success');
    } catch (error: unknown) {
      toast(`${t('recovery.failed_enable')}: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const handleDisableRecovery = async () => {
    try {
      await recoveryApi.disable();
      setIsRecoveryMode(false);
      toast(t('recovery.recovery_mode_disabled'), 'success');
      navigate('/');
    } catch (error: unknown) {
      toast(`${t('recovery.failed_disable')}: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const handleSelectManifest = (manifest: Manifest) => {
    setSelectedManifest(manifest);
    setShowWizard(true);
  };

  const handleFullServerRestore = (manifest: Manifest, backupTypes: string[]) => {
    setFullServerManifest(manifest);
    setFullServerBackupTypes(backupTypes);
    setShowFullServerWizard(true);
  };

  if (!isRecoveryMode) {
    return (
      <div className="flex-1 p-6 bg-grid relative flex items-start justify-center pt-16">
        <div className="w-full max-w-lg space-y-4 animate-slide-up">
          <Card className="border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.25)] corner-cuts p-8 text-center">
            {/* Neon top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            <div className="flex justify-center mb-4">
              <div className="p-3 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <ShieldAlert size={32} className="text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2 text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.6)' }}>
              {t('recovery.disaster_recovery_mode')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {t('recovery.warning_message')}
            </p>

            <div className="bg-[var(--bg-secondary)] border border-red-500/40 p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                {t('recovery.when_to_use')}
              </p>
              <ul className="space-y-1.5">
                {['use_case_1', 'use_case_2', 'use_case_3'].map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="w-1 h-1 bg-red-400 flex-shrink-0" />
                    {t(`recovery.${key}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Button
                variant="danger"
                className="w-full"
                onClick={handleEnableRecovery}
              >
                <ShieldAlert size={14} />
                {t('recovery.enable_recovery_mode')}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowGuide(true)}>
                {t('guide.open_guide')}
              </Button>
            </div>
          </Card>
        </div>

        <FirstBackupWizard
          open={showGuide}
          onClose={() => setShowGuide(false)}
          onSuccess={() => { /* no refresh needed here */ }}
        />
      </div>
    );
  }

  if (showWizard && selectedManifest) {
    return (
      <RestoreWizard
        manifest={selectedManifest}
        onClose={() => {
          setShowWizard(false);
          setSelectedManifest(null);
        }}
        onComplete={handleDisableRecovery}
      />
    );
  }

  if (showFullServerWizard && fullServerManifest) {
    return (
      <FullServerRestoreWizard
        manifest={fullServerManifest}
        availableTypes={fullServerBackupTypes}
        onClose={() => {
          setShowFullServerWizard(false);
          setFullServerManifest(null);
          setFullServerBackupTypes([]);
        }}
      />
    );
  }

  return (
    <div className="flex-1 p-6 bg-grid relative space-y-4 overflow-auto">
      {/* Recovery mode active banner */}
      <div className="border border-red-500 bg-[var(--bg-card)] shadow-[0_0_16px_rgba(239,68,68,0.2)] p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 animate-ping bg-red-500 opacity-30 rounded-full" />
            <ShieldAlert size={18} className="text-red-400 relative" />
          </div>
          <div>
            <span className="text-sm font-semibold text-red-400">
              {t('recovery.recovery_mode_active')}
            </span>
            <span className="ml-3 text-xs text-[var(--text-muted)]">
              {t('recovery.normal_operations_suspended')}
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleDisableRecovery}>
          <ShieldOff size={14} />
          {t('recovery.exit_recovery_mode')}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm font-mono">
          {t('loading')}
        </div>
      )}
      {loadError && (
        <Card className="border border-red-500/60 p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={14} />
            {t('error')}: {loadError}
          </div>
        </Card>
      )}
      {!loading && (
        <ManifestBrowser
          manifests={manifests}
          onSelect={handleSelectManifest}
          onFullServerRestore={handleFullServerRestore}
          onRefresh={loadManifests}
        />
      )}
    </div>
  );
}
