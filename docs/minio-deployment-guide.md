# MinIO Deployment Guide

## Development

Use `docker-compose.storage.yml` alongside the main compose file. The `minio-init` service creates four private buckets and disables anonymous access.

## Production recommendations

1. Run MinIO on dedicated storage with TLS termination at the reverse proxy.
2. Use strong `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from secrets manager.
3. Point `S3_ENDPOINT` to internal MinIO URL (not public).
4. Rotate access keys per environment.
5. Enable bucket versioning for marketplace assets (optional).
6. Back up `minio_data` volume or use distributed MinIO for HA.

## Health

- MinIO: `GET /minio/health/live` on port 9000
- STEMVerse: `GET /api/storage/health` and `GET /api/health/full` → `objectStorage`

## Networking

Attach API service to `stemverse-net` when running API in Docker so it can reach `http://minio:9000`.
