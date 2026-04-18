# Sicherheit

## Authentifizierung

### WebUI (Session JWT)
- JWT mit 24h Ablauf
- Refresh bei Aktivität
- bcryptjs Cost 12 für Passwort-Hash

### API (Bearer Token)
- Format: `helbackup_[random-64-chars]`
- Scopes: read / write / admin
- Revokierbar jederzeit

## HTTPS einrichten (empfohlen)

Standard: HTTP (nur LAN).

Für HTTPS: Nginx Reverse Proxy empfohlen:

```nginx
server {
  listen 443 ssl;
  server_name helbackup.yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## Credential Management

- Alle Secrets in SQLite (encrypted at rest optional)
- API-Responses: Credentials werden immer geschwärzt (`***`)
- SSH Keys: Gespeichert in `/app/config/ssh/`, Permissions 600

## Container Security

**HELBACKUP benötigt KEINEN Privileged-Mode.** Der Container läuft mit `privileged: false`
und nutzt ausschließlich die in `docker-compose.yml` aufgeführten Host-Mounts. Jeder Mount
hat einen klar definierten Zweck und benötigt nur den minimalen Zugriff:

| Host-Pfad | Container-Pfad | Modus | Zweck | Benötigt für |
|-----------|----------------|-------|-------|--------------|
| `/boot` | `/unraid/boot` | rw | Flash-Drive lesen + restore | Flash-Backup/Restore |
| `/mnt/user` | `/unraid/user` | rw | Array-Share lesen + restore | Appdata, VM, Custom-Path Backups/Restores |
| `/mnt/cache` | `/unraid/cache` | rw | Cache-Pool lesen + restore (Appdata/VM-Disks) | Appdata, VM-Backups/Restores |
| `/var/run/docker.sock` | `/var/run/docker.sock` | rw | Docker-API (Container stop/start, Image-Export) | Appdata, Docker-Image-Backups |
| `/etc/libvirt` | `/unraid/libvirt` | rw | VM-XML-Definitionen + restore | VM-Backups (optional) |
| `/var/run/libvirt/libvirt-sock` | gleich | rw | libvirt-API (Snapshot, dumpxml) | VM-Backups (optional) |

Wird ein Backup-Typ nicht benötigt, kann der zugehörige Mount entfernt werden — die
entsprechenden Job-Typen sind dann in der UI nicht verfügbar. Der Docker-Socket ist der
einzige Mount, der Host-Kontrolle ermöglicht; den Container deshalb nur im LAN oder
hinter einem Reverse Proxy mit Auth exponieren.

## Rate Limiting

- 100 Requests/Minute/Token
- Login: 10 Versuche/15 Minuten (dann Lockout)

## Audit Log

Alle erfolgreichen schreibenden API-Anfragen (POST/PUT/DELETE mit HTTP-Status < 400) werden automatisch in der `audit_log`-Tabelle protokolliert.

**Protokolliert wird:**
- Aktion (z.B. `POST /api/jobs`)
- Akteur (Benutzername aus dem JWT)
- Ressource und Ressourcen-ID
- HTTP-Status

Das Audit-Log ist über `GET /api/audit-log` abrufbar (JWT-Authentifizierung erforderlich).

> Fehlgeschlagene und nicht authentifizierte Anfragen werden **nicht** protokolliert.

## Session-Sicherheit

**Cross-Tab-Logout:** Beim Abmelden in einem Browser-Tab werden automatisch alle anderen offenen Tabs der gleichen Instanz abgemeldet. Dies verhindert, dass aktive Sessions in vergessenen Tabs bestehen bleiben.

---
Weiter: [Best Practices](../16-best-practices/security.md)
