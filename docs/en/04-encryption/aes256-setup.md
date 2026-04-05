# Encryption

## Why Encrypt?

- **Off-site Backups:** Cloud/NAS don't belong to you
- **Privacy:** GDPR compliance
- **Security:** Provider breach → data still safe

## Encryption in HELBACKUP

- Tool: GPG (GNU Privacy Guard) symmetric encryption
- Cipher: AES-256
- Password: derived from your recovery key

## Enable Encryption

1. Create/edit a Job
2. **Advanced → Encrypt Backup:** enable
3. On first enable, the Encryption Setup Wizard runs and generates a Recovery Key:

```
Recovery Key: HLBK-XXXX-XXXX-XXXX-XXXX
```

> **CRITICAL: Save this key NOW! It will NEVER be shown again!**

4. Save in password manager (1Password, Bitwarden, etc.)
5. Complete the wizard

## Secure Key Storage

**Recommended:**
- Password manager (1Password, Bitwarden)
- Printed copy in safe/bank vault
- Encrypted note (Obsidian, Standard Notes)

**Not recommended:**
- Memory only
- Unencrypted text file
- Email

> **Lost key = lost backups. No recovery possible without the key!**

More details: [Recovery Key Management](recovery-key.md)

## Performance

- Overhead: ~10-20%
- No noticeable difference for normal backups

---
Next: [Recovery Key Management](recovery-key.md)
