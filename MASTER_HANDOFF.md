# STEMVerse Runtime Engine — MASTER HANDOFF DOCUMENT

# For DeepSeek V4 Flash / GPT-5.5 / GLM 5.1

---

# CRITICAL INSTRUCTIONS

Repository maturity is HIGH.

This repository contains:

* 21057 passing tests
* 48 passing test files
* Clean build

You are NOT designing a new architecture.

You are extending an existing architecture.

Any architecture drift is considered a failure.

---

# DO NOT REDESIGN

DO NOT redesign:

* Runtime
* HAL
* GPIO
* Protocol Layer
* Execution Layer
* Snapshot Model
* Serialization Model
* Renderer Adapters
* Board System
* Component System
* Clone Architecture
* Validation Model

---

# DO NOT INTRODUCE

DO NOT introduce:

* ECS
* Redux
* Event Bus
* Observer Frameworks
* Service Containers
* Dependency Injection
* Plugin Systems
* State Machines
* Command Bus
* Scene Manager
* React Rendering
* Pixi Rendering
* Canvas Rendering
* SVG Rendering
* WebGL Rendering
* 3D Rendering

---

# REQUIRED IMPLEMENTATION STYLE

Before implementing anything:

Read:

* packages/runtime-engine/src/runtime/index.ts
* packages/runtime-engine/src/types/index.ts
* packages/runtime-engine/src/stage/renderer-adapter.ts
* packages/runtime-engine/src/stage/pixi-renderer-adapter.ts
* progress.md

Follow existing patterns exactly.

Mirror:

* Registry patterns
* Validation patterns
* Cleanup patterns
* Snapshot patterns
* Serialization patterns
* Deep-copy patterns
* Testing patterns

Do NOT invent new patterns.

---

# PROJECT INFORMATION

Repository:

https://github.com/diptiban1987/Stemverse.git

Development Branch:

backup-phase7Z-to-8A4

Latest Stable Tag:

phase-10D-stable

Recommended Recovery Tag:

phase-10D-stable

---

# VERIFIED STATUS

Current Verified Build Status:

PASS

Current Verified Test Status:

PASS

Verification Metrics:

21057 tests passing

48 test files passing

Build clean

Verification Commands:

```bash
pnpm --filter @stemverse/runtime-engine test

pnpm --filter @stemverse/runtime-engine build
```

Expected:

```text
Test Files 48 passed

Tests 21057 passed

Build clean

tsc --noEmit
```

---

# COMPLETED PHASES

## Runtime Foundation

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

## HAL Foundation

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

Phase 10B
Component Visual Models Foundation

Phase 10C
Wire Visualization Foundation

Phase 10D
Board Visualization Foundation

Completed.

---

# CURRENT ARCHITECTURE

Architecture Flow:

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
* JSON safe

---

# VISUAL SIMULATOR VISION

STEMVerse should eventually feel comparable in quality to:

* Wokwi
* Tinkercad Circuits
* SimulIDE
* Proteus
* Fritzing

BUT:

DO NOT COPY:

* UI
* artwork
* assets
* branding
* layouts
* rendering implementation

Create a STEMVerse-native architecture.

Goal:

A student should feel:

"I am building a real electronics project."

An educator should feel:

"This is a professional STEM laboratory."

---

# CURRENT STATUS

COMPLETED

✓ Visual Metadata

✓ Visual Registry

✓ Visual Themes

✓ Component Visual Models

✓ Wire Visualization

✓ Board Visualization Metadata

NOT STARTED

✗ Signal Visualization

✗ Animation Metadata

✗ Rendering

✗ Artwork

✗ Component Skins

---

# NEXT PHASE

PHASE 10E

Signal Visualization Foundation

---

# PHASE 10E GOAL

Create deterministic metadata-only signal visualization models.

Renderer consumes metadata only.

NO rendering.

NO drawing.

NO artwork.

NO SVG.

NO Canvas.

NO Pixi.

NO React.

NO WebGL.

---

# REQUIREMENTS

## 1. SIGNAL VISUALIZATION METADATA

Create metadata for:

signalId

signalType

signalDirection

signalActivity

signalState

propagationDelay

visualizationHints

futureFlowAnimationHints

futurePulseHints

futureThemeHints

---

## 2. SIGNAL PROBE METADATA

Track:

probeId

probeType

sourceConnectorId

targetConnectorId

position

label

color

visibility

futureProbeHints

---

## 3. SIGNAL REGISTRY

Must support:

register

lookup

update

remove

clear

getAll

Requirements:

* O(1) lookup
* deterministic ordering
* clone safe
* deep-copy safe
* serialization safe
* snapshot safe

---

## 4. SNAPSHOT INTEGRATION

Expose through:

StageSyncState

Renderer receives metadata only.

---

## 5. SERIALIZATION

Support:

exportProject()

importProject()

Round-trip preservation required.

---

## 6. VALIDATION

Warning-only.

Never throw.

Validate:

duplicate IDs

invalid signal types

invalid signal states

invalid probe metadata

---

# DO NOT MODIFY

scheduler

HAL

GPIO

Protocol Layer

Execution Layer

Board Metadata

Component Visual Models

Wire Visualization

Board Visualization

Renderer Architecture

Clone Architecture

---

# TESTS

Create:

tests/signal-visualization-runtime.test.ts

Target:

2500+ deterministic tests

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

probe metadata

duplicate IDs

invalid metadata

validation warnings

ordering guarantees

---

# TEST RULES

Tests are authoritative.

Generate deterministic tests only.

NO randomization.

NO timers.

NO wall-clock dependence.

NO async delays.

Follow existing repository testing style.

---

# PROGRESS.MD

MUST UPDATE

ONLY AFTER:

1. Tests pass
2. Build passes

Add:

Phase 10E

Signal Visualization Foundation

Update:

* roadmap
* completion percentage
* changelog
* verification metrics
* visual simulator status

Visual Simulator Status:

Completed:

* visual metadata
* visual registry
* visual themes
* component visual models
* wire visualization metadata
* board visualization metadata

Not Started:

* signal visualization
* rendering
* animations
* artwork
* component skins

---

# VALIDATION

Required:

```bash
pnpm --filter @stemverse/runtime-engine test

pnpm --filter @stemverse/runtime-engine build
```

Both MUST pass.

---

# ROADMAP

10A Visual Simulator Foundation ✅
10B Component Visual Models ✅
10C Wire Visualization ✅
10D Board Visualization ✅
10E Signal Visualization
10F Animation Metadata

---

# REQUIRED OUTPUT FORMAT

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

No architecture proposals.

No future roadmap suggestions.

No redesign recommendations.
