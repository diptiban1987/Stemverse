# STEMVerse Architecture Overview

## Monorepo layout

| Layer | Packages / services |
|-------|---------------------|
| Web | `apps/web` — Next.js 15 App Router |
| Shared UI | `packages/ui`, `packages/auth`, `packages/database` |
| Engines | `blockly-engine`, `scratch-engine`, `simulator-engine` |
| API Gateway | `services/api` (port 4000) |
| Microservices | `ai` (4002), `compiler` (4001), `lms` (4003), `marketplace` (4004) |

## Request flow

1. Browser calls `NEXT_PUBLIC_API_URL` (typically `/api` via Next rewrites).
2. Gateway (`setup-gateway-proxy`) forwards `/api/ai`, `/api/compiler`, `/api/lms`, `/api/marketplace`.
3. JWT from `@stemverse/auth` protects user routes; `@Public()` for health checks.

## Data

- PostgreSQL via Prisma (`@stemverse/database`).
- Project workspaces stored as JSON snapshots on `projects` / `project_versions`.
- Object storage: MinIO (S3-compatible) for Scratch costumes/sounds, marketplace media, AI artifacts — see [object-storage-setup.md](./object-storage-setup.md).

## Realtime

- Socket.IO namespace `/collaboration` on API service for presence and workspace locks (not CRDT).

## AI

- Provider registry: OpenRouter (optional), rule-based fallback.
- SSE streaming: `POST /api/ai/copilot/stream` when `AI_STREAMING_ENABLED=true`.

See also: [AI architecture](./ai-architecture.md), [API overview](./api-overview.md).
