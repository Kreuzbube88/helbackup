import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import UnlockBackupDialog from '../encryption/UnlockBackupDialog';

interface ManifestEntry {
  path?: string;
  size?: number;
}

interface ContainerConfig {
  id: string;
  name: string;
}

interface ParsedManifest {
  timestamp?: string;
  entries?: ManifestEntry[];
  containerConfigs?: ContainerConfig[];
  helbackupExport?: boolean;
  verified?: boolean;
  lastVerified?: string;
  encrypted?: boolean;
}

interface Manifest {
  backup_id?: string;
  backupId?: string;
  created_at?: string;
  manifest?: string;
  [key: string]: unknown;
}

interface Props {
  manifests: Manifest[];
  onSelect: (manifest: Manifest) => void;
  onRefresh: () => void;
}

export default function ManifestBrowser({ manifests, onSelect, onRefresh }: Props) {
  const { t } = useTranslation();
  const [pendingEncrypted, setPendingEncrypted] = useState<Manifest | null>(null);
  const [unlockedSessions, setUnlockedSessions] = useState<Map<string, string>>(new Map());

  const getBackupId = (m: Manifest) => m.backup_id ?? m.backupId ?? '';

  const isEncrypted = (parsed: ParsedManifest, m: Manifest): boolean => {
    if (typeof parsed.encrypted === 'boolean') return parsed.encrypted;
    if (typeof m.encrypted === 'boolean') return m.encrypted as boolean;
    return false;
  };

  const handleSelect = (manifest: Manifest) => {
    const parsed: ParsedManifest = typeof manifest.manifest === 'string'
      ? JSON.parse(manifest.manifest) as ParsedManifest
      : manifest as ParsedManifest;
    const backupId = getBackupId(manifest);

    if (isEncrypted(parsed, manifest) && !unlockedSessions.has(backupId)) {
      setPendingEncrypted(manifest);
    } else {
      onSelect(manifest);
    }
  };

  const handleUnlocked = (sessionId: string, manifest: Manifest) => {
    const backupId = getBackupId(manifest);
    setUnlockedSessions(new Map(unlockedSessions).set(backupId, sessionId));
    setPendingEncrypted(null);
    onSelect(manifest);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('recovery.available_backups')}</h2>
        <Button variant="secondary" onClick={onRefresh}>
          {t('recovery.refresh')}
        </Button>
      </div>

      {manifests.length === 0 ? (
        <div className="border-2 border-[var(--border-default)] p-8 text-center">
          <p className="text-lg opacity-70">{t('recovery.no_backups_found')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manifests.map((manifest) => {
            const parsed: ParsedManifest = typeof manifest.manifest === 'string'
              ? JSON.parse(manifest.manifest) as ParsedManifest
              : manifest as ParsedManifest;

            const backupId = getBackupId(manifest);
            const encrypted = isEncrypted(parsed, manifest);
            const unlocked = unlockedSessions.has(backupId);

            const totalSize = parsed.entries?.reduce((sum, e) => sum + (e.size ?? 0), 0) ?? 0;
            const fileCount = parsed.entries?.length ?? 0;
            const containerCount = parsed.containerConfigs?.length ?? 0;
            const externalVolumes = parsed.entries?.filter((e) => e.path?.includes('external-volumes')) ?? [];
            const verified = parsed.verified ?? false;
            const lastVerified = parsed.lastVerified;

            return (
              <div
                key={backupId}
                className="border-2 border-[var(--border-default)] p-6 hover:border-blue-500 cursor-pointer"
                onClick={() => handleSelect(manifest)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">
                        {t('recovery.backup_from')} {formatDate(parsed.timestamp ?? manifest.created_at ?? '')}
                      </h3>
                      {encrypted && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${unlocked ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                          <Lock size={10} />
                          {unlocked ? t('decryption.unlocked') : t('decryption.encrypted')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="opacity-70">{t('recovery.files')}:</span>
                        <span className="ml-2 font-bold">{fileCount}</span>
                      </div>
                      <div>
                        <span className="opacity-70">{t('recovery.containers')}:</span>
                        <span className="ml-2 font-bold">{containerCount}</span>
                      </div>
                      <div>
                        <span className="opacity-70">{t('recovery.total_size')}:</span>
                        <span className="ml-2 font-bold">{formatSize(totalSize)}</span>
                      </div>
                    </div>

                    {parsed.helbackupExport && (
                      <div className="mt-2 text-sm text-green-600 font-bold">
                        {t('recovery.includes_helbackup_config')}
                      </div>
                    )}

                    {externalVolumes.length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="opacity-70">{t('recovery.external_volumes')}:</span>
                        <span className="ml-2 font-bold">{externalVolumes.length} {t('recovery.volumes')}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      {verified ? (
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold">
                          ✓ {t('recovery.verified')}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-500 text-white text-sm font-bold">
                          ⚠ {t('recovery.not_verified')}
                        </span>
                      )}
                      {lastVerified && (
                        <span className="text-sm opacity-70">
                          {t('recovery.last_verified')}: {new Date(lastVerified).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="primary">
                    {encrypted && !unlocked ? t('decryption.unlock') : t('recovery.restore')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingEncrypted && (
        <UnlockBackupDialog
          backupId={getBackupId(pendingEncrypted)}
          onUnlock={(sessionId) => handleUnlocked(sessionId, pendingEncrypted)}
          onCancel={() => setPendingEncrypted(null)}
        />
      )}
    </div>
  );
}
