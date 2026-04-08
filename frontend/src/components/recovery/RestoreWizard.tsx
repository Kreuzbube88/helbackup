import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, FolderOpen } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { useToast } from '../common/Toast';
import { recovery as recoveryApi } from '../../api';
import { formatBytes } from '../../utils/format';
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

interface ManifestEntry {
  path: string;
  size?: number;
}

interface ParsedManifest {
  containerConfigs?: ContainerConfig[];
  entries?: ManifestEntry[];
  checksums?: ChecksumEntry[];
}

interface Manifest {
  backup_id?: string;
  backupId?: string;
  manifest?: string;
  [key: string]: unknown;
}

interface Props {
  manifest: Manifest;
  onClose: () => void;
  onComplete: () => void;
}

const TYPE_DEST: Record<string, string> = {
  flash: '/boot',
  appdata: '/mnt/user/appdata',
  vms: '/mnt/user/domains',
  docker_images: '/mnt/user',
  system_config: '/mnt/user',
  custom: '/mnt/user',
}

function getDefaultDestination(entries: ManifestEntry[], stepType?: string): string {
  if (stepType && TYPE_DEST[stepType]) return TYPE_DEST[stepType]
  const paths = entries.map(e => e.path)
  if (paths.some(p => p.includes('/boot') || p.startsWith('boot/'))) return '/boot'
  if (paths.some(p => p.includes('appdata'))) return '/mnt/user/appdata'
  if (paths.some(p => p.includes('domains'))) return '/mnt/user/domains'
  return '/mnt/user'
}

const STEP_LABELS = ['recovery.verify_backup', 'recovery.step_1_containers', 'recovery.step_2_files']

export default function RestoreWizard({ manifest, onClose, onComplete }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const backupId = manifest.backup_id ?? manifest.backupId ?? '';

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
  const allFiles = parsed.entries ?? [];
  const primaryStepType = (parsed as { stepPaths?: Array<{ type: string }> }).stepPaths?.[0]?.type ?? '';

  const [step, setStep] = useState(0);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [restoreDestination, setRestoreDestination] = useState(() => getDefaultDestination(allFiles, primaryStepType));

  const handleFileToggle = (filePath: string) => {
    setSelectedFiles(prev =>
      prev.includes(filePath) ? prev.filter(f => f !== filePath) : [...prev, filePath]
    );
  };

  const handleSelectAllFiles = () => setSelectedFiles(allFiles.map(f => f.path));
  const handleDeselectAllFiles = () => setSelectedFiles([]);

  const handleContainerToggle = (id: string) => {
    setSelectedContainers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRestoreContainers = async () => {
    try {
      await recoveryApi.restoreContainers(backupId, selectedContainers);
      toast(t('recovery.containers_restored'), 'success');
      setStep(2);
    } catch (error: unknown) {
      toast(t('recovery.restore_error', { message: error instanceof Error ? error.message : String(error) }), 'error');
    }
  };

  const handleRestoreFiles = async () => {
    try {
      await recoveryApi.restoreFiles(backupId, selectedFiles, restoreDestination);
      toast(t('recovery.files_restored'), 'success');
      onComplete();
    } catch (error: unknown) {
      toast(t('recovery.restore_error', { message: error instanceof Error ? error.message : String(error) }), 'error');
    }
  };

  return (
    <div className="flex-1 p-6 bg-grid relative overflow-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('recovery.restore_wizard')}
          </h1>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
        </div>

        {/* Progress steps — hide container step when backup has no containers */}
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => {
            if (i === 1 && containers.length === 0) return null;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 flex-1 px-3 py-2 border text-xs font-mono transition-colors ${
                  step === i
                    ? 'border-[var(--theme-glow)] text-[var(--theme-glow)] bg-[var(--bg-elevated)] shadow-[inset_0_0_12px_rgba(6,182,212,0.08)]'
                    : step > i
                    ? 'border-emerald-500/40 text-emerald-400 bg-[var(--bg-secondary)]'
                    : 'border-[var(--border-default)] text-[var(--text-muted)] bg-[var(--bg-secondary)]'
                }`}>
                  <span className={`w-4 h-4 flex items-center justify-center text-xs flex-shrink-0 ${step > i ? 'text-emerald-400' : ''}`}>
                    {step > i ? '✓' : i + 1}
                  </span>
                  <span className="truncate">{t(label)}</span>
                </div>
                {i < STEP_LABELS.length - 1 && containers.length > 0 && (
                  <div className={`w-4 h-px flex-shrink-0 ${step > i ? 'bg-emerald-500/40' : 'bg-[var(--border-default)]'}`} />
                )}
                {i === 0 && containers.length === 0 && (
                  <div className={`w-4 h-px flex-shrink-0 ${step > i ? 'bg-emerald-500/40' : 'bg-[var(--border-default)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Verify */}
        {step === 0 && (
          <VerifyBackup
            backupId={backupId}
            checksums={parsed.checksums ?? []}
            onComplete={() => setStep(containers.length > 0 ? 1 : 2)}
            onClose={onClose}
          />
        )}

        {/* Step 1: Containers */}
        {step === 1 && (
          <Card className="corner-cuts p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={16} className="text-[var(--theme-glow)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('recovery.step_1_containers')}
              </h2>
            </div>

            {containers.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center font-mono">
                {t('recovery.no_containers_in_backup')}
              </p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto mb-4">
                {containers.map((container) => (
                  <label
                    key={container.id}
                    className="flex items-center gap-3 p-2 hover:bg-[var(--bg-elevated)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContainers.includes(container.id)}
                      onChange={() => handleContainerToggle(container.id)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{container.name}</div>
                      <div className="text-xs font-mono text-[var(--text-muted)] truncate">{container.image}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                {t('recovery.back')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
                {t('recovery.skip')}
              </Button>
              {containers.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRestoreContainers}
                  disabled={selectedContainers.length === 0}
                >
                  {t('recovery.restore_selected')} ({selectedContainers.length})
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Step 2: Files */}
        {step === 2 && (
          <Card className="corner-cuts p-5">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen size={16} className="text-[var(--theme-glow)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('recovery.step_2_files')}
              </h2>
            </div>

            <div className="mb-4">
              <Input
                label={t('recovery.restore_destination')}
                value={restoreDestination}
                onChange={(e) => setRestoreDestination(e.target.value)}
              />
            </div>

            {allFiles.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center font-mono">
                {t('recovery.no_files_in_backup')}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {allFiles.length} {t('recovery.total_files').toLowerCase()}
                  </span>
                  <button onClick={handleSelectAllFiles} className="text-xs text-[var(--theme-glow)] hover:underline">
                    {t('recovery.select_all')}
                  </button>
                  <button onClick={handleDeselectAllFiles} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline">
                    {t('recovery.deselect_all')}
                  </button>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] p-2 mb-4 max-h-72 overflow-y-auto font-mono text-xs">
                  {allFiles.map((entry) => (
                    <label
                      key={entry.path}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--bg-elevated)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(entry.path)}
                        onChange={() => handleFileToggle(entry.path)}
                        className="w-3.5 h-3.5 flex-shrink-0"
                      />
                      <span className="truncate flex-1 text-[var(--text-secondary)]">{entry.path}</span>
                      {entry.size !== undefined && (
                        <span className="text-[var(--text-muted)] flex-shrink-0">{formatBytes(entry.size)}</span>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(containers.length > 0 ? 1 : 0)}>
                {t('recovery.back')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRestoreFiles}
                disabled={selectedFiles.length === 0}
              >
                {t('recovery.restore_files')} ({selectedFiles.length})
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
