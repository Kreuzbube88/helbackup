# Backup Targets — Übersicht

Ein Target definiert **wo** Backups gespeichert werden.

## Target-Typen

### Local
Direkter Pfad auf Unraid.
```
Type: Local
Path: /mnt/user/backups/helbackup
```
**Vorteile:** Schnell, kein Netzwerk, einfach  
**Nachteile:** Kein Off-site Schutz

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
**Vorteile:** Netzwerk-isoliert, eigene Hardware  
**Nachteile:** Netzwerk-Abhängigkeit

### Cloud (Rclone)
40+ Cloud-Provider (Backblaze B2, S3, Google Drive, etc.)
```
Type: Cloud
Rclone Remote: myb2:helbackup-bucket
```
**Vorteile:** Off-site, günstig (B2: $0.006/GB/Monat)  
**Nachteile:** Upload-Speed, Internet-Abhängigkeit

## Retention Strategien

### Simple Retention
Backups werden nach X Tagen gelöscht.
```
Retention Days: 30
```
Einfach, vorhersehbar.

### GFS Retention
Grandfather-Father-Son Rotation.
```
Daily:   7 Backups   (Son)
Weekly:  4 Backups   (Father)
Monthly: 12 Backups  (Grandfather)
Yearly:  3 Backups   (Ancestor)
```
80-90% Speicherersparnis gegenüber Simple Retention.

Mehr Details: [GFS Retention](retention-gfs.md)

## Encryption

Optional pro Target:
```
Encrypted: ✅
Recovery Key: [Wird generiert]
```

> **WARNUNG:** Recovery Key verloren = Alle Backups verloren!

Mehr Details: [Encryption Setup](../04-encryption/aes256-setup.md)

---
Weiter: [GFS Retention](retention-gfs.md) | [NAS Setup](nas-setup.md) | [Cloud Setup](cloud-setup.md)
