# AES-256 Encryption

## Why Encrypt?

- **Off-site Backups:** Cloud/NAS don't belong to you
- **Privacy:** GDPR compliance
- **Security:** Provider breach → data still safe

## AES-256 in HELBACKUP

- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: PBKDF2 with 100,000 iterations
- Encryption: Stream-based (large files supported)

## Enable Encryption

1. Create/edit Target
2. **Encrypted:** enable
3. Recovery Key is generated:

```
Recovery Key: 8f2a-9c3b-1e7d-4f6a-2b8c-5d9e-3a7f-6c1b
```

> **CRITICAL: Save this key NOW! It will NEVER be shown again!**

4. Save in password manager (1Password, Bitwarden, etc.)
5. Click "Save"

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

AES-256 is hardware-accelerated (AES-NI):
- Overhead: ~10-20%
- Typical CPUs: >1 GB/s encryption rate
- No noticeable difference for normal backups

---
Next: [Recovery Key Management](recovery-key.md)
