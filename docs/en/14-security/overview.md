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

**HELBACKUP does NOT require privileged mode.** The container runs with `privileged: false`
and uses only the explicit host mounts listed in `docker-compose.yml`. Each mount has a
specific purpose and minimum required access:

| Host path | Container path | Mode | Purpose | Required for |
|-----------|----------------|------|---------|--------------|
| `/boot` | `/unraid/boot` | rw | Flash drive read + restore | Flash backup/restore |
| `/mnt/user` | `/unraid/user` | rw | Appdata + VM image read + restore | Appdata, VM, custom path backups/restores |
| `/var/run/docker.sock` | `/var/run/docker.sock` | rw | Docker API (container stop/start, image export) | Appdata, Docker image backups |
| `/etc/libvirt` | `/unraid/libvirt` | ro | VM XML definitions | VM backups (optional) |
| `/var/run/libvirt/libvirt-sock` | same | rw | libvirt API (snapshot, dumpxml) | VM backups (optional) |
| `/mnt/cache` | `/mnt/cache` | ro | VM disk image read from cache pool | VM backups (optional) |

If you don't need a given backup type, omit its mount — the related job types simply
won't be available in the UI. The Docker socket is the only mount that grants any kind
of host control; treat the helbackup container's network exposure accordingly (LAN only,
or behind a reverse proxy with auth).

## Rate Limiting

- 100 requests/minute/token
- Login: 10 attempts/15 minutes (then lockout)

---
Next: [Best Practices](../16-best-practices/security.md)
