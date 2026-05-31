# Object Storage Setup

STEMVerse uses **MinIO** (S3-compatible) for private asset storage. All uploads use **pre-signed URLs** — buckets are not publicly writable.

## Quick start

```bash
docker compose -f docker-compose.yml -f docker-compose.storage.yml up -d
```

Console: http://localhost:9001 (user/password from env).

## Buckets

| Bucket | Use |
|--------|-----|
| `scratch-assets` | Costumes (SVG/PNG), sounds (WAV/MP3) |
| `project-assets` | Thumbnails, attachments |
| `marketplace-assets` | Icons, previews, downloads |
| `ai-assets` | Diagrams, wiring previews, AI images |

## API environment (services/api)

```env
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=stemverse
S3_SECRET_KEY=stemverse_minio_dev
S3_REGION=us-east-1
S3_PRESIGN_UPLOAD_EXPIRES=900
S3_PRESIGN_DOWNLOAD_EXPIRES=3600
```

## Upload flow

1. `POST /api/storage/presign/upload` — returns `uploadUrl` + `assetId`
2. Client `PUT` file to `uploadUrl`
3. `POST /api/storage/assets/:id/confirm` — marks asset confirmed in DB

Scratch shortcut: `POST /api/scratch/projects/:id/assets/presign`

See [asset-pipeline-architecture.md](./asset-pipeline-architecture.md).
