# Backup Targets — Overview

A Target defines **where** backups are stored.

## Target Types

### Local
Direct path on Unraid.
```
Type: Local
Path: /mnt/user/backups/helbackup
```
**Pros:** Fast, no network, simple  
**Cons:** No off-site protection

### NAS (Synology / QNAP)
Via SSH + Rsync.
```
Type: NAS
Host: 192.168.1.200
Port: 22
Username: backup-user
SSH Key: /app/config/ssh/nas_key
Remote Path: /volume1/helbackup
```
**Pros:** Network-isolated, own hardware  
**Cons:** Network dependency

### Cloud (Rclone)
40+ cloud providers (Backblaze B2, S3, Google Drive, etc.)
```
Type: Cloud
Rclone Remote: myb2:helbackup-bucket
```
**Pros:** Off-site, cheap (B2: $0.006/GB/month)  
**Cons:** Upload speed, internet dependency

## Retention Strategies

### Simple Retention
Backups deleted after X days.
```
Retention Days: 30
```

### GFS Retention
Grandfather-Father-Son rotation.
```
Daily:   7 backups  (Son)
Weekly:  4 backups  (Father)
Monthly: 12 backups (Grandfather)
Yearly:  3 backups  (Ancestor)
```
80-90% storage savings vs Simple Retention.

More details: [GFS Retention](retention-gfs.md)

## Encryption

Optional per target:
```
Encrypted: ✅
Recovery Key: [Generated]
```

> **WARNING:** Lost recovery key = all backups lost!

More details: [Encryption Setup](../04-encryption/aes256-setup.md)

---
Next: [GFS Retention](retention-gfs.md) | [NAS Setup](nas-setup.md) | [Cloud Setup](cloud-setup.md)
