import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';

interface ManifestEntry {
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
              ? JSON.parse(manifest.manifest)
              : manifest;

            const totalSize = parsed.entries?.reduce((sum, e) => sum + (e.size ?? 0), 0) ?? 0;
            const fileCount = parsed.entries?.length ?? 0;
            const containerCount = parsed.containerConfigs?.length ?? 0;

            return (
              <div
                key={manifest.backup_id ?? manifest.backupId}
                className="border-2 border-[var(--border-default)] p-6 hover:border-blue-500 cursor-pointer"
                onClick={() => onSelect(manifest)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {t('recovery.backup_from')} {formatDate(parsed.timestamp ?? manifest.created_at ?? '')}
                    </h3>

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
                  </div>

                  <Button variant="primary">
                    {t('recovery.restore')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
