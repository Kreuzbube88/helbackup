# Installation

## Voraussetzungen

- Docker Socket `/var/run/docker.sock` erreichbar
- Host-Mounts für Flash/Appdata/Restore konfiguriert (siehe unten)

## Installation via Community Apps

> Das Community Apps Plugin ist nur für die Store-Installation erforderlich. Alternativ: Docker Compose (siehe unten).

### Schritt 1: Community Apps öffnen

1. Unraid WebGUI öffnen
2. Zum Tab **"Apps"** navigieren
3. Suchfeld: **"HELBACKUP"** eingeben

### Schritt 2: Container Template konfigurieren

**Erforderliche Pfade:**

| Container Path | Host Path | Modus | Zweck |
|---|---|---|---|
| `/app/config` | `/mnt/user/appdata/helbackup/config` | rw | Konfiguration |
| `/app/data` | `/mnt/user/appdata/helbackup/data` | rw | Datenbank |
| `/app/logs` | `/mnt/user/appdata/helbackup/logs` | rw | Logs |
| `/var/run/docker.sock` | `/var/run/docker.sock` | rw | Docker API |
| `/unraid/boot` | `/boot` | **rw** | Flash-Drive Backup + Restore |
| `/unraid/user` | `/mnt/user` | **rw** | Array-Share Zugriff + Restore |
| `/unraid/cache` | `/mnt/cache` | **rw** | Cache-Pool Zugriff + Restore — **erforderlich für Appdata** |

**Optional — nur für VM-Backups:**

| Container Path | Host Path | Modus |
|---|---|---|
| `/unraid/libvirt` | `/etc/libvirt` | rw |
| `/var/run/libvirt/libvirt-sock` | `/var/run/libvirt/libvirt-sock` | rw |

> **Hinweis:** `privileged: false` — kein privilegierter Container notwendig.

### Schritt 3: Container starten

1. "Apply" klicken
2. Container wird heruntergeladen und gestartet
3. Status prüfen: Docker Tab → HELBACKUP sollte "Started" sein

### Erste Anmeldung

```
http://YOUR-UNRAID-IP:3000
Beispiel: http://192.168.1.100:3000
```

## Installation via Docker Compose

`.env` Datei erstellen:

```env
JWT_SECRET=<zufälliger langer String>
TZ=Europe/Berlin
```

`docker-compose.yml`:

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
      - JWT_SECRET=${JWT_SECRET:?Set JWT_SECRET in .env}
      - SECURE_COOKIES=${SECURE_COOKIES:-false}
      - TZ=${TZ:-Europe/Berlin}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - PUID=${PUID:-99}
      - PGID=${PGID:-100}
      - LIBVIRT_DEFAULT_URI=qemu:///system
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot:rw
      - /mnt/user:/unraid/user:rw
      - /mnt/cache:/unraid/cache:rw
      # Optional — nur für VM-Backups:
      # - /etc/libvirt:/unraid/libvirt:rw
      # - /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock
    networks:
      - br0

networks:
  br0:
    external: true
```

```bash
docker compose up -d
```

## Post-Installation Checklist

- [ ] Schritt 1: Ersten Backup Target erstellen
- [ ] Schritt 2: Ersten Backup Job konfigurieren
- [ ] Schritt 3: Notifications einrichten
- [ ] Schritt 4: Test-Backup durchführen
- [ ] Schritt 5: Test-Restore durchführen

> **WICHTIG:** Backup ist erst produktiv wenn du einen erfolgreichen Restore getestet hast!

## Troubleshooting

**Container startet nicht:**
```bash
docker logs helbackup
```
Häufige Ursachen: Port 3000 belegt, Docker Socket nicht gemountet.

**WebGUI nicht erreichbar:**
```bash
netstat -tulpn | grep 3000
```

---
Nächste Seite: [Erste Schritte](first-steps.md)
