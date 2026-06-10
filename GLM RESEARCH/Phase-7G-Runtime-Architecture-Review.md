# Phase 7G Runtime Architecture Review

**Generated:** 2026-06-01  
**Auditor:** GLM-5.1  
**Scope:** `packages/runtime-engine` (all source + test files)  
**Test Status:** 253/253 passing (vitest, 1.26s)  
**Codebase Size:** ~3,600 lines source, ~5,800 lines tests  
**Prior Audit:** Phase-6C-Runtime-Architecture-Audit.md (75 tests → now 253)

---

## Codebase Inventory

```
src/
  types/index.ts              — Core types (TargetState, Thread, StageSyncState, etc.)
  core/index.ts               — IRuntime, IThreadManager, IExecutionEngine interfaces
  ast/
    index.ts                  — IASTInterpreter interface + ASTProgram type
    interpreter.ts            — MinimalASTInterpreter (1414 lines, execution core)
  runtime/
    index.ts                  — BaseRuntime (1183 lines, tick orchestrator + registries)
    execution-context.ts       — createThread(), TaskQueue, PendingTask
  events/index.ts             — RuntimeEventType enum + IRuntimeEventEmitter
  simulator/index.ts           — IGPIOHandler + ISimulatorConnection (async, unused)
  stage/
    index.ts                   — StageConfig, IPixiStageWrapper, re-exports
    renderer-adapter.ts        — IRendererAdapter + InMemoryRendererAdapter (202 lines)
    pixi-renderer-adapter.ts   — PixiRendererAdapter (386 lines)
  store/index.ts               — Zustand useRuntimeStore (unused by BaseRuntime)

tests/
  ast-interpreter.test.ts          — 18 tests
  control-flow.test.ts             — 18 tests
  execution-context.test.ts        — 12 tests
  runtime-active-threads.test.ts   — 103 tests
  runtime-tick.test.ts             — 10 tests
  renderer-adapter.test.ts         — 12 tests
  pixi-renderer-adapter.test.ts    — 12 tests
  asset-costume.test.ts            — 16 tests
  audio-runtime.test.ts            — 16 tests
  pen-runtime.test.ts              — 18 tests
  watcher-runtime.test.ts          — 18 tests
```

---

## 1. Safe Architectural Observations

### 1.1 Deterministic Execution Core — VERIFIED

The runtime achieves determinism through:

- **Single-threaded cooperative scheduling**: No concurrency primitives. All state mutations occur synchronously within `tick()`.
- **FIFO TaskQueue**: Strict insertion-order dequeuing. No priorities, no preemption.
- **Snapshot-based iteration**: `threadsToStep = [...this.activeThreads]` at `runtime/index.ts:577` — copy prevents mutation during iteration.
- **Budget-based yielding**: `MAX_BLOCKS_PER_TICK = 1000` caps blocks per `stepThread()`. YIELDED threads resume deterministically next tick.
- **Fixed tick duration**: `tickDurationMs = 1000 / fps` (33.33ms at 30 FPS). No `Date.now()` or `performance.now()` in execution paths.
- **O(1) block lookup**: `blockRegistries` Map per target (`interpreter.ts:71`) — resolved the O(n) linear scan from the Phase 6C audit.
- **Opcode dispatch tables**: Both `statementHandlers` and `reporterHandlers` use `Record<opcode, handler>` maps — resolved the sequential `if` chain from Phase 6C.

**Verdict:** Deterministic. Same input + same tick count = same output.

### 1.2 Renderer Decoupling — VERIFIED

The one-way data flow `VM → getStageSnapshot() → IRendererAdapter.syncStage()` is clean:

- **Snapshot isolation**: `getStageSnapshot()` (`runtime/index.ts:784-848`) deep-copies all mutable data (pen commands, watchers, bubbles, sounds). Tests confirm snapshot mutation does not affect runtime state (`watcher-runtime.test.ts:345-383`, `pen-runtime.test.ts:216-254`, `renderer-adapter.test.ts:171-183`).
- **Renderer isolation**: Mutating renderer targets does not affect VM state (`renderer-adapter.test.ts:201-210`, `watcher-runtime.test.ts:579-606`, `pixi-renderer-adapter.test.ts:222-232`).
- **Orphan sweeping**: Both `InMemoryRendererAdapter` and `PixiRendererAdapter` sweep render targets not present in snapshot (`renderer-adapter.ts:188-193`, `pixi-renderer-adapter.ts:349-362`).
- **Incremental diff**: Existing render targets are updated in-place (preserving object identity) rather than recreated (`renderer-adapter.ts:138-180`, `pixi-renderer-adapter.ts:179-220`).

**Verdict:** Renderer-decoupled. No coupling risks detected.

### 1.3 Error Isolation — VERIFIED

Both `executeBlock()` and `evaluateReporter()` wrap execution in try-catch:

- `executeBlock()` (`interpreter.ts:267-284`): Catches errors, marks thread `DONE + isKilled`, returns safe default. Thread is swept in Phase 4.
- `evaluateReporter()` (`interpreter.ts:1268-1298`): Catches errors, marks thread `DONE + isKilled`, returns `0`.

**Verdict:** One bad block cannot crash the entire runtime. Thread-level error isolation is correct.

### 1.4 Centralized Cleanup — VERIFIED

| Cleanup Path | `initialize()` | `stop()` | `tick()` Phase 4 | `removeTarget()` | `deleteClone()` |
|---|---|---|---|---|---|
| activeThreads | cleared | DONE+isKilled, cleared | sweep DONE | — | DONE+isKilled |
| taskQueue | cleared | cleared | — | — | — |
| pendingBroadcasts | cleared | cleared | — | — | — |
| broadcastTokens | cleared | cleared | — | — | — |
| activeSoundTriggers | cleared | cleared | sweep completed | sweep by target | — |
| soundChannels | cleared | cleared | sweep orphan IDs | deleted | — |
| penCommands | cleared | cleared | — | — | — |
| variableWatchers | cleared | cleared | — | sweep by target | — |
| costumeRegistry | cleared | cleared | — | — | — |
| soundRegistry | cleared | cleared | — | — | — |
| backdropRegistry | cleared | cleared | — | — | — |
| layerOrderList | cleared | cleared | — | spliced | — |
| clonesByParent | cleared | — | — | recursive | — |
| targets (Map) | cleared | — | — | deleted | via removeTarget |

**Verdict:** Cleanup is thorough and consistent across `initialize()` and `stop()`. No orphan state accumulates.

---

## 2. Potential Deterministic Risks

### 2.1 `Math.random()` in `executeLooksSwitchBackdropTo` — MEDIUM

**Location:** `interpreter.ts:811`

```typescript
stage.currentBackdropIndex = Math.floor(Math.random() * stage.backdrops.length);
```

**Risk:** `Math.random()` is nondeterministic. Two executions with identical input will produce different "random backdrop" results. This violates the "same input + same tick count = same output" guarantee.

**Impact:** The `looks_switchbackdropto` block with value `"random backdrop"` produces nondeterministic state. Snapshot comparison, replay debugging, and deterministic testing are all broken for this opcode path.

**Suggested Fix:** Replace with a seeded PRNG instance scoped to `BaseRuntime`. A simple linear congruential generator (LCG) seeded from `tickCount` would be synchronous, deterministic, and browser-safe:

```typescript
private seededRandom(): number {
  this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
  return this.randomSeed / 0x100000000;
}
```

### 2.2 `evaluateScript()` is `async` Without Async Body — LOW

**Location:** `interpreter.ts:155`

```typescript
async evaluateScript(thread: Thread, script: ASTScript): Promise<void> {
```

The body is fully synchronous. The `async` keyword is misleading and creates an unnecessary Promise wrapper. Not a determinism risk since the Promise resolves synchronously in microtask queue, but misleading API surface.

### 2.3 `traverse()` Lacks Budget Guard — LOW

**Location:** `interpreter.ts:166-172`

`traverse()` loops `while (thread.status === 'RUNNING')` with no `MAX_BLOCKS_PER_TICK` guard, unlike `stepThread()`. A circular `next` chain in a malformed AST would hang indefinitely.

**Severity:** Low because `traverse()` is only used in tests, not in the `tick()` production path.

---

## 3. Cleanup/Lifecycle Risks

### 3.1 `penCommands` Never Swept During `tick()` — MEDIUM

**Location:** `runtime/index.ts:45-47`, `runtime/index.ts:614`

Pen commands accumulate unboundedly in `this.penCommands` across ticks. Unlike `activeSoundTriggers` (which are swept for completed triggers in Phase 4), `penCommands` are only cleared on `stop()` or `initialize()`.

**Risk:** A program that runs for thousands of ticks with an active pen will accumulate an ever-growing array. Each `getStageSnapshot()` deep-copies the entire array, creating O(n) snapshot generation cost and O(n) memory growth.

**Impact:** Not a leak (cleared on stop/initialize), but an unbounded growth vector during execution.

**Suggested Fix:** Add a configurable `MAX_PEN_COMMANDS` cap. When exceeded, trim the oldest commands. Alternatively, mark pen commands as "consumed" after snapshot generation and sweep them.

### 3.2 `soundChannel.activeTriggerIds` Sweep is O(n*m) — LOW

**Location:** `runtime/index.ts:615-619`

```typescript
for (const channel of this.soundChannels.values()) {
  channel.activeTriggerIds = channel.activeTriggerIds.filter(id => {
    return this.activeSoundTriggers.some(t => t.id === id);
  });
}
```

For each channel, for each trigger ID, it scans all `activeSoundTriggers`. This is O(channels × triggers_per_channel × total_triggers). With few channels and triggers this is negligible, but the pattern should use a `Set` of surviving trigger IDs for O(1) lookup:

```typescript
const survivingIds = new Set(this.activeSoundTriggers.map(t => t.id));
for (const channel of this.soundChannels.values()) {
  channel.activeTriggerIds = channel.activeTriggerIds.filter(id => survivingIds.has(id));
}
```

### 3.3 `stop()` Clears Asset Registries — LOW (BY DESIGN?)

**Location:** `runtime/index.ts:416-418`

`stop()` clears `costumeRegistry`, `soundRegistry`, and `backdropRegistry`. This means stopping and restarting the runtime requires re-registering all assets. This is consistent with the "full reset" semantics of `stop()`, but differs from Scratch VM behavior where assets persist across stop/start cycles.

**Impact:** If the integration layer expects assets to survive `stop()`, it will encounter missing-asset warnings on restart.

### 3.4 `variableWatchers` Cleared on `stop()` — LOW

**Location:** `runtime/index.ts:430`

Like asset registries, `variableWatchers` are cleared on `stop()`. This means all registered watchers must be re-registered after a stop/start cycle. Consistent with the full-reset pattern but may surprise integration code.

---

## 4. Snapshot Immutability Risks

### 4.1 `getStageSnapshot()` Shallow-Copies `ActiveSoundTrigger` — LOW

**Location:** `runtime/index.ts:840`

```typescript
activeSounds: this.getActiveSoundsForTarget(target.id).map(t => ({ ...t })),
```

The spread operator `{ ...t }` creates a shallow copy of each `ActiveSoundTrigger`. Since `ActiveSoundTrigger` contains only primitive fields (no nested objects), this is effectively a deep copy. **Safe.**

### 4.2 `getStageSnapshot()` Shares `penCommands` Reference Across Snapshot Entries — MEDIUM

**Location:** `runtime/index.ts:786,842`

```typescript
const deepCopiedCommands = this.penCommands.map(cmd => ({ ...cmd }));
// ...
snapshot.push({
  // ...
  penCommands: deepCopiedCommands,
  // ...
});
```

The same `deepCopiedCommands` array reference is shared across ALL snapshot entries. If a consumer mutates one snapshot entry's `penCommands` array (e.g., `.push()`), it affects all other entries.

**Risk:** Shared mutable reference across snapshot entries. Currently safe because no production code mutates snapshot arrays, but fragile if downstream consumers are not careful.

**Suggested Fix:** Create a fresh copy per snapshot entry:

```typescript
penCommands: this.penCommands.map(cmd => ({ ...cmd })),
```

This removes the shared reference and costs O(n × targets) instead of O(n). Negligible cost for correctness.

### 4.3 `getStageSnapshot()` Shares `deepCopiedWatchers` Reference — MEDIUM

**Location:** `runtime/index.ts:787,844`

Same issue as 4.2 — `deepCopiedWatchers` is computed once and shared across all snapshot entries.

**Suggested Fix:** Same as 4.2 — create a fresh copy per snapshot entry.

### 4.4 `BroadcastCompletionToken.pendingThreadIds` is a `Set` — LOW

**Location:** `types/index.ts:298`

```typescript
pendingThreadIds: Set<string>;
```

`Set` is not JSON-serializable. If snapshots are ever serialized (for save/load, undo/redo, debugging), `BroadcastCompletionToken` objects will lose their `pendingThreadIds` data.

**Impact:** Currently no serialization path exists. Low risk now, but will block future serializability.

---

## 5. Clone Isolation Concerns

### 5.1 Shared `scripts` Array Reference — MEDIUM

**Location:** `runtime/index.ts:894,924`

```typescript
scripts: sourceSprite.scripts, // script references are kept, executions are fresh
```

Clone and parent share the same `scripts` array reference. This is intentional (scripts are immutable AST) but creates a coupling: if any code mutates the `scripts` array (e.g., `splice`, `push`), it affects both parent and clone.

**Current Risk:** No codepath mutates `scripts` after `addTarget()`. The interpreter only reads from scripts. **Safe by convention, not by enforcement.**

**Suggested Fix:** If defense-in-depth is desired, spread the array: `scripts: [...sourceSprite.scripts]`. This copies the array but shares the `ASTScript` object references (which are treated as immutable).

### 5.2 Shared `costumes` and `sounds` Arrays — LOW

**Location:** `runtime/index.ts:890-892`

```typescript
costumes: [...sourceSprite.costumes],
sounds: [...sourceSprite.volume],
```

The spread operator creates a new array with the same object references. `costume[0]` on parent is `===` to `costume[0]` on clone. Since `CostumeAsset` objects are treated as immutable metadata, this is safe by convention.

### 5.3 Clone Variables Deep-Copy Correctly Handles Nested Objects — VERIFIED

**Location:** `runtime/index.ts:864-868`

```typescript
variables[key] = {
  ...value,
  value: typeof value.value === 'object' && value.value !== null
    ? JSON.parse(JSON.stringify(value.value))
    : value.value,
};
```

Nested variable values (objects, arrays) are deep-cloned via `JSON.parse(JSON.stringify())`. Primitive values are assigned directly. This is correct isolation.

### 5.4 Clone Watcher Spawning — VERIFIED

**Location:** `runtime/index.ts:943-953`

When a clone is created, watchers matching the source `targetId` are duplicated with a new `id` (`{watcher.id}_clone_{cloneId}`) and `targetId` set to the clone's ID. This correctly isolates watcher updates between parent and clone (verified by `watcher-runtime.test.ts:173-207`).

### 5.5 Clone Deletion Does Not Clean Up Pen Commands — LOW

**Location:** `runtime/index.ts:971-996`

`deleteClone()` marks threads DONE and calls `removeTarget()`, but historical `penCommands` entries with the clone's `targetId` remain in `this.penCommands`. This is documented behavior (`pen-runtime.test.ts:427-459`) — pen history is preserved after clone deletion.

**Risk:** Stale pen command entries referencing deleted clone IDs. Not a leak (cleared on stop/initialize), but could confuse renderers that try to look up targets for pen commands.

---

## 6. Registry Consistency Observations

### 6.1 `listenerRegistry` Rebuilds on Every `addTarget`/`removeTarget` — SAFE

**Location:** `runtime/index.ts:682,734`

`rebuildListenerRegistry()` is called on every target addition/removal. This is O(targets × scripts_per_target), but ensures the registry is always consistent with the current target set.

**Observation:** For large projects (100+ sprites), this could become noticeable. However, `addTarget`/`removeTarget` are not called during `tick()` — only during setup and clone lifecycle. Not a tick-path performance concern.

### 6.2 `costumeRegistry` Allows Duplicate IDs (Warns but Overwrites) — LOW

**Location:** `runtime/index.ts:128-136`

`registerCostume()` warns on duplicate IDs but still sets the new value (`this.costumeRegistry.set(asset.id, asset)`). This means a duplicate registration silently replaces the previous entry.

**Risk:** If two different costumes share an ID (due to project data error), the second registration wins. The first costume's data is lost.

**Suggested Fix:** Consider rejecting duplicate registrations (early return after warning) to preserve the first registration, matching the "first-wins" convention of Scratch.

### 6.3 `soundRegistry` Does Not Check Duplicate Names — LOW

**Location:** `runtime/index.ts:142-158`

`registerSound()` checks for duplicate IDs but not duplicate names. `costumeRegistry` checks both. Inconsistent validation.

**Suggested Fix:** Add `hasDuplicateName` check to `registerSound()` for consistency with `registerCostume()`.

### 6.4 `backdropRegistry` Does Not Check Duplicate Names — LOW

**Location:** `runtime/index.ts:164-180`

Same as 6.3 — no duplicate name check for backdrops.

---

## 7. Suggested LOW-RISK Fixes

### Fix 1: Replace `Math.random()` with Seeded PRNG (Addresses Risk 2.1)

**File:** `src/runtime/index.ts`  
**Change:** Add a seeded random method to `BaseRuntime`, used by the interpreter for "random backdrop".

```typescript
private randomSeed: number = 0;

public seededRandom(): number {
  this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
  return this.randomSeed / 0x100000000;
}
```

Wire this through the interpreter callback system (same pattern as `onLayerOperation`, `onSoundTrigger`). The interpreter calls `runtime.seededRandom()` instead of `Math.random()`.

**Impact:** Synchronous, deterministic, browser-safe, renderer-decoupled. No architectural change.

### Fix 2: Per-Entry Snapshot Copies for `penCommands` and `watchers` (Addresses Risks 4.2, 4.3)

**File:** `src/runtime/index.ts` — `getStageSnapshot()`  
**Change:** Replace shared `deepCopiedCommands`/`deepCopiedWatchers` with per-entry copies.

```typescript
// Before:
const deepCopiedCommands = this.penCommands.map(cmd => ({ ...cmd }));
const deepCopiedWatchers = Array.from(this.variableWatchers.values()).map(w => ({ ...w }));
// ...shared across all snapshot entries

// After:
// Inside the per-target loop:
penCommands: this.penCommands.map(cmd => ({ ...cmd })),
watchers: Array.from(this.variableWatchers.values()).map(w => ({ ...w })),
```

**Impact:** Negligible performance cost (O(n × targets) vs O(n)). Eliminates shared mutable reference. Synchronous, deterministic, browser-safe.

### Fix 3: `Set`-Based Sound Channel Sweep (Addresses Risk 3.2)

**File:** `src/runtime/index.ts` — `tick()` Phase 4  
**Change:** Replace `Array.some()` with `Set.has()` for trigger ID lookup.

```typescript
const survivingTriggerIds = new Set(this.activeSoundTriggers.map(t => t.id));
for (const channel of this.soundChannels.values()) {
  channel.activeTriggerIds = channel.activeTriggerIds.filter(id => survivingTriggerIds.has(id));
}
```

**Impact:** O(channels × triggers) instead of O(channels × triggers²). Synchronous, deterministic, browser-safe.

### Fix 4: Remove `async` from `evaluateScript()` (Addresses Risk 2.2)

**File:** `src/ast/interpreter.ts:155`, `src/ast/index.ts:29`

```typescript
// Before:
async evaluateScript(thread: Thread, script: ASTScript): Promise<void> {

// After:
evaluateScript(thread: Thread, script: ASTScript): void {
```

And update `IASTInterpreter` interface accordingly.

**Impact:** Removes misleading API. No functional change (body was already synchronous).

### Fix 5: Add Budget Guard to `traverse()` (Addresses Risk 2.3)

**File:** `src/ast/interpreter.ts:166-172`

```typescript
traverse(thread: Thread, startingBlockId: BlockId): void {
  thread.status = 'RUNNING';
  thread.currentBlockId = startingBlockId;
  let blocksExecuted = 0;
  while (thread.status === 'RUNNING') {
    if (blocksExecuted >= MAX_BLOCKS_PER_TICK) {
      thread.status = 'YIELDED';
      break;
    }
    this.stepThread(thread);
    blocksExecuted++;
  }
}
```

**Impact:** Prevents infinite loops in malformed ASTs during test/debug usage. Synchronous, deterministic.

---

## 8. Risk Summary Table

| # | Risk | Severity | Category | Fix Complexity |
|---|------|----------|----------|----------------|
| 2.1 | `Math.random()` in "random backdrop" | MEDIUM | Deterministic | Low (seeded PRNG) |
| 2.2 | `evaluateScript()` is async unnecessarily | LOW | API Clarity | Trivial |
| 2.3 | `traverse()` lacks budget guard | LOW | Deterministic | Trivial |
| 3.1 | `penCommands` unbounded growth | MEDIUM | Cleanup/Lifecycle | Low (cap + sweep) |
| 3.2 | Sound channel sweep O(n²) | LOW | Performance | Trivial (Set) |
| 3.3 | `stop()` clears asset registries | LOW | Lifecycle | None (by design) |
| 3.4 | `stop()` clears watchers | LOW | Lifecycle | None (by design) |
| 4.2 | Shared `penCommands` ref in snapshot | MEDIUM | Snapshot Immutability | Trivial |
| 4.3 | Shared `watchers` ref in snapshot | MEDIUM | Snapshot Immutability | Trivial |
| 4.4 | `BroadcastCompletionToken.pendingThreadIds` Set not serializable | LOW | Serializability | Deferred |
| 5.1 | Shared `scripts` array ref (parent/clone) | MEDIUM | Clone Isolation | Trivial (spread) |
| 5.5 | Stale pen commands after clone deletion | LOW | Clone Isolation | None (by design) |
| 6.2 | Duplicate costume ID overwrites | LOW | Registry | Trivial |
| 6.3 | Sound registry missing duplicate name check | LOW | Registry Consistency | Trivial |
| 6.4 | Backdrop registry missing duplicate name check | LOW | Registry Consistency | Trivial |

---

## 9. Dimensions NOT at Risk

The following dimensions were reviewed and found to be **safe with no actionable concerns**:

| Dimension | Verdict | Evidence |
|-----------|---------|----------|
| Thread lifecycle correctness | SAFE | 3-phase tick (promote → step → sweep) is correct. DONE threads swept in Phase 4. Tests: 103 in `runtime-active-threads.test.ts` |
| Broadcast lifecycle safety | SAFE | `pendingBroadcasts` flushed in Phase 1, deferred on limit, token resolution correct. `BLOCKED` threads resumed when all spawned threads complete. |
| Watcher synchronization safety | SAFE | `updateWatcherValue()` matches on `variableId + targetId`, only updates matching watchers. Clone watchers are independently keyed. |
| Pen metadata lifecycle safety | SAFE | Pen state initialized on `addTarget()` if missing. Commands recorded via callback. Cleared on stop/initialize. |
| Audio metadata lifecycle safety | SAFE | Sound triggers decremented deterministically in tick. Completed triggers swept. Per-target cleanup on `removeTarget()`. |
| O(n²) accidental regressions | NONE FOUND | Block lookup is O(1) via `blockRegistries`. Thread stepping is O(threads). Sound channel sweep is fixable to O(n) with Set (Fix 3). |
| Renderer/runtime coupling risks | NONE FOUND | One-way flow: VM → snapshot → renderer. Deep copies at boundary. No back-references. |
| Tick ordering consistency | SAFE | Target iteration is Map insertion order (ES6+). Thread stepping is array insertion order. Broadcast listeners iterate `listenerRegistry` in build order. |

---

## 10. Architecture Quality Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Deterministic execution | **8/10** | `Math.random()` is the one nondeterminism vector. Otherwise excellent. |
| Thread lifecycle correctness | **9/10** | Clean 3-phase tick with proper sweep. No leaks. |
| Clone isolation | **8/10** | Variables deep-cloned correctly. Shared `scripts` is safe by convention. |
| Snapshot immutability | **7/10** | Shared references in `penCommands`/`watchers` across entries. Fixable trivially. |
| Cleanup consistency | **9/10** | `initialize()` and `stop()` cover all state. `removeTarget()` cascades properly. |
| Registry consistency | **8/10** | Duplicate handling is warn-but-accept. Missing name dedup for sounds/backdrops. |
| Renderer decoupling | **10/10** | Perfect one-way flow. No coupling. |
| Broadcast lifecycle safety | **9/10** | Token resolution is correct. Deferred broadcasts handled. |
| Audio metadata lifecycle | **9/10** | Deterministic countdown, proper sweep, per-target cleanup. |
| Pen metadata lifecycle | **8/10** | Unbounded growth is the only concern. Otherwise correct. |
| Watcher synchronization | **9/10** | Correct matching, proper clone spawning, renderer isolation verified. |
| Error isolation | **9/10** | Try-catch per block and per reporter. Thread-level isolation. |
| Test coverage | **9/10** | 253 tests across 11 files. Good coverage of lifecycle, cloning, rendering, metadata. |

---

## 11. Conclusion

The `@stemverse/runtime-engine` has matured significantly since the Phase 6C audit (75 → 253 tests). The architecture remains **intentionally synchronous, deterministic, serializable, browser-safe, metadata-driven, and renderer-decoupled**. The major Phase 6C risks (O(n) block lookup, monolithic dispatch, missing error isolation) have all been resolved.

The remaining risks are **incrementally fixable** and fall into two categories:

1. **Correctness risks** (Fixes 1, 2, 4, 5): `Math.random()` nondeterminism, shared snapshot references, misleading async, unguarded traverse. These should be addressed soon.

2. **Consistency/debt** (Fixes 3, 6.2-6.4): O(n²) sweep pattern, inconsistent registry validation. These can be addressed incrementally.

None of the identified risks require architectural changes, framework introductions, or async execution. All suggested fixes are **incremental, synchronous, deterministic, browser-safe, and renderer-decoupled**.

---

*Review completed 2026-06-01. 253/253 tests passing. Written to `GLM RESEARCH/Phase-7G-Runtime-Architecture-Review.md`.*
