# Häufige Probleme

## 1. Backup schlägt fehl mit "Permission denied"

**Symptom:**
```
Error: EACCES: permission denied, open '/mnt/user/appdata/nextcloud/...'
```

**Ursachen & Lösungen:**

a) Container läuft als Root, Dateien gehören anderem User:
```bash
# Auf Unraid:
ls -la /mnt/user/appdata/nextcloud/
# Wenn Owner != root, dann:
chmod -R a+r /mnt/user/appdata/nextcloud/
```

b) HELBACKUP Container nicht Privileged:
- Unraid → Docker → HELBACKUP → Edit
- "Privileged: ON" setzen
- Container neu starten

## 2. "SSH Connection failed"

**Symptom:**
```
Error: Connection refused / Authentication failed
```

**Checks:**
```bash
# SSH Port auf NAS prüfen
ssh -p 22 -i /app/config/ssh/nas_key user@nas-ip

# Key Permissions prüfen
ls -la /app/config/ssh/nas_key
# Muss sein: -rw------- (600)
```

**Lösung:**
```bash
chmod 600 /app/config/ssh/nas_key
```

## 3. "Database dump failed"

**Symptom:**
```
Error: mysqldump: Got error: 1045: Access denied for user 'root'
```

**Lösung:**
```bash
# MariaDB Root-Passwort prüfen
docker exec -it mariadb mysql -u root -p
# Wenn Fehler: falsches Passwort in Job-Config
```

## 4. "Not enough disk space"

**Symptom:**
```
Error: ENOSPC: no space left on device
```

**Checks:**
```bash
# Speicher auf Unraid prüfen
df -h /mnt/user/
# GFS Cleanup laufen lassen
# Alte Backups manuell löschen
```

## 5. Job läuft nicht zum geplanten Zeitpunkt

**Checks:**
1. Job aktiviert? (Enabled: ✅)
2. Cron-Ausdruck korrekt? → Cron Validator nutzen
3. HELBACKUP Container läuft? `docker ps | grep helbackup`
4. Unraid Zeit korrekt? `date` im Container

## 6. WebUI nicht erreichbar

**Symptom:** Browser zeigt "Connection refused"

```bash
# Container-Status
docker ps | grep helbackup

# Logs
docker logs helbackup --tail 50

# Port prüfen
netstat -tulpn | grep 3000
```

**Häufige Ursache:** Port-Konflikt
→ Port in Docker-Template ändern (3001, 3002, etc.)

## 7. Encryption: "Invalid recovery key"

**Symptom:**
```
Error: Decryption failed: invalid key
```

**Lösung:**
- Recovery Key nochmal eingeben (keine Leerzeichen!)
- Format: `8f2a-9c3b-1e7d-4f6a-2b8c-5d9e-3a7f-6c1b`
- Wenn Key verloren: Backup nicht entschlüsselbar

## 8. Rsync schlägt fehl mit "vanished file"

**Symptom:**
```
Warning: some files vanished before they could be transferred
```

**Erklärung:** Datei wurde während Rsync gelöscht/geändert (z.B. durch laufenden Container).

**Lösung:**
- Container stoppen vor Backup (Job-Option: "Stop containers")
- Warnung ist oft harmlos — Backup ist trotzdem konsistent

## 9. "Parity check läuft"

**Symptom:**
```
Pre-flight check failed: Parity check is running
```

**Erklärung:** HELBACKUP blockiert Backup während Parity (Performance + Daten-Konsistenz).

**Lösung:** Schedule so planen dass kein Konflikt mit Parity Check.

## 10. API: "401 Unauthorized"

**Symptom:**
```json
{"success": false, "error": {"code": "UNAUTHORIZED"}}
```

**Checks:**
- Token korrekt? Kein Leerzeichen?
- Token nicht abgelaufen? (Settings → API Tokens)
- Header-Format korrekt: `Authorization: Bearer helbackup_TOKEN`
- Token nicht revoked?

## Debug Mode aktivieren

```bash
# Mehr Logs im Container
docker exec helbackup sh -c "LOG_LEVEL=debug node server.js"
# Oder in docker-compose:
# environment:
#   - LOG_LEVEL=debug
```

## Logs exportieren

```bash
docker logs helbackup > helbackup_debug.log 2>&1
```

---
Weiter: [Error Messages Reference](error-messages.md)
