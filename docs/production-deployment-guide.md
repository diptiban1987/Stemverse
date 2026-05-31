# Production Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- pnpm 9

## Environment

Copy `.env.example` to `.env` at repo root and per service. Set secrets only in environment — never in git.

Required:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (32+ chars)
- `CORS_ORIGIN` (production frontend URL)
- `NEXT_PUBLIC_API_URL` (gateway `/api` or full URL)
- `OPENROUTER_API_KEY` (optional; rule-based fallback works offline)

## Build

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm build
```

## Run services

| Service | Port | Health |
|---------|------|--------|
| API Gateway | 4000 | `/api/health`, `/api/health/full` |
| Compiler | 4001 | `/api/health` |
| AI | 4002 | `/api/health` |
| LMS | 4003 | `/api/health` |
| Marketplace | 4004 | `/api/health` |
| Web | 3000 | Next.js |

## OpenAPI

- Gateway: `http://localhost:4000/api/docs`
- AI: `http://localhost:4002/api/docs`
- LMS, Compiler, Marketplace: same pattern on their ports

## Streaming

Set `AI_STREAMING_ENABLED=true` and configure OpenRouter models via `OPENROUTER_MODEL_*` env vars. See [OpenRouter setup](./openrouter-setup-guide.md).
