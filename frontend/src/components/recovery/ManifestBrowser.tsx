import { useState } from 'react';
import { Lock, Search, RefreshCw, HardDrive, Server, Cpu, Package, Settings, Trash2, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
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
  stepPaths?: Array<{ type: string; path: string }>;
}

interface Manifest {
  backup_id?: string;
  backupId?: string;
  created_at?: string;
  manifest?: string;
  job_name?: string;
  [key: string]: unknown;
}

interface Props {
  manifests: Manifest[];
  onSelect: (manifest: Manifest) => void;
  onFullServerRestore: (manifest: Manifest, backupTypes: string[]) => void;
  onRefresh: () => void;
}

const BACKUP_TYPE_ICONS: Record<string, React.ReactNode> = {
  flash: <HardDrive size={10} />,
  appdata: <Package size={10} />,
  vms: <Cpu size={10} />,
  docker_images: <Server size={10} />,
  sysconfig: <Settings size={10} />,
  helbackup_self: <Shield size={10} />,
}

function detectBackupTypes(entries: ManifestEntry[], stepPaths?: Array<{ type: string }>): string[] {
  if (stepPaths && stepPaths.length > 0) {
    return [...new Set(stepPaths.map(s => s.type))]
  }
  // legacy fallback for manifests without stepPaths
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

export default function ManifestBrowser({ manifests, onSelect, onFullServerRestore, onRefresh }: Props) {
  const { t } = useTranslation();
  const [pendingEncrypted, setPendingEncrypted] = useState<Manifest | null>(null);
  const [unlockedSessions, setUnlockedSessions] = useState<Map<string, string>>(new Map());
  const [dbRestoreManifest, setDbRestoreManifest] = useState<Manifest | null>(null);
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    if (deleteConfirmStep === 1) { setDeleteConfirmStep(2); return; }
    setDeleting(true);
    try {
      await recoveryApi.deleteBackup(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmStep(1);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('recovery.available_backups')}
        </h2>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw size={12} />
          {t('recovery.refresh')}
        </Button>
      </div>

      {manifests.length === 0 ? (
        <Card className="p-8 text-center space-y-4 corner-cuts">
          <p className="text-sm text-[var(--text-muted)]">{t('recovery.no_backups_found')}</p>
          <div className="max-w-sm mx-auto space-y-2">
            <p className="text-xs text-[var(--text-muted)]">{t('recovery.scan_hint')}</p>
            <div className="flex gap-2">
              <Input
                value={scanPath}
                onChange={e => setScanPath(e.target.value)}
                placeholder={t('recovery.scan_path_placeholder')}
                className="flex-1 text-xs"
              />
              <Button variant="primary" size="sm" onClick={handleScan} disabled={scanning || !scanPath.trim()}>
                <Search size={12} />
                {scanning ? t('recovery.scanning') : t('recovery.scan')}
              </Button>
            </div>
            {scanError && <p className="text-xs text-red-400">{scanError}</p>}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
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
            const backupTypes = detectBackupTypes(parsed.entries ?? [], parsed.stepPaths);
            const restorableTypes = backupTypes.filter(t => t !== 'helbackup_self');
            const hasSelfBackup = backupTypes.includes('helbackup_self');

            return (
              <Card
                key={backupId}
                hover={restorableTypes.length > 0}
                onClick={() => restorableTypes.length > 0 ? handleSelect(manifest) : undefined}
                className="corner-cuts p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                        {manifest.job_name ?? t('recovery.unknown_job')}
                      </h3>
                      {encrypted && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono ${unlocked ? 'border border-emerald-500 text-emerald-400' : 'border border-amber-500 text-amber-400'}`}>
                          <Lock size={9} />
                          {unlocked ? t('decryption.unlocked') : t('decryption.encrypted')}
                        </span>
                      )}
                    </div>

                    {/* Date + type badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {formatDate(parsed.timestamp ?? manifest.created_at ?? '')}
                      </span>
                      {backupTypes.map(type => (
                        <span key={type} className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-[var(--border-default)] text-[var(--text-muted)] text-xs font-mono">
                          {BACKUP_TYPE_ICONS[type]}
                          {t(`recovery.backup_type_${type}`, type)}
                        </span>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
                      <span>{fileCount} {t('recovery.files').toLowerCase()}</span>
                      {containerCount > 0 && (
                        <span>{containerCount} {t('recovery.containers').toLowerCase()}</span>
                      )}
                      {totalSize > 0 && (
                        <span className="text-[var(--text-secondary)]">{formatBytes(totalSize)}</span>
                      )}
                    </div>

                    {parsed.helbackupExport && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-mono text-[var(--theme-glow)] border border-[var(--theme-glow)]/40 px-1.5 py-0.5">
                          {t('recovery.includes_helbackup_config')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {restorableTypes.length > 0 && (
                      <Button variant="primary" size="sm" onClick={() => handleSelect(manifest)}>
                        {encrypted && !unlocked ? t('decryption.unlock') : t('recovery.restore')}
                      </Button>
                    )}
                    {(!encrypted || unlocked) && restorableTypes.length > 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onFullServerRestore(manifest, restorableTypes)}
                      >
                        {t('recovery.full_server_restore_btn')}
                      </Button>
                    )}
                    {hasSelfBackup && restorableTypes.length === 0 && (
                      <span className="text-xs font-mono text-[var(--text-muted)] border border-[var(--border-default)] px-2 py-1 text-center leading-tight">
                        {t('recovery.self_backup_restore_hint')}
                      </span>
                    )}
                    {(!encrypted || unlocked) && containerCount > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDbRestoreManifest(manifest)}
                      >
                        {t('recovery.restore_database')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border-red-500/40 text-red-400 hover:border-red-400"
                      onClick={() => { setDeleteConfirmId(backupId); setDeleteConfirmStep(1); }}
                    >
                      <Trash2 size={12} />
                      {t('recovery.delete_backup')}
                    </Button>
                  </div>
                </div>
              </Card>
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

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
          <div className="bg-[var(--bg-elevated)] border border-red-500/60 p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
              {deleteConfirmStep === 1 ? t('recovery.delete_backup') : t('recovery.delete_backup_confirm_title')}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {deleteConfirmStep === 1
                ? t('recovery.delete_backup_body')
                : t('recovery.delete_backup_confirm_body')}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmStep(1); }}>
                {t('buttons.cancel')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="border-red-500/60 text-red-400 hover:border-red-400"
                disabled={deleting}
                onClick={() => void handleDeleteConfirm()}
              >
                {deleteConfirmStep === 1 ? t('recovery.delete_backup') : t('recovery.delete_backup_confirm_action')}
              </Button>
            </div>
          </div>
        </div>
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
          <div className="mt-4">
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
