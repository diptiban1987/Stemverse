# Scratch Integration Notes

## Package: `@stemverse/scratch-engine`

Wraps **scratch-vm**, **scratch-render**, **scratch-storage** without replacing the VM.

### Phase 5 foundations

| Module | Purpose |
|--------|---------|
| `hardware-extension.ts` | GPIO pin state + runtime hooks for board bridges |
| `blockly-bridge.ts` | Opcode → Blockly type mapping for import/export |
| `sprite-stage.ts` | Stage/sprite list helpers for workspace UI |
| `index.ts` | `createScratchRuntime()` — canvas attach, green flag, project JSON |

## Web UI

- `/scratch` — project list
- `/scratch/[projectId]` — 4-panel layout: blocks palette, stage, hardware pins, sprites/assets

Full scratch-blocks editor is phased; hardware panel wires extension state for future VM blocks.

## Asset persistence (Phase 5.2A)

Costumes and sounds upload via pre-signed URLs to the `scratch-assets` MinIO bucket. See [scratch-asset-architecture.md](./scratch-asset-architecture.md).

## Blockly robotics flow

Use `scratchBlocksToBlockly()` to produce blocks compatible with Robotics Studio `WorkspaceDocument`. Unmapped opcodes are reported for manual follow-up.
