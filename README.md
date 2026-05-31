# STEMVerse Block Coding Platform

Phase 1 foundation: monorepo, authentication, dashboard, PostgreSQL schema, and Scratch Studio.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand, React Query |
| Backend | NestJS 10, JWT auth, Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (Docker, ready for Phase 2) |

## Monorepo layout

```
apps/web              Next.js application
packages/database     Prisma schema & client
packages/ui           Shared UI components
packages/scratch-engine  Vite-bundled Scratch VM (output → apps/web/public/scratch)
services/api          NestJS REST API
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### 2. Install

```bash
pnpm install
```

### 3. Environment

```bash
cp .env.example .env
```

### 4. Start database

```bash
docker compose up -d postgres
```

### 5. Migrate & seed

```bash
pnpm db:generate
pnpm --filter @stemverse/database push
pnpm --filter @stemverse/database seed
```

### 5b. Build Scratch engine bundle (required for Scratch Studio)

```bash
pnpm build:scratch
```

Or apply the committed migration:

```bash
cd packages/database && pnpm exec prisma migrate deploy
```

### 6. Run development

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Health: http://localhost:4000/api/health

## Phase 1 scope

- User registration & login (JWT + refresh tokens)
- Role-based user model (7 roles in schema)
- Dashboard with recent projects, learning courses, certifications
- Scratch Studio (Scratch VM, stage, sprites, save/load projects)
- PostgreSQL schema for users, organizations, projects, workspaces, courses, certificates, audit logs

**Not included in Phase 1** (future phases): Robotics Studio, IoT, Simulator, Marketplace, LMS UI, ROS2, Industrial, full Blockly block editor.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/users/me` | Profile |
| GET | `/api/users/me/dashboard` | Dashboard data |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Project CRUD |

## Design tokens

- Primary `#2563EB`, Secondary `#7C3AED`, Accent `#06B6D4`
- Light theme default per specification

## Documentation

Implementation specs live in `/docs`:

- `STEMVerse_Implementation_Bible_v1.md`
- `STEMVerse_Enterprise_Handoff_Bible_v2.md`
- `STEMVerse_V3_Enterprise_Implementation_Specification.md`
