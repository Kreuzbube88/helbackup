# Common Issues

## 1. Backup fails with "Permission denied"

**Symptom:**
```
Error: EACCES: permission denied, open '/mnt/user/appdata/nextcloud/...'
```

**Solutions:**

a) File ownership issue:
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

## 11. Login Lockout — "Invalid credentials" after password reset

If you can no longer log in and the correct password is rejected, the most common
cause is that the `JWT_SECRET` environment variable changed, which invalidates
all active sessions and — critically — all encrypted credentials in the database.

**If you only changed the password (not JWT_SECRET):**
```bash
# Confirm the container is using the right .env file
docker inspect helbackup | grep -A2 JWT_SECRET
```

**If JWT_SECRET was accidentally rotated:**
> **Warning:** Rotating JWT_SECRET destroys all encrypted target credentials
> (SSH keys, passwords) stored in the database. There is no way to recover
> them without the original JWT_SECRET. You must re-enter credentials for every
> target manually.

Steps to regain access:
1. `docker stop helbackup`
2. Restore the original JWT_SECRET in `/mnt/user/appdata/helbackup/.env`
3. `docker start helbackup`
4. If the original JWT_SECRET is not known, you must delete the database and
   start fresh (all target credentials are lost):
   ```bash
   rm /mnt/user/appdata/helbackup/data/helbackup.db
   docker restart helbackup
   ```

---

## 12. JWT_SECRET Rotation — Data Loss Warning

**Do NOT change the JWT_SECRET without a plan.** The secret is used to derive
the master encryption key for all credentials. Changing it mid-production:

- Invalidates all active login sessions (recoverable — just log in again)
- **Destroys all encrypted target credentials** (SSH keys, NAS passwords) — NOT recoverable without the old secret
- Has no effect on backup files already written to targets

If you need to rotate JWT_SECRET safely:
1. Export all target configs before rotating (note SSH key paths, passwords)
2. Stop HELBACKUP
3. Update JWT_SECRET in `.env`
4. Start HELBACKUP — you will be prompted to re-enter credentials for all targets
5. Re-enter all target credentials in the UI

---

## 13. Database Corruption

**Symptoms:** HELBACKUP starts but shows no jobs/targets, or container crashes
immediately with SQLite errors in the logs.

**Diagnose:**
```bash
docker logs helbackup --tail 50
# Look for: "SQLITE_CORRUPT" or "database disk image is malformed"
```

**Recovery options (in order of preference):**

1. **Restore from self-backup** (best option):
   See [Disaster Recovery — Day Zero](../05-recovery/disaster-recovery-day-zero.md)

2. **Attempt SQLite repair:**
   ```bash
   docker exec helbackup sh -c "sqlite3 /app/data/helbackup.db '.recover' | sqlite3 /app/data/helbackup-recovered.db"
   docker exec helbackup sh -c "mv /app/data/helbackup.db /app/data/helbackup.db.corrupt && mv /app/data/helbackup-recovered.db /app/data/helbackup.db"
   docker restart helbackup
   ```

3. **Delete and start fresh** (last resort — all config lost):
   ```bash
   rm /mnt/user/appdata/helbackup/data/helbackup.db
   docker restart helbackup
   ```

---

## 14. Cron Job Not Firing — Timezone Issues

If jobs run at the wrong time or not at all, the container timezone may not
match your expectation.

**Check container time:**
```bash
docker exec helbackup date
# Should match your local time
```

**Fix:** Set the `TZ` environment variable in `docker-compose.yml`:
```yaml
environment:
  - TZ=Europe/Berlin    # adjust to your timezone
```

A list of valid timezone names: `docker exec helbackup cat /usr/share/zoneinfo/zone.tab | awk '{print $3}'`

After changing TZ, restart the container. Running jobs are not affected — only
future schedule calculations change.

---

## 15. Large Backup Network Timeouts

For backups over slow or unreliable networks (e.g., 1 Gbit NAS across a VPN):

**Symptom:** Rsync runs for hours then dies with "Broken pipe" or SSH timeout.

**Fixes:**

Set bandwidth limit in the job config to avoid saturating the link and causing
TCP timeouts:
```
bwlimit: 50M   # 50 MB/s — adjust to your available bandwidth
```

Increase SSH keepalive in the NAS target config (sent to the SSH server every
60 seconds to prevent idle timeout):

The `ssh2` library sends keepalives automatically when the connection is active.
If your NAS drops idle SSH connections, check the NAS-side `sshd_config`:
```
ClientAliveInterval 120
ClientAliveCountMax 3
```

For very large VM disk backups, consider running the job during off-peak hours
to avoid competing with other network traffic.

---

## 16. Rsync Exit Codes 23 and 24

Rsync exits with code **23** (partial transfer) or **24** (vanished files) when
some files could not be transferred.

| Code | Meaning | HELBACKUP behavior |
|------|---------|-------------------|
| 23 | Some files could not be transferred (e.g., permission denied mid-run) | Warning logged, backup marked **partial** |
| 24 | Some files vanished during transfer (container wrote/deleted a file mid-backup) | Warning logged, backup marked **partial** |

**For Flash Drive and System Config backups**, these codes are treated as **failures**
(strict mode) because those backups must be byte-exact. Re-run after stopping
any activity that could modify those paths.

**For Appdata backups**, code 24 is common when containers are running during
backup. To eliminate it:
```
Jobs → your job → Edit → "Stop containers before backup": enabled
```

---

## Enable Debug Mode

```bash
# Restart with debug logging (temporary — reverts on container restart)
docker exec helbackup sh -c "LOG_LEVEL=debug node server.js"

# Or set permanently in docker-compose.yml:
# environment:
#   - LOG_LEVEL=debug
```

## Export Logs

```bash
docker logs helbackup > helbackup_debug.log 2>&1
```

---
Next: [Error Messages Reference](error-messages.md)
