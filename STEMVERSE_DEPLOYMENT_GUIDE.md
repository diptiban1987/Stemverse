# STEMVerse Deployment Guide

## Prerequisites
- Node.js 18+
- pnpm 8+
- Git

## Build
```bash
# Install dependencies
pnpm install

# Build runtime engine (TypeScript check)
pnpm --filter @stemverse/runtime-engine build

# Run tests
pnpm --filter @stemverse/runtime-engine test

# Build web app (Next.js production)
pnpm --filter @stemverse/web build
```

## Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/stemverse

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_EXPIRY=86400000

# Payment Providers (when ready)
STRIPE_KEY=sk_live_xxx
RAZORPAY_KEY=rzp_live_xxx
PAYPAL_CLIENT_ID=xxx

# Analytics
ANALYTICS_ENDPOINT=https://analytics.stemverse.com

# Feature Flags
ENABLE_MARKETPLACE=true
ENABLE_COMPETITIONS=true
ENABLE_AI=true
ENABLE_DEVICE_UPLOAD=true
```

## Deployment Targets
| Target | Stack | Status |
|--------|-------|--------|
| Vercel | Next.js, Edge | ✅ Ready |
| AWS | ECS, RDS, S3 | ✅ Ready |
| Azure | App Service | ✅ Ready |
| Docker | Container | ✅ Ready |

## Monitoring
- Observability runtime provides health checks
- CI/CD runtime provides build pipeline
- Backup runtime provides data protection
- Release management provides versioning
