# Common Issues

## 1. Backup fails with "Permission denied"

**Symptom:**
```
Error: EACCES: permission denied, open '/mnt/user/appdata/nextcloud/...'
```

**Solutions:**

a) Container not running in privileged mode:
- Unraid → Docker → HELBACKUP → Edit → Privileged: ON
- Restart container

b) File ownership issue:
```bash
ls -la /mnt/user/appdata/nextcloud/
# Check file ownership and permissions
```

## 2. "SSH Connection failed"

**Symptom:**
```
Error: Connection refused / Authentication failed
```

**Fix:**
```bash
# Test SSH manually
ssh -p 22 -i /app/config/ssh/nas_key user@nas-ip

# Check key permissions (must be 600)
ls -la /app/config/ssh/nas_key
chmod 600 /app/config/ssh/nas_key
```

## 3. "Database dump failed"

**Symptom:**
```
Error: mysqldump: Got error: 1045: Access denied for user 'root'
```

**Fix:** Check database credentials in job configuration.
```bash
docker exec -it mariadb mysql -u root -p
```

## 4. "Not enough disk space"

```bash
df -h /mnt/user/
```
Run GFS cleanup or delete old backups manually.

## 5. Job not running on schedule

Checks:
1. Job enabled? (Enabled: ✅)
2. Cron expression correct? → Use Cron Validator
3. HELBACKUP container running? `docker ps | grep helbackup`
4. Unraid time correct? `date` in container

## 6. WebGUI not reachable

```bash
docker ps | grep helbackup
docker logs helbackup --tail 50
netstat -tulpn | grep 3000
```
Common cause: Port conflict → Change port in Docker template.

## 7. Encryption: "Invalid recovery key"

Enter key without spaces.  
Format: `8f2a-9c3b-1e7d-4f6a-2b8c-5d9e-3a7f-6c1b`  
If lost: Backup cannot be decrypted.

## 8. Rsync "vanished file" warning

```
Warning: some files vanished before they could be transferred
```
Normal when containers run during backup. Enable "Stop containers before backup" to prevent this.

## 9. "Parity check is running"

HELBACKUP blocks backup during parity check. Schedule jobs to avoid conflict.

## 10. API: "401 Unauthorized"

- Token correct? No leading/trailing spaces?
- Token expired? Settings → API Tokens
- Correct header: `Authorization: Bearer helbackup_TOKEN`
- Token not revoked?

## Enable Debug Mode

```bash
docker exec helbackup sh -c "LOG_LEVEL=debug node server.js"
```

## Export Logs

```bash
docker logs helbackup > helbackup_debug.log 2>&1
```

---
Next: [Error Messages Reference](error-messages.md)
