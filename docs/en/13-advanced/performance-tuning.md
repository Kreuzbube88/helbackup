# Performance Tuning

## Rsync Optimizations

Default HELBACKUP flags:
```bash
rsync -az --checksum --bwlimit=50M --progress
```

### Bandwidth Limiting

```
Bandwidth Limit: 50M  (50 MB/s — default)
```

Adjust per job:
- 10M for slow NAS connections
- 100M for fast local connections
- 0 = no limit (use caution!)

The global limit can be overridden by a **per-step limit** in the job wizard (field "Bandwidth Limit" in the step configuration). The step-level limit always takes precedence.

### Parallelization

Multiple jobs can run in parallel — but watch out for:
- I/O load on Unraid disks
- Network saturation to NAS
- RAM consumption

Recommendation: Stagger jobs by 1 hour.

## SQLite Optimizations

HELBACKUP uses WAL mode:
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

Default configuration is sufficient for normal use.

## SSH Connection Reuse

SSH connections are reused within a job (ControlMaster).
Timeout: 30 seconds after last use.

## Compression

Rsync compression (`-z`) enabled for network targets.
Disable for local targets (overhead without benefit):

```
Local Target: Compression: ☐ (disabled)
NAS Target:   Compression: ✅ (enabled)
```

---
Back: [Advanced Overview](overview.md)
