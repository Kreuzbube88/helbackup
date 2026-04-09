# Full Server Restore (Disaster Recovery)

## When does the button appear?

The **Full Server Restore** button appears on a backup entry only when **all** conditions are met:

- The backup contains **more than one backup type** (e.g. Flash + Appdata)
- The backup is **not encrypted** — or has already been unlocked

A job that contains only a single step (e.g. Flash Drive only) will **not** show the button. Only the regular "Restore" button is available in that case.

## When to use Full Server Restore?

- Unraid array completely failed
- All data lost
- New server / new hardware
- Complete migration

## Prerequisites

- New or restored Unraid server
- HELBACKUP container running
- Recovery mode active
- Recovery key (if backup was encrypted)

## Wizard flow

### Step 1: Select restore components

The wizard shows the backup types that are **actually present** in the selected backup — enabled and selectable. Types that were not backed up appear disabled with a *(not in backup)* label:

```
✅ Flash Drive (Unraid configuration)
✅ Appdata (all containers)
✅ Databases
☐ Virtual Machines          (not in backup)
☐ Docker Images             (not in backup)
☐ System Config             (not in backup)
```

> **Note:** `Databases` is enabled when `Appdata` is in the backup — database dumps are detected from container configurations.

### Step 2: Review restore plan

HELBACKUP generates a plan and shows:

- Number of restore items, total size, estimated duration
- Execution order (grouped by priority)
- Pre-flight checks:
  - Sufficient disk space?
  - Conflicts with running containers?
  - Other warnings

**Execution order (automatic, by priority):**
1. Flash Drive (base configuration)
2. System Config
3. Databases
4. Appdata (with dependency detection: reverse proxies and DBs first)
5. Docker Images
6. VMs

The "Execute Restore" button is disabled if disk space is insufficient.

### Step 3: Restore in progress

After confirmation the restore runs **in the background**. The wizard shows a confirmation screen — follow progress in the History logs.

> Restart Unraid after the restore completes.

## After the restore

1. Check history logs (History → last entry)
2. Restart Unraid
3. Verify containers: all started?
4. Spot-check data

---
Back: [Recovery Overview](overview.md)
