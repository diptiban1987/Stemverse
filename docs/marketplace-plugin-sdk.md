# STEMVerse Marketplace Plugin SDK

## Package layout

```
my-plugin/
├── plugin.json      # Required manifest
├── blocks/          # Blockly block definitions (JSON)
├── generators/      # Code generator mappings
├── assets/          # Icons, thumbnails, wiring diagrams
└── docs/            # README, examples, API notes
```

## plugin.json schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Display name |
| `slug` | string | yes | Unique kebab-case id |
| `version` | string | yes | Semver (e.g. `1.0.0`) |
| `author` | string | yes | Creator name or org |
| `description` | string | yes | Short summary |
| `category` | string | yes | e.g. sensors, robotics, iot |
| `blocks` | string[] | no | Block type ids provided |
| `generators` | string[] | no | Target generators (arduino, micropython) |
| `assets` | string[] | no | Asset file paths |
| `docs` | string[] | no | Documentation file paths |

### Example

```json
{
  "name": "DHT Sensor Pack",
  "slug": "dht-sensor-pack",
  "version": "1.0.0",
  "author": "STEMVerse",
  "description": "DHT11/DHT22 blocks with validation helpers",
  "category": "sensors",
  "blocks": ["stemverse_sensor_read"],
  "generators": ["arduino", "micropython"],
  "assets": ["assets/icon.svg"],
  "docs": ["docs/README.md"]
}
```

## Lifecycle API

| Action | Endpoint | Description |
|--------|----------|-------------|
| Install | `POST /api/plugins/:listingId/install` | Creates installation (enabled) |
| Enable | `POST /api/plugins/:listingId/enable` | Sets state to ENABLED |
| Disable | `POST /api/plugins/:listingId/disable` | Sets state to DISABLED |
| Upgrade | `POST /api/plugins/:listingId/upgrade` | Syncs to latest listing version |
| Remove | `DELETE /api/plugins/:listingId` | Uninstalls plugin |

## Publishing

`POST /api/listings/publish/plugin` with JWT and `plugin.json` body.

## Integration

Installed plugins merge into the component registry and Blockly toolbox at runtime (foundation release stores manifest; full hot-load in a future phase).
