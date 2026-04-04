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

HELBACKUP benötigt Privileged Mode für:
- `/boot` Zugriff (Flash Drive Backup)
- Docker Socket

Minimalberechtigungen wenn kein Flash/Docker Backup:
```
Privileged: ☐
Docker Socket: Nur wenn Docker Image Backup benötigt
```

## Rate Limiting

- 100 Requests/Minute/Token
- Login: 10 Versuche/15 Minuten (dann Lockout)

---
Weiter: [Best Practices](../16-best-practices/security.md)
