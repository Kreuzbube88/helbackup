# NAS Target einrichten (Synology / QNAP)

## Voraussetzungen

- NAS im gleichen Netzwerk wie Unraid
- SSH auf NAS aktiviert
- Backup-User auf NAS angelegt

## SSH Key generieren

HELBACKUP generiert automatisch einen SSH Key beim Target-Erstellen.
Oder manuell:

```bash
# Auf Unraid (im HELBACKUP Container)
ssh-keygen -t ed25519 -f /app/config/ssh/nas_key -N ""
cat /app/config/ssh/nas_key.pub
```

Den Public Key auf der NAS hinterlegen:
```bash
# Auf NAS (SSH)
echo "PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Target konfigurieren

```
Type: NAS (SSH+Rsync)
Name: Synology NAS
Host: 192.168.1.200
Port: 22
Username: helbackup
SSH Key: /app/config/ssh/nas_key
Remote Path: /volume1/Backups/helbackup
```

## Verbindung testen

1. Target → "Test Connection"
2. Ergebnis: "Connection successful!"

Falls Fehler:
- SSH Port korrekt? (Standard: 22)
- Firewall auf NAS?
- User hat Schreibrechte auf Remote Path?

## WOL (Wake-on-LAN)

NAS automatisch aufwecken vor Backup:

```
Wake-on-LAN: ✅
MAC Address: 00:11:22:33:44:55
Wait for NAS: 60 Sekunden
Shutdown after backup: ✅
```

---
Zurück: [Target Overview](overview.md)
