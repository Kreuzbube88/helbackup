# Häufig gestellte Fragen (FAQ)

## Installation & Setup

**Q: Welche Unraid-Version brauche ich?**  
A: Unraid 6.9 oder neuer.

**Q: Kann ich HELBACKUP außerhalb von Unraid nutzen?**  
A: Theoretisch ja (als Docker Container), aber primär für Unraid entwickelt.

**Q: Wie viel Speicher braucht HELBACKUP?**  
A: ~500 MB Container, ~100 MB Appdata/DB. Backups brauchen eigenen Speicher.

## Backup

**Q: Kann ich mehrere Targets gleichzeitig sichern?**  
A: Ja! Pro Job ein Target, beliebig viele Jobs möglich.

**Q: Wie lange dauert ein Backup?**  
A: Flash: ~5-30s. Appdata: 1-30 min. VMs: 10-60 min. Abhängig von Datenmenge.

**Q: Kann ich Backups pausieren?**  
A: Job deaktivieren: Edit Job → Enabled: OFF.

## Encryption

**Q: Ist Encryption langsamer?**  
A: ~10-20% langsamer. AES-NI Hardware-Beschleunigung auf modernen CPUs.

**Q: Kann ich Recovery Key nachträglich ändern?**  
A: Nein. Neues Target mit neuer Encryption erstellen.

**Q: Recovery Key in Passwort-Manager sicher?**  
A: Ja, empfohlen!

## Restore

**Q: Kann ich einzelne Dateien wiederherstellen?**  
A: Ja! Granular Restore für einzelne Files/Folders.

**Q: Muss ich Container stoppen vor Restore?**  
A: Empfohlen aber nicht zwingend. HELBACKUP warnt wenn Container läuft.

**Q: Wie teste ich Restore ohne Risiko?**  
A: Dry Run aktivieren! Simuliert Restore ohne Änderungen.

## GFS Retention

**Q: Löscht GFS meine Backups?**  
A: Ja, nach definierten Regeln. IMMER Preview anschauen vor Cleanup!

**Q: Kann ich GFS rückgängig machen?**  
A: Nein. Gelöschte Backups sind weg. Preview nutzen!

**Q: Wann GFS vs Simple Retention?**  
A: GFS für Langzeit + Speicher-Effizienz. Simple für kurze Retention.

## API

**Q: Ist API Token = Session JWT?**  
A: Nein! API Token für externe Tools, Session JWT für WebUI.

**Q: Kann ich Token zurücksetzen?**  
A: Ja, revoken und neu erstellen. Alte Token werden ungültig.

**Q: Rate Limit zu niedrig?**  
A: 100/min sollte reichen. Falls nicht: Issue öffnen!

## Probleme

**Q: Backup schlägt fehl mit "Permission denied"**  
A: Privileged Mode prüfen. [Troubleshooting](15-troubleshooting/common-issues.md)

**Q: "Database dump failed"**  
A: Datenbank-Credentials prüfen. [Troubleshooting](15-troubleshooting/common-issues.md)

**Q: Recovery Key vergessen?**  
A: Ohne Key sind verschlüsselte Backups verloren. Key sicher aufbewahren!

## Sonstiges

**Q: Unterstützt HELBACKUP Snapshots?**  
A: Nein, nur File-basierte Backups.

**Q: Mehrere Clouds gleichzeitig?**  
A: Ja! Mehrere Targets + mehrere Jobs.

**Q: Gibt es mobile App?**  
A: Nein, aber WebUI ist responsive.

**Q: Kostet HELBACKUP Geld?**  
A: Nein, komplett kostenlos und Open Source!

**Q: Meine Appdata liegt nicht auf `/mnt/user/appdata` — was tun?**  
A: Liegt Appdata auf dem Cache-Laufwerk (`/mnt/cache/appdata`): kein Mount nötig, das Cache-Laufwerk ist bereits eingebunden. Im Datei-Browser auf **"Cache-Laufwerk"** klicken und `appdata` auswählen. Liegt Appdata auf einem anderen Pool: den Pfad als Volume-Mount in `docker-compose.yml` eintragen. Details: [Docker Erweiterte Konfiguration](13-advanced/docker-advanced.md)

---
*Frage nicht dabei? [Issue öffnen](https://github.com/Kreuzbube88/helbackup/issues)*
