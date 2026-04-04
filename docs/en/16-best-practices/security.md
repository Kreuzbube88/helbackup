# Security Best Practices

## Recovery Key Management

- [ ] Save recovery key in password manager immediately
- [ ] Keep a printed copy in a safe or bank vault
- [ ] Test key after creation (create encrypted backup, then decrypt test)

## API Tokens

- [ ] Minimal scopes (read-only if only reading needed)
- [ ] Set expiry dates (1 year recommended)
- [ ] Separate tokens per integration (not one for everything)
- [ ] Revoke unused tokens

## Network

- [ ] HELBACKUP LAN-only (no direct internet exposure)
- [ ] If internet access needed: VPN or reverse proxy with HTTPS

## Passwords

- [ ] Strong admin password (min 12 characters)
- [ ] Use a password manager
- [ ] Don't reuse Unraid password

## Container Permissions

- [ ] Privileged mode only when needed
- [ ] Docker socket mounting only when Docker Image Backup is required

---
Back: [Backup Strategy](backup-strategy.md)
