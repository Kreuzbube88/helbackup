import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { recovery as recoveryApi } from '../../api';

interface ContainerConfig {
  id: string;
  name: string;
  image: string;
}

interface DatabaseRestoreInfo {
  dumpPath: string;
  restoreCommand: string;
  instructions: string[];
}

interface Props {
  backupId: string;
  containers: ContainerConfig[];
  onClose: () => void;
}

function detectDatabaseType(image: string): string {
  if (image.includes('postgres')) return 'postgres';
  if (image.includes('mariadb')) return 'mariadb';
  if (image.includes('mysql')) return 'mysql';
  if (image.includes('mongo')) return 'mongodb';
  return 'unknown';
}

export default function DatabaseRestoreWizard({ backupId, containers, onClose }: Props) {
  const { t } = useTranslation();
  const [selectedContainer, setSelectedContainer] = useState<ContainerConfig | null>(null);
  const [restoreInfo, setRestoreInfo] = useState<DatabaseRestoreInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const databaseContainers = containers.filter(c =>
    c.image?.includes('postgres') ||
    c.image?.includes('mysql') ||
    c.image?.includes('mariadb') ||
    c.image?.includes('mongo')
  );

  const handleGetRestoreInfo = async (container: ContainerConfig) => {
    setLoading(true);
    setError(null);
    try {
      const dbType = detectDatabaseType(container.image);
      const info = await recoveryApi.getDatabaseRestore(backupId, container.id, dbType);
      setSelectedContainer(container);
      setRestoreInfo(info);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (restoreInfo && selectedContainer) {
    return (
      <div className="border-2 border-[var(--border-default)] p-6">
        <h3 className="text-xl font-bold mb-4">
          {t('recovery.restore_database')}: {selectedContainer.name}
        </h3>

        <div className="bg-blue-50 border-2 border-blue-500 p-4 mb-6">
          <h4 className="font-bold mb-2">⚠️ {t('recovery.important')}</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {restoreInfo.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ol>
        </div>

        <div className="border-2 border-[var(--border-default)] p-4 mb-6">
          <h4 className="font-bold mb-2">{t('recovery.restore_command')}</h4>
          <div className="bg-black text-white p-4 font-mono text-sm overflow-x-auto">
            {restoreInfo.restoreCommand}
          </div>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(restoreInfo.restoreCommand)}
            className="mt-2"
          >
            {t('recovery.copy_command')}
          </Button>
        </div>

        <div className="text-sm opacity-70 mb-6">
          <strong>{t('recovery.dump_location')}:</strong> {restoreInfo.dumpPath}
        </div>

        <Button variant="secondary" onClick={onClose}>
          {t('buttons.close')}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-2 border-[var(--border-default)] p-6">
      <h3 className="text-xl font-bold mb-4">{t('recovery.database_restore')}</h3>

      {error && (
        <div className="border-2 border-red-500 bg-red-50 p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {databaseContainers.length === 0 ? (
        <p className="opacity-70">{t('recovery.no_database_containers')}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm opacity-70">{t('recovery.select_database_container')}</p>

          {databaseContainers.map((container) => (
            <div
              key={container.id}
              className="border-2 border-[var(--border-default)] p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => !loading && handleGetRestoreInfo(container)}
            >
              <div className="font-bold">{container.name}</div>
              <div className="text-sm opacity-70">{container.image}</div>
              <div className="text-sm text-blue-500 mt-2">
                {detectDatabaseType(container.image).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t('buttons.cancel')}
        </Button>
      </div>
    </div>
  );
}
