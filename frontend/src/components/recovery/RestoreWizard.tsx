import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { recovery as recoveryApi } from '../../api';
import VerifyBackup from './VerifyBackup';

interface ContainerConfig {
  id: string;
  name: string;
  image: string;
}

interface ChecksumEntry {
  path: string;
  hash: string;
}

interface ParsedManifest {
  containerConfigs?: ContainerConfig[];
  entries?: unknown[];
  checksums?: ChecksumEntry[];
}

interface Manifest {
  backup_id?: string;
  manifest?: string;
  [key: string]: unknown;
}

interface Props {
  manifest: Manifest;
  onClose: () => void;
  onComplete: () => void;
}

export default function RestoreWizard({ manifest, onClose, onComplete }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [restoreDestination, setRestoreDestination] = useState('/mnt/user');

  let parsed: ParsedManifest = {};
  if (typeof manifest.manifest === 'string') {
    try {
      parsed = JSON.parse(manifest.manifest) as ParsedManifest;
    } catch {
      parsed = {};
    }
  } else {
    parsed = manifest as ParsedManifest;
  }

  const containers = parsed.containerConfigs ?? [];
  const files = parsed.entries ?? [];

  const handleContainerToggle = (id: string) => {
    setSelectedContainers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRestoreContainers = async () => {
    try {
      await recoveryApi.restoreContainers(manifest.backup_id ?? '', selectedContainers);
      toast(t('recovery.containers_restored'), 'success');
      setStep(2);
    } catch (error: unknown) {
      toast(t('recovery.restore_error', { message: error instanceof Error ? error.message : String(error) }), 'error');
    }
  };

  const handleRestoreFiles = async () => {
    try {
      await recoveryApi.restoreFiles(manifest.backup_id ?? '', [], restoreDestination);
      toast(t('recovery.files_restored'), 'success');
      onComplete();
    } catch (error: unknown) {
      toast(t('recovery.restore_error', { message: error instanceof Error ? error.message : String(error) }), 'error');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('recovery.restore_wizard')}</h1>
        <Button variant="secondary" onClick={onClose}>
          {t('buttons.cancel')}
        </Button>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className={`flex-1 h-2 ${step >= 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <div className={`flex-1 h-2 ${step >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <div className={`flex-1 h-2 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`} />
        <div className={`flex-1 h-2 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-300'}`} />
      </div>

      {step === 0 && (
        <VerifyBackup
          backupId={manifest.backup_id ?? ''}
          checksums={parsed.checksums ?? []}
          onComplete={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">{t('recovery.step_1_containers')}</h2>

          {containers.length === 0 ? (
            <div className="border-2 border-[var(--border-default)] p-8 text-center mb-6">
              <p>{t('recovery.no_containers_in_backup')}</p>
            </div>
          ) : (
            <div className="border-2 border-[var(--border-default)] p-6 mb-6 max-h-96 overflow-y-auto">
              {containers.map((container) => (
                <div key={container.id} className="flex items-center gap-4 p-2 hover:bg-[var(--bg-elevated)]">
                  <input
                    type="checkbox"
                    checked={selectedContainers.includes(container.id)}
                    onChange={() => handleContainerToggle(container.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-bold">{container.name}</div>
                    <div className="text-sm opacity-70">{container.image}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => setStep(2)}>
              {t('recovery.skip')}
            </Button>
            <Button
              variant="primary"
              onClick={handleRestoreContainers}
              disabled={selectedContainers.length === 0}
            >
              {t('recovery.restore_selected')} ({selectedContainers.length})
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">{t('recovery.step_2_files')}</h2>

          <div className="mb-4">
            <label className="block mb-2 font-bold">{t('recovery.restore_destination')}</label>
            <input
              type="text"
              value={restoreDestination}
              onChange={(e) => setRestoreDestination(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[var(--border-default)]"
            />
          </div>

          <div className="border-2 border-[var(--border-default)] p-6 mb-6 max-h-96 overflow-y-auto">
            <p className="text-sm opacity-70 mb-4">
              {t('recovery.total_files')}: {files.length}
            </p>
            <div className="text-sm">
              {t('recovery.all_files_will_be_restored')}
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => setStep(1)}>
              {t('recovery.back')}
            </Button>
            <Button variant="primary" onClick={handleRestoreFiles}>
              {t('recovery.restore_files')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
