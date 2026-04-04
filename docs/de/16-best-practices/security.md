# Security Best Practices

## Recovery Key Management

- [ ] Recovery Key in Passwort-Manager speichern
- [ ] Zweite Kopie ausgedruckt in Safe
- [ ] Key nach Erstellung sofort testen (verschlüsselt backup, dann decrypt testen)

## API Tokens

- [ ] Minimale Scopes (nur read wenn nur lesen nötig)
- [ ] Tokens mit Ablaufdatum versehen (1 Jahr empfohlen)
- [ ] Separate Tokens pro Integration (nicht einen für alles)
- [ ] Ungenutzte Tokens revoken

## Netzwerk

- [ ] HELBACKUP nur im LAN (kein direktes Internet-Exposure)
- [ ] Falls Internet-Zugriff nötig: VPN oder Reverse Proxy mit HTTPS

## Passwörter

- [ ] Starkes Admin-Passwort (min. 12 Zeichen)
- [ ] Passwort-Manager verwenden
- [ ] Nicht dasselbe Passwort wie Unraid

## Container Permissions

- [ ] Privileged nur wenn nötig
- [ ] Docker Socket Mounting nur wenn Docker Image Backup gebraucht

---
Zurück: [Backup Strategy](backup-strategy.md)
