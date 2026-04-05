import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recovery as recoveryApi, type BackupManifest } from '../api';
import { Button } from '../components/common/Button';
import ManifestBrowser from '../components/recovery/ManifestBrowser';
import RestoreWizard from '../components/recovery/RestoreWizard';
import FullServerRestoreWizard from '../components/recovery/FullServerRestoreWizard';
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

  useEffect(() => {
    loadStatus();
    loadManifests();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await recoveryApi.getStatus();
      setIsRecoveryMode(status.enabled);
    } catch {
      // non-critical: silently fail, remain in non-recovery mode
    }
  };

  const loadManifests = async () => {
    try {
      const data = await recoveryApi.getManifests();
      setManifests(data);
    } catch {
      // non-critical: show empty list
    }
  };

  const handleEnableRecovery = async () => {
    try {
      await recoveryApi.enable();
      setIsRecoveryMode(true);
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

  const handleFullServerRestore = (manifest: Manifest) => {
    setFullServerManifest(manifest);
    setShowFullServerWizard(true);
  };

  if (!isRecoveryMode) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="border-4 border-red-500 bg-[var(--bg-secondary)] p-8 text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-400">
            {t('recovery.disaster_recovery_mode')}
          </h1>

          <p className="mb-6 text-lg text-[var(--text-primary)]">
            {t('recovery.warning_message')}
          </p>

          <div className="bg-[var(--bg-elevated)] border-2 border-red-500 p-6 mb-6 text-left">
            <h2 className="font-bold mb-2 text-[var(--text-primary)]">{t('recovery.when_to_use')}</h2>
            <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
              <li>{t('recovery.use_case_1')}</li>
              <li>{t('recovery.use_case_2')}</li>
              <li>{t('recovery.use_case_3')}</li>
            </ul>
          </div>

          <Button
            variant="primary"
            onClick={handleEnableRecovery}
            className="bg-red-600 hover:bg-red-700"
          >
            {t('recovery.enable_recovery_mode')}
          </Button>
        </div>
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
        onClose={() => {
          setShowFullServerWizard(false);
          setFullServerManifest(null);
        }}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="bg-red-600 text-white p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">{t('recovery.recovery_mode_active')}</h1>
            <p className="text-sm">{t('recovery.normal_operations_suspended')}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleDisableRecovery}>
          {t('recovery.exit_recovery_mode')}
        </Button>
      </div>

      <ManifestBrowser
        manifests={manifests}
        onSelect={handleSelectManifest}
        onFullServerRestore={handleFullServerRestore}
        onRefresh={loadManifests}
      />
    </div>
  );
}
