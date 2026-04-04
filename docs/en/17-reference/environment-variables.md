# Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `JWT_SECRET` | auto-generated | JWT signing secret (auto on first start) |
| `DB_PATH` | `/app/data/helbackup.db` | SQLite database path |
| `CONFIG_PATH` | `/app/config` | Configuration directory |
| `LOG_PATH` | `/app/logs` | Log directory |

## Mounted Volumes

| Container Path | Host Path | Purpose |
|---------------|-----------|---------|
| `/app/data` | `/mnt/user/appdata/helbackup/data` | SQLite DB |
| `/app/config` | `/mnt/user/appdata/helbackup/config` | Config, SSH keys |
| `/app/logs` | `/mnt/user/appdata/helbackup/logs` | Log files |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker API |
| `/unraid/boot` | `/boot` | Flash Drive (read-only) |
| `/unraid/user` | `/mnt/user` | User array |

---
Back: [Reference Overview](overview.md)
