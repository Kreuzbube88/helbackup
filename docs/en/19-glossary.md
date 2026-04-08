# Glossary

## A

**Appdata** — Configuration files for Docker containers. Stored in `/mnt/user/appdata/`.

**AES-256** — Advanced Encryption Standard, 256-bit key. Military-grade encryption.

**API Token** — Authentication token for API access. Format: `helbackup_...`

## B

**Backup Target** — Destination where backups are stored (Local, NAS, Cloud).

**Backup Job** — Defines what gets backed up and when (Schedule + Backup Types).

## C

**Cron** — Unix standard for scheduled tasks. Format: `* * * * *`.

**Container** — Docker container. In Unraid: apps like Plex, Nextcloud, etc.

## D

**Disaster Recovery** — Complete server restoration after total failure.

**Dry Run** — Simulation mode. Shows what would happen without making changes.

## E

**Encryption** — Scrambling data. HELBACKUP uses AES-256-GCM.

## F

**Flash Drive** — USB stick containing Unraid boot configuration.

## G

**GFS (Grandfather-Father-Son)** — Retention strategy: Daily, Weekly, Monthly, Yearly.

**Granular Restore** — Restoring individual files/folders from a backup.

## H

**HMAC** — Hash-based Message Authentication Code. Used for webhook signing.

**Hook** — Pre/Post script executed before/after backup.

## J

**JWT (JSON Web Token)** — Session token for WebUI authentication.

## M

**Manifest** — Index file listing all backup contents.

**Metrics** — Prometheus metrics for monitoring.

## N

**NAS (Network Attached Storage)** — Network storage device (Synology, QNAP, etc.).

## P

**Parity** — Unraid redundancy system. Allows 1-2 disk failures.

**Pre-Flight Check** — Validation before restore (storage, conflicts, etc.).

## R

**Rate Limiting** — Request throttling. HELBACKUP: 100 requests/minute.

**Recovery Key** — AES-256 key for encrypted backups. CRITICAL to keep safe!

**Retention** — How long backups are kept.

## S

**Schedule** — Cron-based plan for when a job runs.

**Scope** — API permission: `read`, `write`, `admin`.

**SHA-256** — Hash algorithm for checksums. Detects file corruption.

## W

**Webhook** — HTTP callback on events (backup_success, backup_failed, etc.).

---
*Term missing? [Open an issue](https://github.com/Kreuzbube88/helbackup/issues)*
