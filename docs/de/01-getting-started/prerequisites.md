# Voraussetzungen

Überprüfe vor der Installation von HELBACKUP, ob deine Umgebung diese
Anforderungen erfüllt. 10 Minuten hier sparen Stunden an Fehlersuche später.

---

## Unraid-Version

**Minimum: Unraid 6.12**

Ältere Versionen unterstützen möglicherweise nicht die für Docker-Socket-Mounts
benötigten Kernel-Funktionen.
Prüfen: Unraid-UI → oben rechts zeigt den Versionsstring.

---

## Zeitsynchronisation (NTP)

Cron-Zeitpläne, Backup-Zeitstempel und Log-Korrelation erfordern eine korrekte
Systemzeit. Unraid hat NTP standardmäßig aktiviert, aber überprüfe es:

**Unraid-UI → Einstellungen → Datum und Uhrzeit** — bestätige, dass ein
NTP-Server eingetragen ist und die Uhrzeit stimmt.

Wenn die Container-Uhrzeit mehr als ein paar Sekunden von der NAS abweicht,
können SSH-Verbindungen mit dem Fehler "clock skew too great" abgelehnt werden.

---

## Netzwerk

- HELBACKUP läuft standardmäßig auf Port **3000** — sicherstellen, dass nichts
  anderes diesen Port belegt
- Der Unraid-Host muss das NAS über das Netzwerk erreichen können (Ping-Test
  reicht aus)
- Bei Wake-on-LAN: das NAS muss sich im gleichen Broadcast-Bereich (Subnetz)
  wie der Unraid-Host befinden, oder eine Directed-Broadcast-Route muss vorhanden sein

---

## Speicherplatzbedarf (Schätzung)

Eine grobe Größenschätzung vor der Konfiguration des ersten Jobs:

| Backup-Typ | Typische Größe | Hinweise |
|------------|----------------|----------|
| Flash Drive | 1–5 GB | Vollständiges `/boot` — ändert sich nur bei Unraid-Updates |
| Appdata | 1 GB – 1 TB | Abhängig von den Containern |
| VMs | 10 GB – 4 TB | Größe der vDisk-Images |
| Docker Images | 500 MB – 50 GB | Pro gepulltem Image |
| System Config | < 1 MB | Nur JSON-Export |
| HELBACKUP Selbst | 1–20 MB | Datenbank + SSH-Keys |

**Freier Speicherplatz auf dem Target:** Plane mindestens den 3-fachen aktuellen
Quellgröße für GFS-Aufbewahrung (täglich + wöchentlich + monatliche Kopien) ein.

---

## SSH-Key-Einrichtung (für NAS-Targets)

Wenn du auf ein entferntes NAS via SSH+Rsync sichern möchtest, generiere ein
dediziertes Schlüsselpaar **vor** dem Hinzufügen des Targets in HELBACKUP:

```bash
# Auf dem Unraid-Host (oder einem beliebigen Rechner mit ssh-keygen):
ssh-keygen -t ed25519 -C "helbackup@unraid" -f ~/.ssh/helbackup_id_ed25519
```

Enter zweimal drücken für keine Passphrase (HELBACKUP verwaltet Keys ohne
interaktive Passphraseneingabe).

Berechtigungen setzen — **Pflicht**, HELBACKUP verweigert Keys mit zu weit
gefassten Berechtigungen:

```bash
chmod 600 ~/.ssh/helbackup_id_ed25519
chmod 644 ~/.ssh/helbackup_id_ed25519.pub
```

Öffentlichen Key auf das NAS kopieren:

```bash
ssh-copy-id -i ~/.ssh/helbackup_id_ed25519.pub user@deine-nas-ip
```

Oder den Inhalt von `helbackup_id_ed25519.pub` in das Feld **SSH Authorized Keys**
des NAS einfügen (Synology: Systemsteuerung → Terminal & SNMP → SSH, dann
`~/.ssh/authorized_keys` für den Backup-Benutzer bearbeiten).

Beim Hinzufügen des Targets in HELBACKUP den Inhalt des **Private Keys**
(`helbackup_id_ed25519`, nicht die `.pub`-Datei) einfügen.

---

## Port 3000 verfügbar

Prüfen, ob Port 3000 bereits belegt ist:

```bash
# Im Unraid-Terminal:
ss -tlnp | grep :3000
# Keine Ausgabe = Port ist frei
```

Falls Port 3000 belegt ist, den Host-seitigen Port in `docker-compose.yml` ändern:

```yaml
ports:
  - "3001:3000"   # Host-Port 3001 → Container-Port 3000
```

---

## Schnelltest vor der Installation

Diese Befehle im Unraid-Terminal ausführen:

```bash
# Docker läuft
docker ps

# /boot ist zugänglich (HELBACKUP benötigt das für Flash-Backup)
ls /boot/config/plugins/ | head -5

# User-Share ist eingehängt
ls /mnt/user/appdata/ | head -5

# NAS erreichbar (IP anpassen)
ping -c 3 192.168.1.100
```

Alle Befehle sollten Ausgaben ohne Fehler liefern. Wenn `/boot` leer ist oder
`/mnt/user/appdata/` nichts zurückgibt, prüfen, ob das Unraid-Array gestartet
ist (**Hauptseite** → Starten).

---

Weiter: [Installation](installation.md)
