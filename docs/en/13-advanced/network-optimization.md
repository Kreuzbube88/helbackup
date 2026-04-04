# Network Optimization

## SSH Connection Optimization

SSH options in `~/.ssh/config` (in container):

```
Host nas.local
  ControlMaster auto
  ControlPath ~/.ssh/cm_%r@%h:%p
  ControlPersist 30s
  Compression yes
  ServerAliveInterval 10
  ServerAliveCountMax 3
```

## Rsync Delta Transfers

Rsync only transfers changed blocks:
- `--checksum`: SHA-256 based detection (more accurate, slower)
- Default (timestamp + size): Faster, sufficient for most cases

## Bandwidth Scheduling

Schedule jobs during periods with available bandwidth:
- Night 01:00-05:00: No normal network traffic
- Weekends: Lower activity

Limit bandwidth to avoid saturating NAS/network:
```
bwlimit: 50M  (50 MB/s = 400 Mbit/s)
```

## Jumbo Frames

If network supports Jumbo Frames (9000 MTU):
- Improvement: ~5-10% for large file transfers
- Unraid: Network settings → MTU: 9000
- NAS: Configure accordingly

---
Back: [Advanced Overview](overview.md)
