CRITICAL

Repository has 12,552+ passing tests.

You are extending an existing architecture.

DO NOT redesign:

- Runtime
- HAL
- GPIO
- Execution Layer
- Renderer Adapters
- Snapshot Model
- Serialization Model

DO NOT introduce:

- ECS
- Event Bus
- Scene Manager
- Service Container
- Redux
- React Rendering
- Pixi Rendering
- SVG Rendering
- Canvas Rendering
- WebGL Rendering

Follow existing repository patterns exactly.

Before coding:

Read:

- runtime/index.ts
- types/index.ts
- renderer-adapter.ts
- pixi-renderer-adapter.ts
- progress.md

Mirror existing:

- registry patterns
- cleanup patterns
- validation patterns
- snapshot patterns
- serialization patterns
- test patterns

Renderer consumes metadata only.

No rendering.

No artwork.

No animations.

No UI.

progress.md must be updated after validation passes.
# STEMVerse Runtime Engine — Master Handoff Document

## Repository

GitHub:
https://github.com/diptiban1987/Stemverse.git

Active Development Branch:
backup-phase7Z-to-8A4

Latest Verified Tag:
phase-10A-stable

Recommended Recovery Tag:
phase-10A-verified

---

# VERIFIED STATUS

Current Verified Build Status:

* Build: PASS
* Tests: PASS

Verification:

* 12552 tests passing
* 45 test files passing
* Runtime engine builds clean

Commands:

```bash
pnpm --filter @stemverse/runtime-engine test

pnpm --filter @stemverse/runtime-engine build
```

Expected:

```text
Test Files 45 passed
Tests 12552 passed

Build clean
tsc --noEmit
```

---

# COMPLETED PHASES

## Runtime

Phase 7Q
Component Runtime Foundation

Phase 7R
GPIO Foundation

Phase 7S
Device Runtime

Phase 7T
Workspace Foundation

Phase 7U
Wire Layout Foundation

Phase 7V
Board Foundation

Phase 7V.1
Clone Cleanup

Phase 7W
Development Boards

Phase 7X
Electronics Block Runtime

Phase 7Y
GPIO Hardening

Phase 7Z
Render Metadata Foundation

---

## HAL

Phase 8A.1
HAL Contracts

Phase 8A.2
Simulated HAL Backend

Phase 8A.3
Rich Pin State

Phase 8A.4
Board Pin Mapping

Phase 8A.5
Protocol Shells

Phase 8A.6
Backend Finalization

---

## Execution Layer

Phase 8B
Execution Commands

Phase 8C
ESP32 Runtime Metadata

Phase 8D
ESP32 Instruction Runtime

Phase 8E
ESP32 GPIO Execution

Phase 8F
ESP32 Peripheral Runtime

Phase 8F.1
Peripheral Ownership Hardening

Phase 8G
ESP32 Peripheral Commands

Phase 8H
Protocol Integration

---

## Visual Simulator

Phase 10A
Visual Simulator Foundation

Completed.

---

# CURRENT ARCHITECTURE

The project follows:

Runtime
→ HAL
→ Protocol Layer
→ Execution Layer
→ Visual Metadata

Renderer consumes snapshots only.

Renderer never owns runtime state.

All state must remain:

* deterministic
* clone-safe
* deep-copy safe
* serialization safe
* JSON compatible

---

# IMPORTANT CONSTRAINTS

DO NOT:

* redesign runtime architecture
* redesign HAL
* redesign GPIO
* redesign snapshots
* redesign renderer adapters
* redesign execution layer
* introduce ECS
* introduce Redux
* introduce service containers
* introduce event sourcing
* introduce React rendering
* introduce Pixi rendering
* introduce SVG rendering
* introduce Canvas rendering
* introduce WebGL rendering

---

# VISUAL SIMULATOR GOAL

Target Experience:

Comparable in quality to:

* Wokwi
* Tinkercad Circuits
* SimulIDE
* Proteus
* Fritzing

BUT:

Do NOT copy:

* UI
* artwork
* branding
* assets
* layouts
* rendering implementation

STEMVerse must have its own architecture.

---

# NEXT PHASE

Phase 10B

Component Visual Models Foundation

---

# PHASE 10B REQUIREMENTS

Create deterministic metadata-only visual models.

NO rendering.

NO artwork.

NO images.

NO animation engine.

NO Pixi.

NO SVG.

NO Canvas.

NO DOM.

NO React.

---

## Components

Support:

LED

BUTTON

BUZZER

SERVO

ULTRASONIC

LCD

OLED

ESP32

ARDUINO_UNO

ARDUINO_NANO

RASPBERRY_PI_PICO

---

## Visual Model Metadata

Track:

modelId

componentType

displayName

category

defaultWidth

defaultHeight

anchorPoints

pinVisualMetadata

labelPositions

interactionZones

futureAnimationHints

futureSkinHints

futureThemeHints

---

## Pin Visual Metadata

Track:

pin position

pin label

pin type

pin group

visual direction

future active-state hints

---

## Interaction Metadata

Track:

hover zones

selection zones

drag zones

focus zones

future click zones

---

## Registry Requirements

Must support:

* register
* lookup
* update
* removal

Must be:

* O(1) lookup
* deterministic
* clone safe
* serialization safe
* snapshot safe

---

## Snapshot Integration

Expose through:

StageSyncState

Renderer receives metadata only.

---

## Serialization

Support:

exportProject()

importProject()

Round-trip preservation required.

---

## Validation

Warning-only.

Never throw.

Validate:

duplicate IDs

invalid dimensions

invalid anchors

invalid pins

invalid interaction metadata

---

# TESTS

Create:

tests/component-visual-model-runtime.test.ts

Target:

1800+ deterministic tests

Cover:

registration

lookup

updates

removal

serialization

snapshot sync

renderer isolation

deep-copy guarantees

clone safety

cleanup

duplicate IDs

invalid metadata

---

# PROGRESS.MD

MUST UPDATE

Add:

Phase 10B

Component Visual Models Foundation

Update:

* roadmap
* completion %
* changelog
* verification metrics
* visual simulator status

Visual Simulator Status:

Completed:

* visual metadata
* visual registry
* visual themes
* component visual models

Not Started:

* rendering
* animations
* board rendering
* wire rendering
* signal visualization
* component skins
* artwork

---

# VALIDATION

Required:

```bash
pnpm --filter @stemverse/runtime-engine test

pnpm --filter @stemverse/runtime-engine build
```

Both must pass.

---

# REQUIRED OUTPUT

Return ONLY:

1. Files modified
2. Files created
3. Tests passing count
4. Build status
5. progress.md updates
6. Remaining risks
7. Concise summary

No walkthroughs.

No code dumps.

No architectural redesign proposals.
