# Cloud Target Setup (Rclone)

## Supported Providers

Via Rclone (40+ providers):
- **Backblaze B2** (recommended, cheapest)
- Amazon S3
- Google Drive / Google Cloud Storage
- Microsoft OneDrive / Azure Blob
- Wasabi, Cloudflare R2
- SFTP, WebDAV, FTP
- And many more...

## Configure Rclone Remote

Rclone must be configured first:

```bash
# In HELBACKUP container
docker exec -it helbackup rclone config
```

Example for Backblaze B2:
```
n) New remote
name> myb2
Storage> b2
account> YOUR_ACCOUNT_ID
key> YOUR_APPLICATION_KEY
```

## Cloud Target in HELBACKUP

```
Type: Cloud (Rclone)
Name: Backblaze B2
Rclone Remote: myb2:helbackup-bucket
```

## Recommendation: Backblaze B2

- Cost: $0.006/GB/month (cheapest S3-compatible)
- Free egress to Cloudflare
- S3-compatible
- Reliable

Create bucket in B2 Dashboard:
1. Create Backblaze account
2. Buckets → "Create a Bucket"
3. Name: `your-server-helbackup`
4. Privacy: Private
5. Create Application Key with bucket access

---
Back: [Target Overview](overview.md)
