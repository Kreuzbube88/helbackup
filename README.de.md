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
  <img src="https://img.shields.io/badge/status-in%20development-yellow" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/helbackup" alt="Lizenz">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Plattform">
</p>

---

HELBACKUP ist eine selbst gehostete Backup-Lösung, die speziell für [Unraid](https://unraid.net) entwickelt wurde. Als einzelner Docker-Container gibt sie dir volle Kontrolle darüber, was gesichert wird, wann und wohin — mit einer übersichtlichen Web-Oberfläche, ohne Cloud-Abhängigkeit und ohne Abo.

---

## Features

- **Automatisierte Backup-Jobs** — Flash Drive, Appdata, VMs, Docker Images, System-Konfiguration
- **Mehrere Zieltypen** — Lokales Dateisystem, NAS via SSH+Rsync, 40+ Cloud-Anbieter via Rclone
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
    privileged: true
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/appdata/helbackup/data:/app/data
      - /mnt/user/appdata/helbackup/config:/app/config
      - /mnt/user/appdata/helbackup/logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock
      - /boot:/unraid/boot:ro
      - /mnt/user:/unraid/user:ro
```

> **Hinweis:** Privilegierter Modus ist erforderlich, um auf den Unraid Flash Drive (`/boot`) und das User-Array zuzugreifen.

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

## Lizenz

MIT © 2024 HEL*Apps
