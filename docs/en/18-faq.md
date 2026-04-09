# Frequently Asked Questions (FAQ)

## Installation & Setup

**Q: Which Unraid version do I need?**  
A: Unraid 6.9 or newer.

**Q: Can I use HELBACKUP outside of Unraid?**  
A: Yes (as Docker container), but primarily designed for Unraid.

**Q: How much storage does HELBACKUP need?**  
A: ~500 MB container, ~100 MB Appdata/DB. Backups need separate storage.

## Backup

**Q: Can I back up to multiple targets simultaneously?**  
A: Yes! One target per job, but unlimited jobs.

**Q: How long does a backup take?**  
A: Flash: ~5-30s. Appdata: 1-30 min. VMs: 10-60 min.

**Q: Can I pause backups?**  
A: Disable the job: Edit Job → Enabled: OFF.

## Encryption

**Q: Is encryption slower?**  
A: ~10-20% slower. AES-NI hardware acceleration on modern CPUs.

**Q: Can I change the recovery key later?**  
A: No. Create a new target with new encryption.

**Q: Is storing the recovery key in a password manager safe?**  
A: Yes, recommended!

## Restore

**Q: Can I restore individual files?**  
A: Yes! Granular Restore supports individual files/folders.

**Q: Do I need to stop containers before restore?**  
A: Recommended but not required. HELBACKUP warns if containers are running.

**Q: How do I test restore without risk?**  
A: Enable Dry Run! Simulates restore without making changes.

## GFS Retention

**Q: Does GFS delete my backups?**  
A: Yes, according to defined rules. ALWAYS check Preview before Cleanup!

**Q: Can I undo GFS cleanup?**  
A: No. Deleted backups are gone. Use Preview!

**Q: GFS vs Simple Retention?**  
A: GFS for long-term + storage efficiency. Simple for short retention.

## API

**Q: Is API Token the same as Session JWT?**  
A: No! API Token for external tools, Session JWT for WebUI.

**Q: Can I reset a token?**  
A: Yes, revoke and create new. Old tokens become invalid.

**Q: Rate limit too low?**  
A: 100/min should be enough. If not: open an issue!

## Problems

**Q: Backup fails with "Permission denied"**  
A: Check Privileged Mode. [Troubleshooting](15-troubleshooting/common-issues.md)

**Q: "Database dump failed"**  
A: Check database credentials. [Troubleshooting](15-troubleshooting/common-issues.md)

**Q: Lost recovery key — can I still access my backups?**  
A: No. Without the key, encrypted backups are permanently inaccessible.

## Miscellaneous

**Q: Does HELBACKUP support snapshots?**  
A: No, file-based backups only.

**Q: Multiple clouds at once?**  
A: Yes! Multiple targets + multiple jobs.

**Q: Is there a mobile app?**  
A: No, but the WebUI is responsive.

**Q: Does HELBACKUP cost money?**  
A: No, completely free and open source!

---
*Question not listed? [Open an issue](https://github.com/Kreuzbube88/helbackup/issues)*
