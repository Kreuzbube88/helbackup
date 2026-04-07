import { useState } from 'react';
import { Lock, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { recovery as recoveryApi } from '../../api';
import { formatBytes } from '../../utils/format';
import UnlockBackupDialog from '../encryption/UnlockBackupDialog';
import DatabaseRestoreWizard from './DatabaseRestoreWizard';

interface ManifestEntry {
  path?: string;
  size?: number;
}

interface ContainerConfig {
  id: string;
  name: string;
  image?: string;
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
  job_name?: string;
  [key: string]: unknown;
}

function detectBackupTypes(entries: ManifestEntry[]): string[] {
  const types = new Set<string>()
  for (const e of entries) {
    const p = e.path ?? ''
    if (p.includes('/boot') || p.startsWith('boot/')) types.add('flash')
    if (p.includes('appdata')) types.add('appdata')
    if (p.includes('domains')) types.add('vms')
    if (p.includes('docker-images')) types.add('docker_images')
    if (p.includes('sysconfig')) types.add('sysconfig')
  }
  return [...types]
}

interface Props {
  manifests: Manifest[];
  onSelect: (manifest: Manifest) => void;
  onFullServerRestore: (manifest: Manifest) => void;
  onRefresh: () => void;
}

export default function ManifestBrowser({ manifests, onSelect, onFullServerRestore, onRefresh }: Props) {
  const { t } = useTranslation();
  const [pendingEncrypted, setPendingEncrypted] = useState<Manifest | null>(null);
  const [unlockedSessions, setUnlockedSessions] = useState<Map<string, string>>(new Map());
  const [dbRestoreManifest, setDbRestoreManifest] = useState<Manifest | null>(null);
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!scanPath.trim()) return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await recoveryApi.scan(scanPath.trim());
      if (result.count === 0) {
        setScanError(t('recovery.scan_no_results'));
      } else {
        onRefresh();
      }
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  const getBackupId = (m: Manifest) => m.backup_id ?? m.backupId ?? '';

  const isEncrypted = (parsed: ParsedManifest, m: Manifest): boolean => {
    if (typeof parsed.encrypted === 'boolean') return parsed.encrypted;
    if (typeof m.encrypted === 'boolean') return m.encrypted as boolean;
    return false;
  };

  const handleSelect = (manifest: Manifest) => {
    let parsed: ParsedManifest
    if (typeof manifest.manifest === 'string') {
      try { parsed = JSON.parse(manifest.manifest) as ParsedManifest } catch { parsed = {} }
    } else {
      parsed = manifest as ParsedManifest
    }
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
    return new Date(dateStr).toLocaleString(undefined);
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
        <div className="border-2 border-[var(--border-default)] p-8 text-center space-y-6">
          <p className="text-lg opacity-70">{t('recovery.no_backups_found')}</p>
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">{t('recovery.scan_hint')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanPath}
                onChange={e => setScanPath(e.target.value)}
                placeholder={t('recovery.scan_path_placeholder')}
                className="flex-1 px-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <Button variant="primary" onClick={handleScan} disabled={scanning || !scanPath.trim()}>
                <Search size={14} />
                {scanning ? t('recovery.scanning') : t('recovery.scan')}
              </Button>
            </div>
            {scanError && <p className="text-sm text-red-400">{scanError}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {manifests.map((manifest) => {
            let parsed: ParsedManifest;
            try {
              parsed = typeof manifest.manifest === 'string'
                ? JSON.parse(manifest.manifest) as ParsedManifest
                : manifest as ParsedManifest;
            } catch {
              parsed = {};
            }

            const backupId = getBackupId(manifest);
            const encrypted = isEncrypted(parsed, manifest);
            const unlocked = unlockedSessions.has(backupId);

            const totalSize = parsed.entries?.reduce((sum, e) => sum + (e.size ?? 0), 0) ?? 0;
            const fileCount = parsed.entries?.length ?? 0;
            const containerCount = parsed.containerConfigs?.length ?? 0;
            const externalVolumes = parsed.entries?.filter((e) => e.path?.includes('external-volumes')) ?? [];
            const verified = parsed.verified ?? false;
            const lastVerified = parsed.lastVerified;
            const backupTypes = detectBackupTypes(parsed.entries ?? []);

            return (
              <div
                key={backupId}
                className="border-2 border-[var(--border-default)] p-6 hover:border-blue-500 cursor-pointer"
                onClick={() => handleSelect(manifest)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">
                        {manifest.job_name ?? t('recovery.unknown_job')}
                      </h3>
                      {encrypted && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${unlocked ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                          <Lock size={10} />
                          {unlocked ? t('decryption.unlocked') : t('decryption.encrypted')}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-[var(--text-secondary)] mb-2">
                      {t('recovery.backup_from')} {formatDate(parsed.timestamp ?? manifest.created_at ?? '')}
                      {backupTypes.length > 0 && (
                        <span className="ml-3 inline-flex gap-1">
                          {backupTypes.map(type => (
                            <span key={type} className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-mono">
                              {t(`recovery.backup_type_${type}`, type)}
                            </span>
                          ))}
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
                        <span className="ml-2 font-bold">{formatBytes(totalSize)}</span>
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

                  <div className="flex flex-col gap-2">
                    <Button variant="primary">
                      {encrypted && !unlocked ? t('decryption.unlock') : t('recovery.restore')}
                    </Button>
                    {(!encrypted || unlocked) && (
                      <Button
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onFullServerRestore(manifest); }}
                      >
                        {t('recovery.full_server_restore_btn')}
                      </Button>
                    )}
                    {(!encrypted || unlocked) && containerCount > 0 && (
                      <Button
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); setDbRestoreManifest(manifest); }}
                      >
                        {t('recovery.restore_database')}
                      </Button>
                    )}
                  </div>
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

      {dbRestoreManifest && (() => {
        let parsed: ParsedManifest;
        try {
          parsed = typeof dbRestoreManifest.manifest === 'string'
            ? JSON.parse(dbRestoreManifest.manifest) as ParsedManifest
            : dbRestoreManifest as ParsedManifest;
        } catch {
          return null;
        }
        return (
          <div className="mt-6">
            <DatabaseRestoreWizard
              backupId={getBackupId(dbRestoreManifest)}
              containers={(parsed.containerConfigs ?? []) as Array<{ id: string; name: string; image: string }>}
              onClose={() => setDbRestoreManifest(null)}
            />
          </div>
        );
      })()}
    </div>
  );
}
