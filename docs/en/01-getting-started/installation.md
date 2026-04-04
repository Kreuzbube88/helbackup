# Installation

## Prerequisites

- Unraid 6.9 or newer
- Community Apps plugin installed
- At least 2 GB free storage for Appdata

## Installation via Community Apps

### Step 1: Open Community Apps

1. Open Unraid WebGUI
2. Navigate to the **"Apps"** tab
3. Search for **"HELBACKUP"**

### Step 2: Configure Container Template

| Setting | Value | Description |
|---------|-------|-------------|
| Port | 3000 | WebGUI port (changeable) |
| Appdata | /mnt/user/appdata/helbackup | Config & database |
| Docker Socket | /var/run/docker.sock | Container access (required!) |

**Recommended additional paths:**
```
Container Path: /mnt/user  →  Host Path: /mnt/user  (Read/Write)
Container Path: /mnt/cache →  Host Path: /mnt/cache (Read/Write)
```

### Step 3: Start Container

1. Click "Apply"
2. Container downloads and starts
3. Check status: Docker tab → HELBACKUP should show "Started"

### First Login

```
http://YOUR-UNRAID-IP:3000
Example: http://192.168.1.100:3000
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
