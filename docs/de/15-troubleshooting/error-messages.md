# Error Messages Reference

## Backup Errors

| Error | Ursache | Lösung |
|-------|---------|--------|
| `EACCES: permission denied` | Fehlende Berechtigungen | Privileged Mode prüfen |
| `ENOSPC: no space left` | Kein Speicher | GFS Cleanup, alte Backups löschen |
| `ENOENT: no such file` | Pfad nicht vorhanden | Mount-Pfade prüfen |
| `Connection refused` | NAS/Cloud nicht erreichbar | Netzwerk, SSH-Key prüfen |
| `Authentication failed` | Falsches Passwort/Key | Credentials prüfen |
| `Parity check is running` | Parity läuft | Warten oder Schedule anpassen |
| `Array is not started` | Array offline | Unraid Array starten |

## API Errors

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `UNAUTHORIZED` | Token fehlt oder ungültig | Token prüfen, ggf. neu erstellen |
| `FORBIDDEN` | Scope nicht ausreichend | Token mit richtigem Scope verwenden |
| `NOT_FOUND` | Job/Target nicht gefunden | ID prüfen |
| `RATE_LIMIT` | Zu viele Requests | Warten (Retry-After Header) |
| `VALIDATION_ERROR` | Ungültige Daten | Request-Body prüfen |

## Encryption Errors

| Error | Bedeutung |
|-------|-----------|
| `Decryption failed: invalid key` | Recovery Key falsch |
| `Decryption failed: corrupted data` | Backup-Datei beschädigt |
| `Key derivation failed` | Interner Fehler |

## SSH Errors

| Error | Lösung |
|-------|--------|
| `ECONNREFUSED` | SSH-Port gesperrt oder falsch |
| `EHOSTUNREACH` | NAS nicht erreichbar (WOL?) |
| `Key must be 600` | `chmod 600 /app/config/ssh/KEY` |
| `Permission denied (publickey)` | Public Key nicht auf NAS hinterlegt |

---
Zurück: [Common Issues](common-issues.md)
