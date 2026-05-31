# E2E Testing Guide

## Run locally

```bash
pnpm install
pnpm --filter @stemverse/web build
pnpm exec playwright install chromium
pnpm test:e2e
```

With dev server already running on port 3000, Playwright reuses it (`reuseExistingServer`).

## Suites

| File | Scope |
|------|--------|
| `tests/e2e/smoke.spec.ts` | Public pages, sitemap, robots |
| `tests/e2e/api-health.spec.ts` | Gateway health + `/health/full` |

## CI

`.github/workflows/e2e.yml` runs on push/PR after web build.

## Environment

- `E2E_BASE_URL` — default `http://localhost:3000`
- `E2E_API_URL` — default `http://localhost:4000/api`

Full auth/robotics flows require running API + DB; extend specs in `tests/e2e/` as services are up in CI.
