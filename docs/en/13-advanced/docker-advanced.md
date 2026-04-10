# Docker — Advanced Configuration

## Docker Socket

HELBACKUP communicates with Docker via Unix socket:
```
/var/run/docker.sock → /var/run/docker.sock (in container)
```

Used for:
- Stop/start containers
- Back up Docker images (`docker save`)
- Check container status

## Docker Images Backup

Back up all running container images:

```
Backup Type: Docker Images
Include: all running
```

Images stored as `.tar`:
```
backup_2024-01-15/
└── docker-images/
    ├── nextcloud_latest.tar
    ├── mariadb_10.11.tar
    └── manifest.json
```

**Note:** Images can be very large (1-5 GB per image)!

Recommendation: Back up Docker images weekly or monthly only.

## Container Auto-Stop / Auto-Start

Job configuration:
```
Stop containers before backup: ✅
Containers to stop: nextcloud, mariadb
Wait after stop: 10 seconds
Start containers after backup: ✅
```

When "all appdata containers" is enabled: HELBACKUP stops all containers writing to Appdata.

## Custom Volume Mounts for Appdata

By default, HELBACKUP expects Appdata at `/unraid/cache/appdata` — directly accessible
via the `/mnt/cache:/unraid/cache` mount that is included in the standard configuration.

The **file browser** (Settings → Backup → Appdata Source Path → Browse) has a
**"Cache Drive" quick-access button** that jumps directly to `/unraid/cache` —
`appdata` is reachable and selectable there without any extra configuration.

### Appdata on the array (`/mnt/user/appdata`)

If Appdata is on the Unraid array instead of the cache pool, set
**Settings → Backup → Appdata Source Path** to `/unraid/user/appdata`.
The array is already mounted at `/unraid/user`.

### Appdata on a different pool (e.g. SSD pool)

If Appdata is on another pool (e.g. `/mnt/ssd/dockers`), add it as an additional volume
mount in `docker-compose.yml`:

```yaml
volumes:
  - /mnt/ssd/dockers:/unraid/ssd      # ← mount your own pool
```

Then in HELBACKUP: set **Settings → Backup → Appdata Source Path** to `/unraid/ssd`.

**Important:**
- HELBACKUP does not modify `docker-compose.yml` or `helbackup.xml` itself
- Allowed path bases inside the container: `/unraid/`, `/mnt/`, `/app/`
- After changing `docker-compose.yml`: restart the container (`docker compose up -d`)

---
Back: [Advanced Overview](overview.md)
