# Scratch Asset Architecture

Scratch costumes and sounds persist through the shared asset pipeline — **not** embedded in `workspace_json`.

## Supported types

| Purpose | MIME |
|---------|------|
| SCRATCH_COSTUME | `image/svg+xml`, `image/png` |
| SCRATCH_SOUND | `audio/wav`, `audio/mpeg`, `audio/mp3` |

## API

- `POST /api/scratch/projects/:projectId/assets/presign`
- `POST /api/scratch/projects/:projectId/assets/resolve-urls` — batch download URLs for runtime
- `GET /api/scratch/projects/:projectId/assets/manifest`

## Runtime resolution

`@stemverse/scratch-engine` exports `buildScratchAssetIdList()` to collect asset IDs from a manifest. The web workspace fetches signed URLs and passes them to scratch-vm loaders (Phase 5.2B GUI).

## Dependency note

Full scratch-gui is **not** required for asset infrastructure. GUI completion can proceed once buckets and manifests are stable.
