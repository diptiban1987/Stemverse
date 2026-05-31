# STEMVerse API Overview

Base URL: `/api` (gateway on port 4000).

## Auth

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Bearer |
| GET | `/health` | Public |

## Projects

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/projects` | Bearer |
| GET/PATCH/DELETE | `/projects/:id` | Bearer |

## AI (proxied to AI service)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/ai/explain/block` | Bearer |
| POST | `/ai/copilot` | Bearer |
| POST | `/ai/copilot/stream` | SSE, Bearer |
| POST | `/ai/auto-fix` | Bearer |
| GET | `/ai/providers/health` | Bearer |

## Compiler

| Method | Path |
|--------|------|
| POST | `/compiler` → `/compile` |
| GET | `/compiler/:jobId` |

## LMS

Prefix `/api/lms` rewrites to LMS service `/api` — tracks, courses, progress, certificates.

## Marketplace

Prefix `/api/marketplace` — listings, plugin install lifecycle.

## Object storage (API gateway)

Pre-signed uploads only — no public bucket writes. See [object-storage-setup.md](./object-storage-setup.md).

| Method | Path | Auth |
|--------|------|------|
| GET | `/storage/health` | Public |
| POST | `/storage/presign/upload` | Bearer |
| POST | `/storage/assets/:id/confirm` | Bearer |
| GET | `/storage/assets/:id/download-url` | Bearer |
| DELETE | `/storage/assets/:id` | Bearer |
| POST | `/scratch/projects/:id/assets/presign` | Bearer |
| GET | `/scratch/projects/:id/assets/manifest` | Bearer |
| POST | `/scratch/projects/:id/assets/resolve-urls` | Bearer |
| POST | `/ai/sessions/:id/assets/presign` | Bearer |
| POST | `/marketplace/listings/:id/assets/presign` | Bearer |

`GET /health/full` includes `objectStorage` probe when MinIO is configured.
