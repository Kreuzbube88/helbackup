# Grundkonzepte

## Architektur

```
Unraid Server
└── HELBACKUP Container (Docker)
    ├── Fastify Backend (/api/*)
    ├── React Frontend (SPA)
    ├── SQLite Datenbank
    └── Job Orchestrator (cron-based)
```

## Kernkonzepte

### Backup Target
Ziel wo Backups gespeichert werden.
- **Local:** Direkt auf Unraid-Festplatten
- **NAS:** Synology/QNAP via SSH+Rsync
- **Cloud:** 40+ Provider via Rclone

### Backup Job
Definiert was wann gesichert wird.
- Schedule (Cron)
- Backup Types (Flash, Appdata, VMs, etc.)
- Target
- Hooks (Pre/Post Scripts)

### Backup Types

| Type | Quelle | Besonderheit |
|------|--------|--------------|
| Flash Drive | /boot | Unraid Konfiguration |
| Appdata | /mnt/user/appdata | Container-Daten |
| VMs | /mnt/user/domains | Virtuelle Maschinen |
| Docker Images | Docker Socket | Images als .tar |
| System Config | System | Netzwerk, User, Shares |
| Databases | Container | MariaDB, PostgreSQL, etc. |

### Retention
Wie lange Backups aufbewahrt werden.
- **Simple:** X Tage
- **GFS (Grandfather-Father-Son):** Täglich/Wöchentlich/Monatlich/Jährlich → 80-90% Speicherersparnis

### Encryption
Optional: AES-256 Verschlüsselung.
- Recovery Key = einziger Zugang zu verschlüsselten Backups
- Key verloren = Backups verloren

---
Nächste Seite: [Ersten Target erstellen](../02-backup-targets/overview.md)
