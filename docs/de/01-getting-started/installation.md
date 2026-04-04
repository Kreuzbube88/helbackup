# Installation

## Voraussetzungen

- Unraid 6.9 oder neuer
- Community Apps Plugin installiert
- Mindestens 2 GB freier Speicher für Appdata

## Installation via Community Apps

### Schritt 1: Community Apps öffnen

1. Unraid WebGUI öffnen
2. Zum Tab **"Apps"** navigieren
3. Suchfeld: **"HELBACKUP"** eingeben

### Schritt 2: Container Template konfigurieren

| Setting | Wert | Beschreibung |
|---------|------|--------------|
| Port | 3000 | WebGUI Port (änderbar) |
| Appdata | /mnt/user/appdata/helbackup | Konfiguration & Datenbank |
| Docker Socket | /var/run/docker.sock | Container-Zugriff (erforderlich!) |

**Empfohlene zusätzliche Pfade:**

```
Container Path: /mnt/user  →  Host Path: /mnt/user  (Read/Write)
Container Path: /mnt/cache →  Host Path: /mnt/cache (Read/Write)
```

### Schritt 3: Container starten

1. "Apply" klicken
2. Container wird heruntergeladen und gestartet
3. Status prüfen: Docker Tab → HELBACKUP sollte "Started" sein

### Erste Anmeldung

```
http://YOUR-UNRAID-IP:3000
Beispiel: http://192.168.1.100:3000
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
