# Full Server Restore (Disaster Recovery)

## When to Use?

- Unraid array completely failed
- All data lost
- New server / new hardware
- Complete migration

## Prerequisites

- New/restored Unraid server
- HELBACKUP container running
- Access to backup target
- Recovery key (if encrypted)

## Start Wizard

1. **Navigate:** Recovery → "Full Server Restore"
2. Wizard opens:

### Step 1: Select Backup

```
Target: Local Backups / NAS / Cloud
Backup: backup_2024-01-15_020000
Date: January 15, 2024, 02:00
Size: 45 GB
Components: Flash, Appdata (12 containers), VMs (2), Databases (3)
```

### Step 2: Select Components

```
✅ Flash Drive (Unraid configuration)
✅ Appdata (all containers)
✅ Virtual Machines
✅ Docker Images
✅ Databases
☐ System Config (optional)
```

### Step 3: Pre-Flight Check

HELBACKUP checks automatically:
```
✅ Target reachable
✅ Backup complete (SHA-256 verified)
✅ Sufficient storage (45 GB needed, 500 GB free)
✅ Unraid array started
⚠️ Containers running (will be stopped)
```

### Step 4: Dry Run (recommended)

```
Dry Run: ✅ enabled
"Start Restore" → Simulation runs...

Would restore:
- Flash Drive: 245 files
- Appdata: 12 containers, 23.4 GB
- VMs: 2 VMs, 18.2 GB
- Databases: 3 dumps, 1.2 GB
Total: ~43 GB
```

### Step 5: Actual Restore

```
Dry Run: ☐ disabled
Overwrite existing: ✅
"Start Restore"
```

**Restore order (automatic):**
1. Flash Drive (base configuration)
2. Docker Images
3. Databases
4. Appdata
5. VMs

## Restore Monitoring

Live logs during restore:
```
[14:23:01] Starting Full Server Restore
[14:23:02] Restoring Flash Drive...
[14:23:08] Flash Drive restored (245 files, 6s)
[14:23:09] Restoring Docker Images (3)...
[14:35:22] Docker Images restored (3/3, 12m 13s)
[14:35:23] Restoring Databases...
[14:37:45] Databases restored (3/3, 2m 22s)
[14:37:46] Restoring Appdata (12 containers)...
[15:02:11] Appdata restored (12/12, 24m 25s)
[15:02:12] Restoring VMs...
[15:23:55] VMs restored (2/2, 21m 43s)
[15:23:56] Full Server Restore completed!
Total time: 61m 55s
```

## After Restore

1. Restart Unraid
2. Check containers: all started?
3. Spot-check data
4. Test services (Nextcloud, Plex, etc.)

---
Back: [Recovery Overview](overview.md)
