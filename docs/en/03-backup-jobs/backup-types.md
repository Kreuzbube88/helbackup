# Backup Types

## Flash Drive

Backs up Unraid boot configuration from `/boot`.

**What is backed up:**
- Unraid license
- Network configuration
- Plugin list
- Docker templates
- Shares configuration
- All Go scripts

**Excluded:**
- `previous/` directory
- `System Volume Information/`

**Highlights:**
- SHA-256 checksum verification
- Config export as JSON
- Fast (~5-30 seconds)

## Appdata

Backs up Docker container configurations from `/mnt/user/appdata`.

**Options:**
```
Stop containers before backup: ✅ (recommended!)
Stop Delay: 10  (seconds to wait after container stop)
Restart containers after: ✅
Restart Delay: 5  (seconds to wait after container restart)
Database Dumps: ✅ (optional — dumps databases before stopping containers)
```

`stopDelay` and `restartDelay` are configurable (default: 10s / 5s). Set to `0` to skip the sleep — fine for fast containers, increase for database containers.

**Excluded (automatically):**
- `*/logs/*`
- `*/cache/*`
- `*/*.log`

**Source path:** Default is `/mnt/user/appdata`. Configurable under **Settings → Backup → Appdata Source Path**. For paths outside `/unraid/user`, add the corresponding volume mount in `docker-compose.yml` → [Docker Advanced Configuration](../13-advanced/docker-advanced.md).

**Docker Config Export:** All container templates exported as JSON.

**Database Dumps (optional):** When enabled, HELBACKUP detects database containers (MariaDB, PostgreSQL, MongoDB) and dumps them before stopping. Supported types: MariaDB/MySQL, PostgreSQL, MongoDB, Redis. Enable via "Database Dumps" checkbox in the Appdata step config.

Details: [Database Backup](backup-databases.md)

## Virtual Machines (VMs)

Backs up VM disk images from `/mnt/user/domains`.

**Process:**
1. Libvirt snapshot (if VM is running)
2. Rsync of vDisk files
3. XML export of VM configuration
4. Delete snapshot

**Important:** VMs should be stopped for consistent backup!

## Docker Images

Backs up Docker images as `.tar` files.

**Process:**
1. List running images via Docker API
2. `docker save` → `.tar` file
3. Store in target

**Note:** Images can be large (1-5 GB per image)!

## System Config

Exports Unraid system configuration as JSON:
- Network configuration
- User settings
- Shares
- Plugins
- Disk assignments

## Custom Paths

Backs up arbitrary paths not covered by the standard backup types.

**Configuration:**
```
Source Path: /mnt/host/user/data/my-folder
Target: Local Backups
Exclude Patterns: *.tmp, *.log, cache/
Encryption: ☐ (optional)
```

**Process:**
1. Validate source path
2. Rsync to target: `custom/<foldername>/<YYYY-MM-DD>/`
3. Optional: GPG encryption (tar.gz → .gpg)

> **Note:** The path must be reachable inside the container. Use `/mnt/host/user/...` for Unraid user share paths.

---
Back: [Creating Jobs](creating-jobs.md)
