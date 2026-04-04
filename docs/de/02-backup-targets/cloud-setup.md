# Cloud Target einrichten (Rclone)

## Unterstützte Provider

Via Rclone (40+ Provider):
- **Backblaze B2** (empfohlen, günstig)
- Amazon S3
- Google Drive / Google Cloud Storage
- Microsoft OneDrive / Azure Blob
- Wasabi, Cloudflare R2
- SFTP, WebDAV, FTP
- Und viele mehr...

## Rclone Remote konfigurieren

Rclone muss zuerst konfiguriert werden:

```bash
# Im HELBACKUP Container
docker exec -it helbackup rclone config
```

Beispiel für Backblaze B2:
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

## Empfehlung: Backblaze B2

- Kosten: $0.006/GB/Monat (günstigster S3-kompatibler)
- Kostenloses Egress zu Cloudflare
- S3-kompatibel
- Zuverlässig

Bucket anlegen in B2 Dashboard:
1. Backblaze Account erstellen
2. Buckets → "Create a Bucket"
3. Name: `your-server-helbackup`
4. Privacy: Private
5. Application Key mit Bucket-Zugriff erstellen

---
Zurück: [Target Overview](overview.md)
