Implementation Plan — Phase 7W — ESP32 & Arduino Visual Board Foundation

Implement deterministic, serializable board metadata for common development boards.

IMPORTANT

This phase DOES NOT implement:

* firmware execution
* Arduino compilation
* ESP32 compilation
* MicroPython execution
* GPIO timing
* Wi-Fi
* Bluetooth
* rendering
* SVG assets

This phase ONLY implements:

* board definitions
* board metadata
* pin maps
* board registry
* serialization
* snapshot synchronization

==================================================
GOAL
====

Introduce reusable board definitions:

* ESP32_DEVKIT_V1
* ARDUINO_UNO
* ARDUINO_NANO
* RASPBERRY_PI_PICO

These become first-class workspace boards.

==================================================

1. TYPES
   ==================================================

[MODIFY]

packages/runtime-engine/src/types/index.ts

Add:

export type DevelopmentBoardType =
| 'ESP32_DEVKIT_V1'
| 'ARDUINO_UNO'
| 'ARDUINO_NANO'
| 'RASPBERRY_PI_PICO';

export interface BoardPinDefinition {
id: string;
label: string;
capabilities: string[];
}

export interface DevelopmentBoardDefinition {
id: string;
type: DevelopmentBoardType;
name: string;
pins: BoardPinDefinition[];
}

Extend WorkspaceBoard:

boardDefinitionId?: string;

==================================================
2. BOARD DEFINITION REGISTRY
============================

[MODIFY]

runtime/index.ts

Add:

boardDefinitionRegistry:
Map<string, DevelopmentBoardDefinition>

Methods:

registerBoardDefinition(...)
removeBoardDefinition(...)
getBoardDefinition(...)
getBoardDefinitions(...)

Requirements:

* deterministic ordering
* deep-copy isolation
* O(1) lookup

==================================================
3. DEFAULT BOARD DEFINITIONS
============================

Provide built-in metadata:

ESP32_DEVKIT_V1

* GPIO0–GPIO39

ARDUINO_UNO

* D0–D13
* A0–A5

ARDUINO_NANO

* D0–D13
* A0–A7

RASPBERRY_PI_PICO

* GP0–GP28

Metadata only.

No execution.

==================================================
4. BOARD CREATION HELPERS
=========================

Add:

createESP32DevKit()
createArduinoUno()
createArduinoNano()
createRaspberryPiPico()

These should:

* create WorkspaceBoard
* attach proper boardDefinitionId
* create deterministic slot layout

==================================================
5. SNAPSHOT SYNCHRONIZATION
===========================

Expose:

boardDefinitions

through:

getStageSnapshot()

Deep-copy all structures.

==================================================
6. RENDERER ADAPTERS
====================

[MODIFY]

renderer-adapter.ts

pixi-renderer-adapter.ts

Synchronize:

* boardDefinitions

Metadata only.

==================================================
7. IMPORT / EXPORT
==================

Preserve:

* boardDefinitions
* boardDefinitionId

through:

exportProject()
importProject()

==================================================
8. VALIDATION
=============

Warnings only.

Never throw.

Validate:

* duplicate board definitions
* malformed pins
* duplicate pin labels
* invalid board types

==================================================
9. TESTS
========

Create:

tests/development-board-runtime.test.ts

Add at least 180 deterministic tests covering:

* board definition registration
* lookup
* removal
* default definitions
* ESP32 metadata
* Arduino Uno metadata
* Arduino Nano metadata
* Pico metadata
* serialization
* import/export
* snapshot isolation
* renderer synchronization
* deep-copy guarantees
* malformed definitions
* duplicate definitions
* deterministic ordering
* cleanup
* warning diagnostics

==================================================
10. VALIDATION
==============

Run:

pnpm --filter @stemverse/runtime-engine test

pnpm --filter @stemverse/runtime-engine build

If passing:

STOP.

==================================================
OUTPUT
======

Return ONLY:

1. Files modified
2. Tests passing count
3. Build status
4. Concise summary

No large walkthroughs.

==================================================
CRITICAL
========

Preserve all existing architecture.

Metadata only.

DO NOT implement firmware execution.
DO NOT implement rendering.
DO NOT redesign runtime architecture.
