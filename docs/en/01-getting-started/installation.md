# Installation

## Prerequisites

- Docker socket `/var/run/docker.sock` accessible
- Host mounts configured for Flash/Appdata/Restore (see below)

## Installation via Community Apps

> The Community Apps plugin is only required for store installation. Alternatively: Docker Compose (see below).

### Step 1: Open Community Apps

1. Open Unraid WebGUI
2. Navigate to the **"Apps"** tab
3. Search for **"HELBACKUP"**

### Step 2: Configure Container Template

**Required paths:**

| Container Path | Host Path | Mode | Purpose |
|---|---|---|---|
| `/app/config` | `/mnt/user/appdata/helbackup/config` | rw | Configuration |
| `/app/data` | `/mnt/user/appdata/helbackup/data` | rw | Database |
| `/app/logs` | `/mnt/user/appdata/helbackup/logs` | rw | Logs |
| `/var/run/docker.sock` | `/var/run/docker.sock` | rw | Docker API |
| `/unraid/boot` | `/boot` | rw | Flash Drive backup + restore |
| `/unraid/user` | `/mnt/user` | rw | Array share access + restore |
| `/unraid/cache` | `/mnt/cache` | rw | Cache pool access + restore |

**Optional — required for VM backups only:**

| Container Path | Host Path | Mode |
|---|---|---|
| `/unraid/libvirt` | `/etc/libvirt` | rw |
| `/var/run/libvirt/libvirt-sock` | `/var/run/libvirt/libvirt-sock` | rw |

> **Note:** `privileged: false` — no privileged container required.

### Step 3: Start Container

1. Click "Apply"
2. Container downloads and starts
3. Check status: Docker tab → HELBACKUP should show "Started"

### First Login

```
http://YOUR-UNRAID-IP:3000
Example: http://192.168.1.100:3000
```

## Installation via Docker Compose

Create `.env` file:

```env
JWT_SECRET=<random long string>
TZ=Europe/Berlin
```

`docker-compose.yml`:

```yaml
services:
  helbackup:
    image: ghcr.io/kreuzbube88/helbackup:latest
    container_name: helbackup
    restart: unless-stopped
    privileged: false
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET:?Set JWT_SECRET in .env}
      - SECURE_COOKIES=${SECURE_COOKIES:-false}
      - TZ=${TZ:-Europe/Berlin}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - PUID=${PUID:-99}
      - PGID=${PGID:-100}
      - LIBVIRT_DEFAULT_URI=qemu:///system
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot
      - /mnt/user:/unraid/user
      - /mnt/cache:/unraid/cache
      # Optional — required for VM backups:
      # - /etc/libvirt:/unraid/libvirt
      # - /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock
    networks:
      - br0

networks:
  br0:
    external: true
```

```bash
docker compose up -d
```

## Post-Installation Checklist

- [ ] Step 1: Create first Backup Target
- [ ] Step 2: Configure first Backup Job
- [ ] Step 3: Set up Notifications
- [ ] Step 4: Run test backup
- [ ] Step 5: Test restore

> **IMPORTANT:** A backup is only production-ready after a successful restore test!

## Troubleshooting

**Container won't start:**
```bash
docker logs helbackup
```
Common causes: Port 3000 in use, Docker socket not mounted.

**WebGUI not reachable:**
```bash
netstat -tulpn | grep 3000
```

---
Next: [First Steps](first-steps.md)
