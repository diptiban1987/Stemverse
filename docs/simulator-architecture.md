# Simulator Architecture

## Package: `@stemverse/simulator-engine`

Four layers (per system design):

1. **HardwareLayer** — virtual boards (Arduino Uno, ESP32, ESP32-S3)
2. **ElectricalLayer** — pin/wire connectivity
3. **LogicLayer** — block metadata execution
4. **VisualizationLayer** — Three.js `SceneRenderer`

## Web workspace

`/simulator` and `/simulator/[projectId]` integrate Blockly workspace, component palette, property inspector, and run/stop/reset.

## Block metadata

`BLOCK_SIMULATION_REGISTRY` maps Blockly types to component types, inputs, outputs, and update frequency.

## Performance notes

- Scene renderer: throttle redraws when idle; wheel zoom + shift-pan documented in workspace.
- Prefer lazy-loading simulator route chunk for initial dashboard load.
