# Marketplace Plugin SDK — Quickstart

> See full spec: [marketplace-plugin-sdk.md](./marketplace-plugin-sdk.md)

## Layout

```
my-plugin/
  plugin.json
  blocks/
  generators/
  assets/
  docs/
```

## plugin.json (minimal)

```json
{
  "name": "My Sensors Pack",
  "slug": "my-sensors-pack",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Extra sensor blocks for STEMVerse",
  "category": "sensors",
  "blocks": ["blocks/*.json"],
  "generators": ["generators/*.js"]
}
```

## Install flow

1. Publish listing via `POST /api/marketplace/listings` (teacher/admin).
2. Users install: `POST /api/marketplace/plugins/:slug/install`.
3. Lifecycle: enable, disable, upgrade, remove on `PluginInstallation` model.

## API base

All marketplace routes go through gateway: `NEXT_PUBLIC_API_URL` + `/marketplace/...`.
