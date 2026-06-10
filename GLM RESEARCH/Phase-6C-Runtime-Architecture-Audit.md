# Phase 6C Runtime Architecture Audit

**Generated:** 2026-06-01 01:49 UTC  
**Auditor:** GLM-5.1  
**Scope:** `packages/runtime-engine` (all source + test files)  
**Test Status:** 75/75 passing (vitest, 455ms)  
**Codebase Size:** ~1,200 lines source, ~2,300 lines tests

---

## 1. Runtime Architecture Audit

### 1.1 Architecture Overview

```
src/
  types/index.ts          — Core type definitions (ASTBlock, Thread, TargetState, etc.)
  core/index.ts           — Interfaces (IRuntime, IThreadManager, IExecutionEngine)
  ast/
    index.ts              — IASTInterpreter interface + ASTProgram type
    interpreter.ts        — MinimalASTInterpreter (597 lines, the execution core)
  runtime/
    index.ts              — BaseRuntime (287 lines, tick orchestrator)
    execution-context.ts  — createThread(), createExecutionContext(), TaskQueue
  events/index.ts         — RuntimeEventType enum + IRuntimeEventEmitter interface
  simulator/index.ts      — IGPIOHandler + ISimulatorConnection interfaces
  stage/index.ts          — IPixiStageWrapper + IStageInfo/ISpriteInfo interfaces
  store/index.ts          — Zustand useRuntimeStore
  index.ts               — Barrel exports
tests/
  ast-interpreter.test.ts     — 18 tests (sequential, events, motion, variables, hardware)
  control-flow.test.ts        — 18 tests (stepThread, if/if_else, repeat)
  execution-context.test.ts   — 12 tests (context, threads, TaskQueue)
  runtime-active-threads.test.ts — 17 tests (persistent threads, wait, stop)
  runtime-tick.test.ts        — 10 tests (targets, ticks, broadcasts, hardware, multi-target)
```

### 1.2 Deterministic Execution — VERIFIED

The runtime achieves determinism through:

- **Single-threaded cooperative scheduling**: No true concurrency. All threads run in a single JS event loop tick.
- **FIFO TaskQueue**: `PendingTask` dequeued in strict insertion order. No priorities, no preemption.
- **Deterministic thread ordering**: `threadsToStep = [...this.activeThreads]` — snapshot copy stepped in insertion order (runtime/index.ts:165).
- **Budget-based yielding**: `MAX_BLOCKS_PER_TICK = 1000` caps blocks per `stepThread()` call. Threads that exceed budget yield with state preserved (`YIELDED` status, `currentBlockId` saved).
- **No `Date.now()` or `performance.now()` in execution**: Wait countdown uses fixed `tickDurationMs = 1000 / fps` (33.33ms at 30 FPS), not wall-clock time.

**Verdict:** Deterministic. Same input + same tick count = same output. No nondeterminism vectors found.

### 1.3 Thread Lifecycle — VERIFIED WITH CAVEATS

Thread state machine:

```
IDLE → RUNNING → DONE      (normal completion)
IDLE → RUNNING → YIELDED → RUNNING → ... → DONE   (budget yield)
IDLE → RUNNING → WAITING → RUNNING → ... → DONE   (wait countdown)
IDLE → RUNNING → DONE (isKilled=true)              (stop semantics)
```

**Strengths:**
- 3-phase tick() lifecycle (promote → step → sweep) is clean and correct.
- DONE threads swept in Phase 3 via `filter(t => t.status !== 'DONE' && !t.isKilled)` — no stale references.
- Duplicate thread restart correctly marks old thread DONE+isKilled, lets Phase 3 sweep it.

**Caveats (non-blocking):**
1. **BLOCKED state defined but never used**: `ThreadStatus` includes `'BLOCKED'` but no codepath sets it. This is dead type surface.
2. **`evaluateScript()` is async but runs synchronously**: The `async` keyword is unnecessary — the body is fully synchronous. Not a bug, but misleading API.
3. **`traverse()` can run an unbounded number of blocks**: Unlike `stepThread()` which has budget safety, `traverse()` has no budget check — it loops `while (thread.status === 'RUNNING')` with no MAX_BLOCKS_PER_TICK guard. A malicious/buggy infinite loop block chain would hang.

### 1.4 Yielding — VERIFIED

Yielding is correctly implemented:

- **Budget yield**: When `blocksExecuted >= MAX_BLOCKS_PER_TICK`, thread status → `YIELDED`, `currentBlockId` preserved at the next unexecuted block (interpreter.ts:161-163).
- **Loop iteration yield**: `control_repeat` sets `thread.yieldRequest = true` after each iteration, caught in stepThread's post-execution check (interpreter.ts:200-205).
- **Resume**: `tick()` Phase 2 transitions YIELDED → RUNNING before calling `stepThread()` (runtime/index.ts:182-183).

**No yield leaks found.** Every YIELDED thread is guaranteed to resume on next tick.

### 1.5 Wait Semantics — VERIFIED WITH MINOR ISSUE

`control_wait` implementation:

1. Interpreter sets `thread.status = 'WAITING'` and `thread.delayMs = durationMs` (interpreter.ts:374-376).
2. `tick()` Phase 2 decrements `delayMs` by `tickDurationMs` each tick (runtime/index.ts:172-179).
3. When `remaining <= 0`, thread transitions back to RUNNING.

**Issue — Missing `return` after WAITING set (interpreter.ts:370-377):**
```typescript
if (opcode === 'control_wait') {
  const durationSecs = this.resolveInputValue(block, 'DURATION', 1);
  const durationMs = Math.max(0, durationSecs) * 1000;
  thread.status = 'WAITING';
  thread.delayMs = durationMs;
  // ← No return statement! Falls through to the final `return { nextBlockId: block.next }` 
}
```
After setting `thread.status = 'WAITING'`, the code falls through to line 404 which returns `{ nextBlockId: block.next }`. The `stepThread` outer loop then sees `thread.status === 'WAITING'` (not RUNNING) and exits its while loop — so the bug is masked. However, the returned `nextBlockId: block.next` is incorrect semantically; the wait block should return the *wait block itself* as the resume point, not `block.next`, because after the wait expires, execution should continue from `block.next` (which is what the resume logic uses via `currentBlockId`). In practice this works because the outer loop exits on `status !== RUNNING`, but the returned `BlockExecutionResult` is misleading.

**Severity: Low.** No functional impact because the WAITING status short-circuits before `nextBlockId` is used. But it's a code clarity issue.

### 1.6 Stop Semantics — VERIFIED

Three stop options implemented:

| Option | Behavior | Code Path |
|--------|----------|-----------|
| `this script` | `thread.status = DONE`, `thread.isKilled = true`, `currentBlockId = null` | interpreter.ts:396-400 |
| `all` | Same as above + calls `onStopAll()` → marks ALL active threads DONE+isKilled + calls `runtime.stop()` | interpreter.ts:381-388, runtime/index.ts:35-43 |
| `other scripts in sprite` | Calls `onStopOtherScripts(currentThread)` → marks sibling threads on same target DONE+isKilled | interpreter.ts:390-394, runtime/index.ts:45-54 |

**All three verified correct.** Tests in `runtime-active-threads.test.ts:661-791` confirm each behavior.

### 1.7 Centralized Cleanup — VERIFIED

- `runtime.stop()`: Clears taskQueue, marks all threads DONE+isKilled, empties `activeThreads`, clears interval.
- `runtime.initialize()`: Clears targets, resets running/paused, resets tickCount, clears taskQueue, empties activeThreads, resets thread counter.
- Phase 3 sweep: `this.activeThreads = this.activeThreads.filter(...)` — no dead references accumulate.

**No memory leak risk from thread lifecycle.** DONE threads are swept within the same tick they complete.

---

## 2. Concurrency Risk Review

### 2.1 Hidden Concurrency Risks — NONE FOUND

- Single-threaded JavaScript execution model. No Web Workers, no SharedArrayBuffer.
- `setInterval` drives the tick loop but only one tick runs at a time (no re-entrant tick calls).
- `stepOnce()` temporarily overrides `isRunning` but restores it after — safe for test usage.
- All thread state mutations happen synchronously within `tick()`.

### 2.2 Shared Mutable State Risks

| Shared State | Access Pattern | Risk |
|-------------|---------------|------|
| `target.variables` | Mutated by interpreter, read by context factory | **LOW** — single-threaded, no concurrent readers |
| `thread.context.localScope` | Written by `control_repeat`, read by `stepThread` | **LOW** — same thread, same tick |
| `runtime.activeThreads` | Mutated by `tick()` Phase 1/3 | **NONE** — only `tick()` touches it |
| `interpreter.targets` (Map) | Written by `registerTarget`, read by `findBlock` | **LOW** — no concurrent modification |

### 2.3 Potential Race Condition (Theoretical)

`BaseRuntime.interpreter.onStopAll` mutates `this.activeThreads` (runtime/index.ts:37-43) **while `tick()` is iterating over `threadsToStep`** (a snapshot copy, runtime/index.ts:165). This is safe because:
1. The snapshot `threadsToStep` is a copy — mutations to `activeThreads` don't affect the iteration.
2. Killed threads are skipped via `if (thread.isKilled || thread.status === 'DONE') continue`.
3. Killed threads are swept in Phase 3 after iteration completes.

**No race condition.** The snapshot pattern is correct.

---

## 3. Memory Leak Risk Review

### 3.1 Thread Cleanup — SAFE

| Path | Cleanup | Leak Risk |
|------|---------|-----------|
| Normal completion | Phase 3 sweep removes DONE threads | None |
| `stop()` | All threads marked DONE+isKilled, array cleared | None |
| `initialize()` | Full reset including thread counter | None |
| Budget yield → resume → complete | Normal lifecycle, swept in Phase 3 | None |
| Wait expiry → resume → complete | Normal lifecycle, swept in Phase 3 | None |

### 3.2 Potential Leak Vectors (Minor)

1. **`thread.context.localScope` entries for loop counters**: `control_repeat` deletes scope keys on loop completion (`delete thread.context.localScope[scopeKey]`), but if a thread is killed mid-loop, the localScope entries remain. Since the entire thread object is dereferenced after Phase 3 sweep, this is not a real leak — just delayed GC.

2. **`StubHardwareAdapter.callLog`**: Grows unboundedly in tests. Not a production concern (production adapter wouldn't log). Test fixtures should call `hardwareAdapter.reset()` between tests — currently some tests don't.

3. **`BaseRuntime.tickInterval`**: Cleared on `stop()` and `pause()`. No leak. But if `stop()` is called while `tick()` is executing (impossible in single-threaded JS), the interval would be cleared mid-tick — harmless.

### 3.3 Zustand Store — NO LEAK RISK

`useRuntimeStore` holds flat primitive state. `globalVariables` Record could grow if variables are added but never removed — this mirrors Scratch behavior (cloud variables persist) and is by design.

---

## 4. Execution Ordering Stability Review

### 4.1 Thread Promotion Order — STABLE

`triggerHat()` iterates `this.targets` (Map insertion order guaranteed in ES6+) and scripts in array order. Tasks are enqueued FIFO. Promotion dequeues in order.

### 4.2 Thread Stepping Order — STABLE

`threadsToStep = [...this.activeThreads]` — snapshot in insertion order. Iteration is index-based. No reordering mid-tick.

### 4.3 Block Execution Order Within Thread — STABLE

Sequential chain traversal follows `block.next` pointers. Branching uses `thread.stack` (LIFO) for return addresses. Loops use `localScope` counters. All deterministic.

### 4.4 Instability Risk — Thread Counter Reset

`resetThreadCounter()` is module-level state. If two `BaseRuntime` instances exist simultaneously, calling `initialize()` on one resets the counter for both. Thread IDs could collide.

**Severity: Low** (unlikely in practice — only one runtime instance per page). But a true production system should use instance-scoped counters.

---

## 5. Overengineering Review

### 5.1 Interfaces vs Implementations

| Interface | Concrete Implementation | Used? | Overengineered? |
|-----------|------------------------|-------|-----------------|
| `IRuntime` | `BaseRuntime` | Yes | No — appropriate abstraction |
| `IThreadManager` | None | No | **Yes** — defined but never implemented or used |
| `IExecutionEngine` | None | No | **Yes** — defined but never implemented or used |
| `IASTInterpreter` | `MinimalASTInterpreter` | Yes | No — appropriate abstraction |
| `IRuntimeEventEmitter` | None | No | **Yes** — defined but never implemented or used |
| `IGPIOHandler` | None | No | Borderline — interface for future simulator integration |
| `ISimulatorConnection` | None | No | Borderline — same as above |
| `IPixiStageWrapper` | None | No | Borderline — same as above |

**3 unused interfaces** (`IThreadManager`, `IExecutionEngine`, `IRuntimeEventEmitter`) are premature abstractions. They add no value at this stage and should be removed or deferred until concrete implementations exist.

### 5.2 Module Count

9 source modules for a "minimal foundation" is reasonable but borderline. The `events/`, `simulator/`, `stage/`, and `store/` modules contain only interfaces or stubs with no implementations. They exist as "slots" for future work.

**Verdict:** Not overengineered for the intended architecture, but the unused interfaces should be noted as technical debt.

---

## 6. Scaling Risk Review

### 6.1 Dangerous Future Scaling Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Linear block lookup** | **HIGH** | `findBlock()` iterates ALL scripts of a target to find a block by ID (interpreter.ts:212-222). O(scripts × blocks_per_script) per lookup. With `stepThread()` calling `findBlock()` up to `MAX_BLOCKS_PER_TICK` times per tick, this becomes O(MAX_BLOCKS × scripts × blocks). For 30 FPS with 10 sprites × 20 scripts × 100 blocks each, that's 1000 × 200 = 200,000 iterations per tick. |
| **No opcode dispatch table** | **MEDIUM** | Block execution uses sequential `if/switch` chains across opcode category checks. Adding new opcodes requires modifying the monolithic `executeBlock()` method. This doesn't scale to 250+ block types. |
| **Module-level thread counter** | **MEDIUM** | `threadCounter` is module-scoped, not instance-scoped. Multiple runtime instances would share and corrupt each other's IDs. |
| **No thread priority or preemption** | **LOW** | Current FIFO scheduling is fine for Scratch-like programs but won't support real-time hardware interaction where GPIO reads need lower latency than motion updates. |
| **Zustand store not connected to runtime** | **LOW** | `useRuntimeStore` is defined but never updated by `BaseRuntime`. A future integration will need to wire tick/frame updates into the store without causing React re-renders at 30 FPS (performance concern). |

### 6.2 Architecture Weaknesses

1. **Interpreter has dual responsibilities**: `MinimalASTInterpreter` handles both block execution AND control-flow stack management. These should be separated: a `BlockExecutor` (opcode dispatch) and a `ThreadStepper` (stack/pointer management). Current coupling makes it hard to add new opcodes without understanding stack mechanics.

2. **No custom block / procedure support**: The architecture has no mechanism for custom blocks (Scratch "my blocks"). The `thread.stack` is used for branching/loop return addresses but there's no CALL/RETURN convention for user-defined procedures.

3. **No reporter block evaluation**: `resolveInputValue()` returns `defaultValue` for nested block references (interpreter.ts:594). This means expressions like `x + y` where `+` is a reporter sub-block are not evaluated. This is a fundamental limitation for any non-trivial program.

4. **No error handling / recovery**: If `executeBlock()` throws, the entire tick crashes with no thread-level error isolation. Production Scratch VMs catch per-thread errors and isolate failures.

### 6.3 Serialization Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Thread state not serializable** | **MEDIUM** | `Thread.context.localScope` contains arbitrary `unknown` values. `Thread.stack` contains `BlockId[]`. Both are technically JSON-serializable, but there's no `serializeThread()` / `deserializeThread()` utility. Required for: project save/load, undo/redo, debugging state snapshots. |
| **TargetState mutation in place** | **MEDIUM** | `executeMotionNode()` and `executeVariableNode()` mutate `target` objects in place (e.g., `sprite.x += ...`). No snapshot-before-mutation capability. Undo/redo requires immutable state or command pattern. |
| **No AST validation** | **LOW** | No validation that an ASTScript's block graph is well-formed (no cycles, all referenced blocks exist, stack is consistent). Malformed AST → silent misexecution or infinite loops. |

### 6.4 Lifecycle Edge Cases

| Edge Case | Handled? | Behavior |
|-----------|----------|----------|
| Thread killed mid-wait | Yes | `isKilled` check at stepThread entry → DONE |
| Thread killed mid-loop | Yes | Same as above — isKilled checked in step loop |
| Zero-duration wait | Yes | `Math.max(0, durationSecs)` → delayMs = 0, resumes next tick |
| Negative repeat count | Yes | `Math.max(0, ...)` → 0 iterations, skip to next |
| Missing block in chain | Yes | `findBlock()` returns undefined → thread DONE |
| Missing target | Yes | `this.targets.get()` returns undefined → thread DONE |
| Stack overflow | Yes | `MAX_STACK_DEPTH = 256` check, thread DONE |
| Nested branching depth | Yes | Stack-based, bounded by MAX_STACK_DEPTH |
| Broadcast during wait | Yes | New task enqueued, promoted next tick |
| Stop "all" during wait | Yes | All threads marked DONE+isKilled |
| Stop "all" during another thread's step | Yes | isKilled checked before each block execution |
| Double start() | Yes | Guarded: `if (this.isRunning && !this.isPaused) return` |
| start() → pause() → start() | **Partial** | `start()` checks `!this.isPaused` but doesn't clear isPaused when resuming — actually it does set `this.isPaused = false` on line 77. Verified safe. |
| tick() called when not running | Yes | Guarded: `if (!this.isRunning || this.isPaused) return` |
| addTarget() with null/undefined | **Partial** | Guarded: `if (target && target.id)` but only checks truthy, not type validity |
| Multiple scripts with same topBlockId | **No** | Duplicate detection in Phase 1 matches on `targetId + topBlockId`, which could conflate scripts from different sprites that happen to share topBlockId strings |

---

## 7. Test Realism Review

### 7.1 Test Coverage Summary

| Test File | Tests | Coverage Focus |
|-----------|-------|----------------|
| ast-interpreter.test.ts | 18 | Sequential traversal, events, motion, variables, hardware, unknown opcodes |
| control-flow.test.ts | 18 | stepThread budget, stack pop, if/if_else, repeat, nested loops |
| execution-context.test.ts | 12 | Context factory, thread creation, TaskQueue |
| runtime-active-threads.test.ts | 17 | Persistent threads, wait timers, stop semantics, broadcast waits |
| runtime-tick.test.ts | 10 | Target management, tick execution, broadcasts, hardware, multi-target |

**Total: 75 tests.** Good breadth for foundation phase.

### 7.2 Test Realism Assessment

**Strengths:**
- Multi-tick stepping with exact state assertions (e.g., wait countdown tests verify intermediate delayMs values)
- Nested loop tests verify independent scope counters don't collide
- Stop semantics tests verify both immediate halt AND continued execution of non-affected threads
- Broadcast tests include name matching and non-matching
- Budget yield test with 1005 blocks is realistic stress

**Weaknesses / Missing Coverage:**
1. **No test for `control_wait` missing `return` statement**: No test verifies the `BlockExecutionResult` returned by `control_wait` — tests only check side effects (status, delayMs).
2. **No test for `BLOCKED` thread status**: Status is defined but untested.
3. **No test for `evaluateScript()` async behavior**: Tests use `traverse()` or `stepThread()`, not `evaluateScript()`.
4. **No error/failure path tests**: What happens if a block execution throws? No test.
5. **No test for `traverse()` unbounded execution**: No test with a circular `next` chain (infinite loop).
6. **No test for sprite-on-stage variable shadowing**: Both TargetState.variables and Thread.context.variables exist — no test for conflict.
7. **No test for concurrent variable mutation across threads**: Two threads mutating the same target's variables in the same tick.
8. **No performance/stress test beyond 1005 blocks**: No test with 100+ concurrent threads or 1000+ sprites.

### 7.3 Test Helper Duplication

`makeBlock()`, `makeSprite()`, and `makeScript()` are duplicated across all 5 test files. This should be extracted to a shared test utility.

---

## 8. Rendering Integration Readiness Assessment

### 8.1 Current State

| Component | Status | Readiness |
|-----------|--------|-----------|
| Sprite position (x, y, direction) | Mutated in place by interpreter | **Partial** — mutations are synchronous, no change notification |
| Costume data structures | Defined in types, not used | **Not ready** — no costume switching logic |
| Stage dimensions | Defined in StageConfig | **Stub only** — IPixiStageWrapper has no implementation |
| Zustand store | Defined but not connected to runtime | **Not ready** — no tick-level state sync |
| Event system (IRuntimeEventEmitter) | Interface only, no implementation | **Not ready** — no way to observe state changes |

### 8.2 Rendering Integration Gap Analysis

To connect the runtime to a renderer (PixiJS or React), the following are needed:

1. **State change notification**: Interpreter mutates sprite.x/y/direction directly. Renderer needs to know when to re-render. Options:
   - Event emission after each block execution (expensive at 1000 blocks/tick)
   - Batch "dirty flag" per target, checked once per tick
   - Zustand store sync once per tick (recommended)

2. **Coordinate system mapping**: Scratch uses centered coordinates (-240 to 240 x, -180 to 180 y). PixiJS uses top-left origin. The `IPixiStageWrapper.resizeViewport()` interface exists but has no implementation.

3. **Costume/appearance rendering**: No costume switching, visibility toggling, or size/scaling logic in the interpreter. `motion_movesteps` exists but there's no `looks_show`, `looks_hide`, `looks_switchcostumeto`, etc.

4. **Frame synchronization**: Runtime runs at 30 FPS via `setInterval`. Renderer (requestAnimationFrame) runs at 60 FPS. Need a synchronization strategy — likely "runtime step → renderer draw" with double-buffered state.

**Rendering Readiness Score: 2/10.** The data structures exist but there's no notification mechanism, no coordinate mapping, no appearance opcodes, and no frame sync.

---

## 9. Simulator Sync Readiness Assessment

### 9.1 Current State

| Component | Status | Readiness |
|-----------|--------|-----------|
| IGPIOHandler (async) | Defined, not implemented | **Not ready** — runtime uses sync IHardwareAdapter |
| ISimulatorConnection | Defined, not implemented | **Not ready** |
| IHardwareAdapter (sync) | StubHardwareAdapter implemented | **Ready** — but async/sync mismatch |
| Pin state management | StubHardwareAdapter has pinStates Map | **Partial** — no mode tracking |

### 9.2 Simulator Integration Gap

**Critical mismatch**: The runtime's `IHardwareAdapter` is synchronous (e.g., `digitalRead(pin): number`), but the simulator interface `IGPIOHandler` is async (e.g., `digitalRead(pin): Promise<number>`). This async/sync impedance mismatch will require:

1. Making `executeBlock()` and `stepThread()` async, OR
2. Using a synchronous proxy that caches the last-known pin state from the simulator, OR
3. A double-buffered approach where simulator state is snapshotted at tick boundaries.

**Option 2 is recommended** — it preserves deterministic synchronous execution while allowing the simulator to update asynchronously between ticks.

### 9.3 Simulator Sync Readiness Score: 3/10

The hardware adapter interface exists and is testable, but the async/sync mismatch, lack of pin mode tracking, and no connection lifecycle management are blocking issues.

---

## 10. Progress.md Accuracy Review

### 10.1 Claims vs Reality

| Claim (progress.md) | Actual | Accurate? |
|---------------------|--------|-----------|
| "Custom Scratch-inspired Runtime Engine scaffolding" (8.7) | Package exists with types, interpreter, runtime, store | Yes |
| "Runtime AST execution foundation" (8.8) | MinimalASTInterpreter with sequential/branching/loop/wait/stop | Yes, but "40 unit tests" is outdated — now 75 |
| "Deterministic control-flow foundation (Steps 1-3)" (8.9) | stepThread, if/if_else, control_repeat implemented | Yes, but "58 unit tests" is outdated |
| "Persistent active-thread lifecycle (Step 4)" (8.10) | activeThreads, 3-phase tick, duplicate restart | Yes, but "65 unit tests" is outdated |
| "Deterministic wait/timer (Step 5)" (8.11) | control_wait, WAITING status, countdown | Yes, but "72 unit tests" is outdated |
| "Stop semantics (Step 6)" (8.12) | control_stop with 3 options, callbacks, sweep | Yes, but "75 unit tests" is now current |
| "NOT production-ready" disclaimers | Correct — missing reporters, custom blocks, rendering, error handling | Yes |

### 10.2 Inaccuracies to Fix

1. **Test counts are stale**: All entries cite outdated test counts (40, 58, 65, 72, 75). Current is 75.
2. **8.8 says "40 unit tests"**: Should be updated to reflect cumulative count at time of each phase.
3. **No mention of `BLOCKED` status being unused**: The type definition includes it but nothing implements it.
4. **No mention of `IThreadManager`/`IExecutionEngine`/`IRuntimeEventEmitter` being unused interfaces**: These are defined in `core/index.ts` and `events/index.ts` but have no implementations.

### 10.3 Runtime Maturity Claims

The "NOT production-ready" disclaimers are accurate and appropriately cautious. The runtime is a well-structured foundation with correct deterministic semantics for the supported opcodes, but is missing critical features for production use:

- No reporter block evaluation (expressions)
- No custom blocks / procedures
- No error handling / recovery
- No rendering integration
- No simulator sync
- No costume/sound/look opcodes
- No `control_forever` (infinite loop)
- No `control_until` (while loop)
- No `event_whenkeypressed` or sensor hat blocks

---

## 11. Recommended Phase 6D Scope

Based on this audit, the following Phase 6D scope is recommended in priority order:

### Tier 1 — Critical Path (Must Have)

| # | Task | Rationale |
|---|------|-----------|
| 6D.1 | **Reporter block evaluation** | Without this, no expressions (`x + 1`), no comparisons beyond literals, no sensor value usage in conditions. Fundamental for any non-trivial program. |
| 6D.2 | **`control_forever` (infinite loop)** | The most common Scratch block. Without it, programs can't run continuously. |
| 6D.3 | **`control_until` (while/until loop)** | Essential for sensor-driven logic ("wait until touch sensor pressed"). |
| 6D.4 | **Fix `control_wait` missing return** | Add explicit return after setting WAITING status. Low effort, removes ambiguity. |
| 6D.5 | **Remove unused interfaces** | Delete `IThreadManager`, `IExecutionEngine`, `IRuntimeEventEmitter` or move to a `future/` directory. Reduce maintenance burden. |
| 6D.6 | **Instance-scoped thread counter** | Move `threadCounter` from module scope to `BaseRuntime` instance. Prevents ID collision with multiple runtimes. |

### Tier 2 — Important (Should Have)

| # | Task | Rationale |
|---|------|-----------|
| 6D.7 | **Opcode dispatch table** | Replace sequential `if` chains with `Map<opcode, executor>` pattern. Required for extensibility to 250+ blocks. |
| 6D.8 | **Block-level error isolation** | try/catch per block execution with thread-level error state. Prevents one bad block from crashing the entire runtime. |
| 6D.9 | **Looks/appearance opcodes** | `looks_show`, `looks_hide`, `looks_switchcostumeto`, `looks_setsizeto`. Required for rendering integration. |
| 6D.10 | **Tick-level state change notification** | Dirty flag per target, or event emission at tick boundary. Required for rendering integration. |
| 6D.11 | **`traverse()` budget safety** | Add MAX_BLOCKS_PER_TICK guard to `traverse()` to prevent infinite loops in non-stepThread execution paths. |
| 6D.12 | **Shared test utilities** | Extract `makeBlock()`, `makeSprite()`, `makeScript()` to `tests/helpers.ts`. |

### Tier 3 — Deferred (Nice to Have)

| # | Task | Rationale |
|---|------|-----------|
| 6D.13 | **Custom blocks / procedures** | Required for Scratch parity but complex. Can be deferred to Phase 6E. |
| 6D.14 | **Serializability utilities** | `serializeThread()` / `deserializeThread()` for undo/redo and debugging. |
| 6D.15 | **Async/sync simulator bridge** | Synchronous pin state cache for simulator integration. |
| 6D.16 | **Zustand store → runtime wiring** | Connect useRuntimeStore to BaseRuntime tick events. |
| 6D.17 | **Event emitter implementation** | Concrete `RuntimeEventEmitter` for lifecycle observation. |
| 6D.18 | **AST validation** | Pre-execution validation of block graph integrity. |

---

## 12. Summary Scores

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Deterministic execution | **9/10** | Excellent. Only minor issue with `traverse()` lacking budget. |
| Thread lifecycle correctness | **8/10** | Good. One masked bug (wait return), one dead state (BLOCKED). |
| Concurrency safety | **10/10** | No concurrency risks in single-threaded model. |
| Memory leak safety | **9/10** | Good. Thread cleanup is thorough. Minor localScope residual on killed threads. |
| Execution ordering stability | **9/10** | Stable. Module-level counter is the only risk. |
| Overengineering | **7/10** | 3 unused interfaces, but module structure is reasonable. |
| Scaling readiness | **4/10** | Linear block lookup and monolithic dispatch are real bottlenecks. |
| Rendering integration readiness | **2/10** | Data structures only. No notification, no appearance opcodes, no frame sync. |
| Simulator sync readiness | **3/10** | Async/sync mismatch is the blocking issue. |
| Test coverage & realism | **7/10** | Good breadth for foundation. Missing error paths, reporter tests, stress tests. |
| Progress.md accuracy | **7/10** | Descriptions accurate, test counts stale. |
| Overall runtime maturity | **5/10** | Solid deterministic foundation. Missing reporters, forever/until, rendering, error handling. |

---

## 13. Conclusion

The Phase 6C runtime engine is a **well-structured, deterministically correct foundation** with clean separation between the tick orchestrator (`BaseRuntime`) and the block executor (`MinimalASTInterpreter`). The 3-phase tick lifecycle, budget-based yielding, wait countdown, and stop semantics are all correctly implemented with good test coverage.

The primary risks are **scaling** (linear block lookup, monolithic dispatch) and **incompleteness** (no reporter evaluation, no forever/until loops, no rendering/simulator integration). These are expected for a "foundation" phase and are addressable in Phase 6D.

The recommended Phase 6D scope focuses on reporter block evaluation and additional control flow as the critical path, with opcode dispatch refactoring and error isolation as important secondary goals.

---

*Audit completed at 2026-06-01 01:49 UTC. 75/75 tests passing.*
*Report finalized at 2026-06-01 02:03 UTC. Written to `GLM RESEARCH/Phase-6C-Runtime-Architecture-Audit.md`.*
