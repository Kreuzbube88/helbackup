# Error Messages Reference

## Backup Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `EACCES: permission denied` | Missing permissions | Check Privileged Mode |
| `ENOSPC: no space left` | No storage | Run GFS cleanup, delete old backups |
| `ENOENT: no such file` | Path doesn't exist | Check mount paths |
| `Connection refused` | NAS/Cloud unreachable | Check network, SSH key |
| `Authentication failed` | Wrong password/key | Check credentials |
| `Parity check is running` | Parity running | Wait or adjust schedule |

## API Errors

| Code | Meaning | Fix |
|------|---------|-----|
| `UNAUTHORIZED` | Token missing or invalid | Check token, create new if needed |
| `FORBIDDEN` | Insufficient scope | Use token with correct scope |
| `NOT_FOUND` | Job/Target not found | Check ID |
| `RATE_LIMIT` | Too many requests | Wait (check Retry-After header) |
| `VALIDATION_ERROR` | Invalid data | Check request body |

## Encryption Errors

| Error | Meaning |
|-------|---------|
| `Decryption failed: invalid key` | Wrong recovery key |
| `Decryption failed: corrupted data` | Backup file damaged |
| `Key derivation failed` | Internal error |

## SSH Errors

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` | SSH port blocked or wrong |
| `EHOSTUNREACH` | NAS unreachable (WOL?) |
| `Key must be 600` | `chmod 600 /app/config/ssh/KEY` |
| `Permission denied (publickey)` | Public key not added to NAS |

---
Back: [Common Issues](common-issues.md)
