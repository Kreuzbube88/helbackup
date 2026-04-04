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
Restart containers after: ✅
```

**Excluded (automatically):**
- `*/logs/*`
- `*/cache/*`
- `*/*.log`

**Docker Config Export:** All container templates exported as JSON.

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

## Databases

Backs up databases from running containers.

Supported types:
- **MariaDB / MySQL:** `mysqldump`
- **PostgreSQL:** `pg_dump`
- **Redis:** `SAVE` command
- **MongoDB:** `mongodump`
- **SQLite:** File copy

Configuration:
```
Database Type: MariaDB
Container: mariadb
Database: nextcloud
Username: root
Password: [stored encrypted]
```

Details: [Database Backup](backup-databases.md)

---
Back: [Creating Jobs](creating-jobs.md)
