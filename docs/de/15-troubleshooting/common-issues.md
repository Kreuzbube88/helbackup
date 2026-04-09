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

## 9. API: "401 Unauthorized"

**Symptom:**
```json
{"success": false, "error": {"code": "UNAUTHORIZED"}}
```

**Checks:**
- Token korrekt? Kein Leerzeichen?
- Token nicht abgelaufen? (Settings → API Tokens)
- Header-Format korrekt: `Authorization: Bearer helbackup_TOKEN`
- Token nicht revoked?

## 11. Login-Sperre — "Ungültige Anmeldedaten" nach Passwort-Reset

Wenn nach einem Passwort-Reset der Login weiterhin verweigert wird, ist die
häufigste Ursache eine Änderung der Umgebungsvariable `JWT_SECRET`, die alle
aktiven Sitzungen und — kritisch — alle verschlüsselten Zugangsdaten invalidiert.

**Nur Passwort geändert (nicht JWT_SECRET):**
```bash
docker inspect helbackup | grep -A2 JWT_SECRET
```

**JWT_SECRET wurde versehentlich geändert:**
> **Warnung:** Das Ändern von JWT_SECRET zerstört alle verschlüsselten
> Target-Zugangsdaten (SSH-Keys, Passwörter) in der Datenbank. Ohne das
> originale JWT_SECRET ist keine Wiederherstellung möglich.

Zugang wiederherstellen:
1. `docker stop helbackup`
2. Originales JWT_SECRET in `/mnt/user/appdata/helbackup/.env` wiederherstellen
3. `docker start helbackup`
4. Wenn originales JWT_SECRET nicht bekannt ist, muss die Datenbank gelöscht
   und neu begonnen werden (alle Target-Zugangsdaten gehen verloren):
   ```bash
   rm /mnt/user/appdata/helbackup/data/helbackup.db
   docker restart helbackup
   ```

---

## 12. JWT_SECRET-Rotation — Datenverlust-Warnung

**JWT_SECRET niemals ohne Plan ändern.** Es wird zur Ableitung des Master-
Verschlüsselungsschlüssels für alle Zugangsdaten verwendet. Eine Änderung
im laufenden Betrieb:

- Invalidiert alle aktiven Login-Sitzungen (behebbar — einfach neu einloggen)
- **Zerstört alle verschlüsselten Target-Zugangsdaten** (SSH-Keys, NAS-Passwörter) — nicht wiederherstellbar ohne alten Secret
- Hat keinen Einfluss auf bereits auf den Targets geschriebene Backup-Dateien

Für eine sichere Rotation des JWT_SECRET:
1. Alle Target-Konfigurationen vorher exportieren (SSH-Key-Pfade, Passwörter notieren)
2. HELBACKUP stoppen
3. JWT_SECRET in `.env` aktualisieren
4. HELBACKUP starten — alle Target-Zugangsdaten müssen neu eingegeben werden
5. Alle Zugangsdaten in der UI erneut eingeben

---

## 13. Datenbank-Korruption

**Symptome:** HELBACKUP startet, zeigt aber keine Jobs/Targets, oder der
Container stürzt sofort mit SQLite-Fehlern in den Logs ab.

**Diagnose:**
```bash
docker logs helbackup --tail 50
# Suche nach: "SQLITE_CORRUPT" oder "database disk image is malformed"
```

**Wiederherstellungsoptionen (in Reihenfolge der Präferenz):**

1. **Wiederherstellung aus Selbst-Backup** (beste Option):
   Siehe [Disaster Recovery — Tag Null](../05-recovery/disaster-recovery-day-zero.md)

2. **SQLite-Reparatur versuchen:**
   ```bash
   docker exec helbackup sh -c "sqlite3 /app/data/helbackup.db '.recover' | sqlite3 /app/data/helbackup-recovered.db"
   docker exec helbackup sh -c "mv /app/data/helbackup.db /app/data/helbackup.db.corrupt && mv /app/data/helbackup-recovered.db /app/data/helbackup.db"
   docker restart helbackup
   ```

3. **Datenbank löschen und neu beginnen** (letztes Mittel — alle Konfiguration verloren):
   ```bash
   rm /mnt/user/appdata/helbackup/data/helbackup.db
   docker restart helbackup
   ```

---

## 14. Cron-Job wird nicht ausgelöst — Zeitzonenproblem

Wenn Jobs zur falschen Zeit oder gar nicht laufen, stimmt möglicherweise die
Container-Zeitzone nicht.

**Container-Zeit prüfen:**
```bash
docker exec helbackup date
# Sollte der lokalen Zeit entsprechen
```

**Behebung:** Umgebungsvariable `TZ` in `docker-compose.yml` setzen:
```yaml
environment:
  - TZ=Europe/Berlin    # an eigene Zeitzone anpassen
```

Gültige Zeitzonennamen: `docker exec helbackup cat /usr/share/zoneinfo/zone.tab | awk '{print $3}'`

Nach einer TZ-Änderung den Container neu starten. Laufende Jobs werden nicht
beeinflusst — nur zukünftige Berechnungen der Zeitpläne ändern sich.

---

## 15. Große Backups — Netzwerk-Timeouts

Bei Backups über langsame oder instabile Netzwerke (z. B. 1-GBit-NAS über VPN):

**Symptom:** Rsync läuft stundenlang und bricht dann mit "Broken pipe" oder
SSH-Timeout ab.

**Behebungen:**

Bandbreitenlimit im Job setzen, um das Netzwerk nicht zu sättigen:
```
bwlimit: 50M   # 50 MB/s — je nach verfügbarer Bandbreite anpassen
```

Bei sehr großen VM-Disk-Backups den Job auf Nebenzeiten verschieben, um
Konkurrenz mit anderem Netzwerkverkehr zu vermeiden.

Wenn das NAS idle SSH-Verbindungen trennt, auf NAS-Seite in `sshd_config` prüfen:
```
ClientAliveInterval 120
ClientAliveCountMax 3
```

---

## 16. Rsync Exit-Codes 23 und 24

Rsync beendet sich mit Code **23** (partieller Transfer) oder **24** (verschwundene
Dateien), wenn einige Dateien nicht übertragen werden konnten.

| Code | Bedeutung | HELBACKUP-Verhalten |
|------|-----------|---------------------|
| 23 | Einige Dateien konnten nicht übertragen werden (z. B. Berechtigungsfehler) | Warnung protokolliert, Backup als **partiell** markiert |
| 24 | Dateien verschwanden während des Transfers (Container schrieb/löschte Datei) | Warnung protokolliert, Backup als **partiell** markiert |

**Für Flash-Drive- und System-Config-Backups** werden diese Codes als **Fehler**
behandelt (Strict-Modus), da diese Backups byte-genau sein müssen. Nach dem
Stoppen aller Aktivitäten, die diese Pfade ändern könnten, erneut ausführen.

**Für Appdata-Backups** ist Code 24 üblich, wenn Container während des Backups
laufen. Zum Vermeiden:
```
Jobs → Job auswählen → Bearbeiten → "Container vor Backup stoppen": aktiviert
```

---

## Debug-Modus aktivieren

```bash
# Mehr Logs im Container
docker exec helbackup sh -c "LOG_LEVEL=debug node server.js"
# Oder dauerhaft in docker-compose:
# environment:
#   - LOG_LEVEL=debug
```

## Logs exportieren

```bash
docker logs helbackup > helbackup_debug.log 2>&1
```

---
Weiter: [Error Messages Reference](error-messages.md)
