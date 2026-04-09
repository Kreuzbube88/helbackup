<p align="center">
  <img src="frontend/public/logo.png" alt="HELBACKUP" width="450" height="450"/>
</p>

<p align="center">
  <strong>Intelligenter Backup-Orchestrator für Unraid</strong>
</p>

<p align="center">
  🇩🇪 Deutsch &nbsp;|&nbsp; <a href="README.md">🇬🇧 English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/helbackup" alt="Lizenz">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Plattform">
</p>

---

HELBACKUP ist eine selbst gehostete Backup-Lösung, die speziell für [Unraid](https://unraid.net) entwickelt wurde. Als einzelner Docker-Container gibt sie dir volle Kontrolle darüber, was gesichert wird, wann und wohin — mit einer übersichtlichen Web-Oberfläche, ohne Cloud-Abhängigkeit und ohne Abo.

---

## Features

- **Automatisierte Backup-Jobs** — Flash Drive, Appdata, VMs, Docker Images, System-Konfiguration
- **Mehrere Zieltypen** — Lokales Dateisystem, Remote-Server oder NAS via SSH+Rsync
- **AES-256-Verschlüsselung** — Optionale Ende-zu-Ende-Verschlüsselung mit Recovery Key
- **GFS-Aufbewahrung** — Grandfather-Father-Son-Rotation spart bis zu 90% Speicherplatz
- **Disaster Recovery** — Granulare Dateiwiederherstellung und vollständiger Server-Restore-Assistent
- **Einrichtungsassistent** — Mit dem geführten Wizard das erste Backup in wenigen Minuten starten
- **7 Benachrichtigungskanäle** — E-Mail, Gotify, ntfy, Pushover, Telegram, Discord, Slack
- **REST-API & Webhooks** — Token-basierte API, HMAC-signierte Webhook-Events
- **Prometheus-Metriken** — Fertige Monitoring-Integration
- **Dark UI** — React-18-Weboberfläche, verfügbar auf Deutsch und Englisch

---

## Installation

### Unraid Community Apps (empfohlen)

1. **Apps**-Tab in Unraid öffnen
2. Nach **HELBACKUP** suchen
3. **Installieren** klicken und das Template ausfüllen

HELBACKUP ist anschließend unter `http://DEINE-UNRAID-IP:3000` erreichbar.

### Docker Compose

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
      - JWT_SECRET=dein_secret_hier   # openssl rand -hex 32
      - SECURE_COOKIES=false          # true bei HTTPS via Reverse Proxy
      - TZ=Europe/Berlin
      - LOG_LEVEL=info
      - PUID=99
      - PGID=100
      - LIBVIRT_DEFAULT_URI=qemu:///system
    volumes:
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot                          # rw — für Flash-Backup/Restore
      - /mnt/user:/unraid/user                      # rw — für Appdata/VM-Backup/Restore
      # Optional — nur für VM-Backups erforderlich:
      # - /mnt/cache:/mnt/cache:ro
      # - /etc/libvirt:/unraid/libvirt:ro
      # - /var/run/libvirt/libvirt-sock:/var/run/libvirt/libvirt-sock
```


---

## Schnellstart

Nach der Installation die Web-Oberfläche öffnen und dem **Onboarding-Wizard** folgen — er führt in weniger als 5 Minuten durch die Erstellung des ersten Backup-Targets und Jobs. Der Assistent kann jederzeit über den **Quick Start Guide**-Button im Dashboard erneut gestartet werden.

Die vollständige Dokumentation ist unter [docs/](docs/README.md) zu finden.

---

## Dokumentation

Die vollständige Dokumentation liegt im Ordner [`docs/`](docs/README.md) auf Deutsch und Englisch — Installation, Backup-Typen, Targets, Verschlüsselung, Wiederherstellung, API und mehr.

---

## Systemvoraussetzungen

- Unraid 6.9 oder neuer
- Community-Apps-Plugin (für die Store-Installation)
- ~500 MB Speicherplatz für den Container
- Zugriff auf den Docker-Socket

---

## Wiederherstellung verifizieren

> **Ein Backup ist kein Backup, bis du es wiederhergestellt hast.**

Backup-Jobs anlegen ist nur der erste Schritt. Teste den vollständigen
Wiederherstellungspfad, bevor du ihn im Notfall benötigst:

1. Einen Backup-Job ausführen und abschließen lassen
2. **Recovery → Backup verifizieren** ausführen — bestätigt, dass die Prüfsummen übereinstimmen
3. Mindestens einmal [Disaster Recovery — Tag Null](docs/de/05-recovery/disaster-recovery-day-zero.md)
   vollständig auf einem Testgerät oder in einer VM durchführen

**3-2-1-Regel:** **3** Kopien der Daten, auf **2** verschiedenen Medientypen,
mit **1** Kopie an einem anderen Ort (oder zumindest auf einem separaten NAS).

HELBACKUP unterstützt dieses Muster mit mehreren Targets pro Job — ein lokales
Target und ein externes SSH/Rsync-Target dem gleichen Job zuweisen.

---

## Lizenz

MIT © 2024 HEL*Apps
