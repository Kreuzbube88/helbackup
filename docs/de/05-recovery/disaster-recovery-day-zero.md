# Disaster Recovery — Tag Null

Diese Anleitung beschreibt das Szenario, in dem **alles weg ist**: Der Unraid-Server
ist nicht mehr verwendbar, der HELBACKUP-Container ist zerstört, und du startest
auf neuer (oder frisch installierter) Hardware von vorne.

**Voraussetzung:** Die Backups liegen auf einem NAS oder einer lokalen Festplatte,
die den Ausfall überlebt hat.

---

## Voraussetzungen

Stelle vor dem Start sicher, dass du folgendes hast:

- [ ] Eine laufende Unraid-Installation (kann brandneu sein)
- [ ] Zugriff auf das NAS / die externe Festplatte mit den Backups
- [ ] Die HELBACKUP-Selbstsicherung (eine `.tar.gz` oder `.tar.gz.gpg`-Datei im
      Verzeichnis `helbackup/YYYY-MM-DD/` auf dem Backup-Target)
- [ ] Deinen Verschlüsselungs-Recovery-Key (falls Backups verschlüsselt sind) —
      Format: `HLBK-ENC-XXXX-XXXX-XXXX-XXXX`

> **Kein Selbst-Backup?**
> Falls du nie einen Selbst-Backup-Job angelegt hast (siehe [Selbst-Backup](self-backup.md)),
> kann HELBACKUP dennoch Backup-Manifeste scannen.
> Springe zu [Schritt 3b — Backups scannen](#schritt-3b--backups-scannen-kein-selbst-backup).

---

## Schritt 1 — Neuen HELBACKUP-Container starten

`.env`-Datei mit neuem JWT_SECRET erstellen:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > /mnt/user/appdata/helbackup/.env
```

`docker-compose.yml` in `/mnt/user/appdata/helbackup/` anlegen:

```yaml
services:
  helbackup:
    image: ghcr.io/kreuzbube88/helbackup:latest
    container_name: helbackup
    restart: unless-stopped
    privileged: false
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - TZ=Europe/Berlin
      - LOG_LEVEL=info
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot
      - /mnt/user:/unraid/user
      # Backup-Target für Recovery einbinden:
      - /mnt/user/backups:/mnt/recovery-target   # Pfad anpassen
```

Container starten:

```bash
cd /mnt/user/appdata/helbackup
docker compose --env-file .env up -d
```

Health-Check:

```bash
curl -s http://DEINE-UNRAID-IP:3000/api/health
# Erwartet: {"status":"healthy","database":"ok","version":"..."}
```

---

## Schritt 2 — Einloggen und Admin-Konto anlegen

`http://DEINE-UNRAID-IP:3000` aufrufen. Der Onboarding-Wizard startet automatisch.
Neues Admin-Passwort festlegen.

> **Hinweis:** Das ist eine neue Datenbank — deine alten Jobs und Targets sind noch
> nicht sichtbar. Das ist normal und wird im nächsten Schritt behoben.

---

## Schritt 3a — HELBACKUP-Selbstsicherung wiederherstellen

Stellt deine vorherige Datenbank (Jobs, Targets, History, Einstellungen) und SSH-Keys
wieder her.

1. In der Seitenleiste **Recovery** öffnen
2. **Recovery-Modus aktivieren** (pausiert alle geplanten Jobs)
3. **Backups scannen** klicken und den Pfad zum Backup-Verzeichnis eingeben
   (das als `/mnt/recovery-target` eingebundene Verzeichnis)
4. HELBACKUP findet alle `manifest.json`-Dateien und listet verfügbare Backups
5. Aktuellsten **HELBACKUP Selbst-Backup**-Eintrag auswählen und **Wiederherstellen**
6. Wizard folgen — stellt SQLite-Datenbank und SSH-Keys wieder her
7. **Container neu starten**, damit die wiederhergestellte Datenbank aktiv wird:

```bash
docker restart helbackup
```

8. Erneut einloggen — alle vorherigen Jobs, Targets und der Verlauf sind jetzt sichtbar

---

## Schritt 3b — Backups scannen (kein Selbst-Backup)

Falls kein Selbst-Backup vorhanden ist, kann HELBACKUP dennoch Backup-Manifeste finden.

1. **Recovery → Backups scannen**
2. Root-Pfad des Backup-Speichers eingeben (z. B. `/mnt/recovery-target`)
3. HELBACKUP scannt rekursiv (bis Tiefe 5) nach `manifest.json`-Dateien
4. Alle gefundenen Backups werden in die Datenbank importiert
5. Einzelne Elemente können jetzt über den Recovery-Wizard wiederhergestellt werden

> Jobs und Targets müssen manuell neu angelegt werden, da die Konfigurations-Datenbank
> nicht wiederhergestellt wurde.

---

## Schritt 4 — Daten wiederherstellen

### Flash Drive
```
Recovery → Flash-Backup auswählen → Nach /boot wiederherstellen → Unraid neu starten
```
Ein Neustart ist erforderlich, damit Flash-Drive-Änderungen wirksam werden.

### Appdata (Docker-Container)
```
Recovery → Appdata-Backup auswählen → Container auswählen → Wiederherstellen
```
HELBACKUP synchronisiert die Appdata-Verzeichnisse zurück an ihren ursprünglichen Speicherort. Die Container-Daten (Konfigurationsdateien, Datenbanken etc.) sind danach vorhanden — **die Container selbst werden jedoch nicht automatisch neu erstellt**.

> **Wichtig:** Die Appdata-Wiederherstellung stellt nur die Daten wieder her — nicht die Docker-Container-Definition. Nach der Wiederherstellung taucht der Container im Unraid Docker-Tab nicht auf, bis er neu installiert wurde.

**So werden die Container wiederhergestellt:**

1. **Wenn du auch das Flash-Drive-Backup wiederhergestellt hast** (empfohlen): Die Docker-Templates sind bereits nach `/boot/config/plugins/dockerMan/templates-user/my-<name>.xml` wiederhergestellt. Im Unraid Docker-Tab erscheint der Container als gespeichertes Template. Einfach auf **Anwenden/Starten** klicken — der Container startet und findet seine Daten direkt im wiederhergestellten Appdata-Verzeichnis.

2. **Wenn kein Flash-Drive-Backup wiederhergestellt wurde**: Jeden Container manuell über die Unraid Community Apps oder den Docker-Tab neu installieren und wie zuvor konfigurieren. Beim Start findet der Container seine Konfigurationsdaten bereits in der Appdata — eine Neukonfiguration innerhalb der App ist nicht notwendig.

Die `containers.json`-Datei, die in jedem Appdata-Backup enthalten ist, beinhaltet den vollständigen `docker inspect`-Output für jeden Container (Image, Umgebungsvariablen, Volume-Bindings, Port-Mappings, Netzwerkmodus) — sie dient als Referenz, falls Container manuell neu erstellt werden müssen.

### VMs
```
Recovery → VM-Backup auswählen → XML wiederherstellen
```
Dann VM über den Unraid-VM-Manager neu registrieren.

### System Config
Die System-Konfiguration wird nach `/tmp/restore-config` wiederhergestellt.
Änderungen sorgfältig prüfen — nicht alle Einstellungen sind zwischen Unraid-Versionen
übertragbar.

---

## Schritt 5 — Überprüfen und fortfahren

1. Eine wiederhergestellte Anwendung testen, bevor alles wiederhergestellt wird
2. **Backup verifizieren** bei wichtigen Backups ausführen
3. Recovery-Modus deaktivieren: **Recovery → Recovery-Modus deaktivieren**
4. Geplante Backup-Jobs laufen wieder automatisch

---

## Checkliste

- [ ] Container läuft und `/api/health` gibt `healthy` zurück
- [ ] Selbst-Backup wiederhergestellt (oder Manifeste gescannt)
- [ ] Flash Drive wiederhergestellt + Unraid neugestartet
- [ ] Appdata für alle kritischen Container wiederhergestellt
- [ ] VMs registriert und bootfähig
- [ ] Backup-Jobs und Targets sichtbar und korrekt
- [ ] Erstes neues Backup nach Recovery abgeschlossen und verifiziert
- [ ] Recovery-Modus deaktiviert

---

> **Tipp:** Lege nach der Wiederherstellung sofort einen neuen Selbst-Backup-Job an.
> Siehe [Selbst-Backup](self-backup.md).

---
Zurück: [Vollständige Server-Wiederherstellung](full-server-restore.md) | Weiter: [Selbst-Backup](self-backup.md)
