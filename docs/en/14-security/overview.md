# Security

## Authentication

### WebUI (Session JWT)
- JWT with 24h expiry
- Refresh on activity
- bcryptjs cost 12 for password hashing

### API (Bearer Token)
- Format: `helbackup_[random-64-chars]`
- Scopes: read / write / admin
- Revocable at any time

## Set Up HTTPS (recommended)

Default: HTTP (LAN only).

For HTTPS: Nginx reverse proxy recommended:

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

- All secrets in SQLite (optionally encrypted at rest)
- API responses: credentials always redacted (`***`)
- SSH Keys: stored in `/app/config/ssh/`, permissions 600

## Container Security

HELBACKUP requires Privileged Mode for:
- `/boot` access (Flash Drive Backup)
- Docker Socket

Minimum permissions when no Flash/Docker backup needed:
```
Privileged: ☐
Docker Socket: Only if Docker Image Backup required
```

## Rate Limiting

- 100 requests/minute/token
- Login: 10 attempts/15 minutes (then lockout)

---
Next: [Best Practices](../16-best-practices/security.md)
