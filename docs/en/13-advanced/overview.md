# Advanced Topics

## Contents

- [GFS Retention Deep Dive](../02-backup-targets/retention-gfs.md)
- [Performance Tuning](performance-tuning.md)
- [Network Optimization](network-optimization.md)
- [Scripting & Hooks](hooks.md)
- [Docker Advanced](docker-advanced.md)

## Hooks (Pre/Post Scripts)

Scripts executed before or after a backup job.

**Pre-hook use cases:**
- Stop containers
- Database flush
- Network check

**Post-hook use cases:**
- Start containers
- Notifications
- Cleanup

Job configuration:
```
Pre-Backup Hook: /mnt/user/scripts/pre-backup.sh
Post-Backup Hook: /mnt/user/scripts/post-backup.sh
```

Script example:
```bash
#!/bin/bash
# pre-backup.sh
docker stop nextcloud
echo "Nextcloud stopped for backup"
```

---
Next: [Performance Tuning](performance-tuning.md)
