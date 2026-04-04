# Environment Variables

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `PORT` | `3000` | Server Port |
| `HOST` | `0.0.0.0` | Bind Address |
| `LOG_LEVEL` | `info` | Log Level (debug/info/warn/error) |
| `JWT_SECRET` | auto-generated | JWT Signing Secret (auto bei erstem Start) |
| `DB_PATH` | `/app/data/helbackup.db` | SQLite Datenbank Pfad |
| `CONFIG_PATH` | `/app/config` | Konfigurationsverzeichnis |
| `LOG_PATH` | `/app/logs` | Log-Verzeichnis |

## Gemountete Verzeichnisse

| Container Pfad | Host Pfad | Zweck |
|---------------|-----------|-------|
| `/app/data` | `/mnt/user/appdata/helbackup/data` | SQLite DB |
| `/app/config` | `/mnt/user/appdata/helbackup/config` | Konfiguration, SSH Keys |
| `/app/logs` | `/mnt/user/appdata/helbackup/logs` | Log-Dateien |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker API |
| `/unraid/boot` | `/boot` | Flash Drive (read-only) |
| `/unraid/user` | `/mnt/user` | User Array |

---
Zurück: [Reference Overview](overview.md)
