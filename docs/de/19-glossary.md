# Glossar

## A

**Appdata** — Konfigurationsdateien von Docker Containern. Gespeichert in `/mnt/user/appdata/`.

**AES-256** — Advanced Encryption Standard, 256-Bit Schlüssel. Militär-grade Verschlüsselung.

**API Token** — Authentifizierungs-Token für API-Zugriff. Format: `helbackup_...`

## B

**Backup Target** — Ziel wo Backups gespeichert werden (Local, NAS, Cloud).

**Backup Job** — Definition was wann gesichert wird (Schedule + Backup Types).

## C

**Cron** — Unix-Standard für zeitgesteuerte Tasks. Format: `* * * * *`.

**Container** — Docker Container. In Unraid die Apps (Plex, Nextcloud, etc.).

## D

**Disaster Recovery** — Komplette Server-Wiederherstellung nach Totalausfall.

**Dry Run** — Simulations-Modus. Zeigt was passieren würde ohne Änderungen vorzunehmen.

## E

**Encryption** — Verschlüsselung. HELBACKUP nutzt AES-256-GCM.

## F

**Flash Drive** — USB-Stick mit Unraid Boot-Konfiguration.

## G

**GFS (Grandfather-Father-Son)** — Retention-Strategie: Täglich, Wöchentlich, Monatlich, Jährlich.

**Granular Restore** — Wiederherstellung einzelner Files/Folders statt komplettem Backup.

## H

**HMAC** — Hash-based Message Authentication Code. Für Webhook-Signierung.

**Hook** — Pre/Post Script das vor/nach Backup ausgeführt wird.

## J

**JWT (JSON Web Token)** — Session-Token für WebUI Authentication.

## M

**Manifest** — Index-Datei die alle Backup-Inhalte listet.

**Metrics** — Prometheus-Metriken für Monitoring.

## N

**NAS (Network Attached Storage)** — Netzwerk-Speicher (Synology, QNAP, etc.).

## P

**Parity** — Unraid Redundanz-System. Erlaubt 1-2 Disk-Ausfälle.

**Pre-Flight Check** — Validierung vor Restore (Speicher, Konflikte, etc.).

## R

**Rate Limiting** — Anfragen-Begrenzung. HELBACKUP: 100 Requests/Minute.

**Recovery Key** — AES-256 Schlüssel für encrypted Backups. KRITISCH aufbewahren!

**Retention** — Wie lange Backups aufbewahrt werden.

## S

**Schedule** — Zeitplan (Cron) wann Job ausgeführt wird.

**Scope** — API-Berechtigung: `read`, `write`, `admin`.

**SHA-256** — Hash-Algorithmus für Checksums. Erkennt Datei-Korruption.

## W

**Webhook** — HTTP Callback bei Events (backup_success, backup_failed, etc.).

---
*Begriff fehlt? [Issue öffnen](https://github.com/Kreuzbube88/helbackup/issues)*
