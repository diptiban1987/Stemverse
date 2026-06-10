import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StubHardwareAdapter } from '../src/ast/interpreter';
import { ASTBlock, ASTScript, SpriteState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Test helpers ───────────────────────────────────────────────────

function makeBlock(overrides: Partial<ASTBlock> & { id: string; opcode: string }): ASTBlock {
  return {
    next: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false,
    ...overrides,
  };
}

function makeSprite(overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id: 'sprite1',
    name: 'Sprite1',
    isStage: false,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    size: 100,
    draggable: false,
    rotationStyle: 'all around',
    ...overrides,
  };
}

/**
 * Creates an ASTScript from a list of blocks without automatic linear chaining.
 * Pointers like block.next or substacks must be defined manually on the blocks.
 */
function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  const blocksMap: Record<string, ASTBlock> = {};
  for (const block of blocks) {
    blocksMap[block.id] = block;
  }
  return {
    id: `script_${hatOpcode}_${Math.random().toString(36).substr(2, 5)}`,
    hatOpcode,
    topBlockId: blocks[0].id,
    blocks: blocksMap,
  };
}

describe('Phase 6C Step 4 - Persistent Active-Thread Runtime Lifecycle', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime(new StubHardwareAdapter());
    await runtime.initialize();
    resetThreadCounter();
  });

  // 1. active thread persistence & 2. yielded thread resume
  it('should persist yielded threads across ticks and resume execution correctly', () => {
    // Create a repeat loop script: repeat 3 [ change x by 10 ]
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
      makeBlock({
        id: 'loop',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
        next: null,
      }),
      makeBlock({
        id: 'move',
        opcode: 'motion_changexby',
        inputs: { DX: { name: 'DX', value: 10 } },
        next: null,
      }),
    ];

    const script = makeScript('event_whenflagclicked', blocks);
    const sprite = makeSprite({ scripts: [script] });
    runtime.addTarget(sprite);

    // Enqueue script via start
    runtime.start();
    expect(runtime.activeThreads).toHaveLength(0); // Only queued in taskQueue initially

    // Tick 1: Promote + 1st Loop iteration -> yields. remaining is decremented to 2.
    runtime.stepOnce();
    expect(sprite.x).toBe(10);
    expect(runtime.activeThreads).toHaveLength(1);
    expect(runtime.activeThreads[0].status).toBe('YIELDED');
    expect(runtime.activeThreads[0].context.localScope['loop_loop_remaining']).toBe(2);

    // Tick 2: 2nd Loop iteration -> yields. remaining is decremented to 1.
    runtime.stepOnce();
    expect(sprite.x).toBe(20);
    expect(runtime.activeThreads).toHaveLength(1);
    expect(runtime.activeThreads[0].status).toBe('YIELDED');
    expect(runtime.activeThreads[0].context.localScope['loop_loop_remaining']).toBe(1);

    // Tick 3: 3rd Loop iteration -> completes loop, status becomes DONE.
    runtime.stepOnce();
    expect(sprite.x).toBe(30);
    expect(runtime.activeThreads).toHaveLength(0); // Swept immediately!
    runtime.stop();
  });

  // 3. DONE thread cleanup
  it('should remove DONE threads cleanly with no memory leaks or stale references', () => {
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'move' }),
      makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 42 } }, next: null }),
    ];

    const script = makeScript('event_whenflagclicked', blocks);
    const sprite = makeSprite({ scripts: [script] });
    runtime.addTarget(sprite);

    runtime.start();
    expect(runtime.activeThreads).toHaveLength(0);

    // One tick should execute the full synchronous chain and sweep it immediately
    runtime.stepOnce();
    expect(sprite.x).toBe(42);
    expect(runtime.activeThreads).toHaveLength(0);
    runtime.stop();
  });

  // 4. deterministic thread order
  it('should promote and step active threads in strict deterministic insertion order', () => {
    const blocks1 = [
      makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'move1' }),
      makeBlock({ id: 'move1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 11 } }, next: null }),
    ];
    const blocks2 = [
      makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'move2' }),
      makeBlock({ id: 'move2', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 22 } }, next: null }),
    ];

    const sprite1 = makeSprite({ id: 's1', name: 'Sprite1', scripts: [makeScript('event_whenflagclicked', blocks1)] });
    const sprite2 = makeSprite({ id: 's2', name: 'Sprite2', scripts: [makeScript('event_whenflagclicked', blocks2)] });

    runtime.addTarget(sprite1);
    runtime.addTarget(sprite2);

    runtime.start();
    // Step once to promote and execute
    runtime.stepOnce();

    expect(sprite1.x).toBe(11);
    expect(sprite2.y).toBe(22);
    expect(runtime.activeThreads).toHaveLength(0);
    runtime.stop();
  });

  // 5. broadcast thread spawning
  it('should spawn multiple broadcast threads deterministically without duplicates corrupting state', () => {
    const blocks1 = [
      makeBlock({
        id: 'hat1', opcode: 'event_whenbroadcastreceived', topLevel: true,
        fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        next: 'move1',
      }),
      makeBlock({ id: 'move1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 5 } }, next: null }),
    ];

    const sprite1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks1)] });
    runtime.addTarget(sprite1);

    // Trigger broadcast
    runtime.triggerBroadcast('go');
    expect(runtime.activeThreads).toHaveLength(0);

    runtime.stepOnce();
    expect(sprite1.x).toBe(5);
    expect(runtime.activeThreads).toHaveLength(0);
  });

  // 6. runtime stop/reset cleanup
  it('should clear active threads, task queue, and reset counter on stop & initialize', () => {
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
      makeBlock({
        id: 'loop',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 50 },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
        next: null,
      }),
      makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: null }),
    ];

    const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
    runtime.addTarget(sprite);

    runtime.start();
    runtime.stepOnce(); // starts the loop, thread is now active and yielded

    expect(runtime.activeThreads).toHaveLength(1);
    const activeThread = runtime.activeThreads[0];

    // Call stop
    runtime.stop();

    expect(runtime.activeThreads).toHaveLength(0);
    expect(activeThread.status).toBe('DONE');
    expect(activeThread.isKilled).toBe(true);
    expect(runtime.taskQueue.isEmpty()).toBe(true);
  });

  // 7. nested loop persistence
  it('should support nested loop persistence across multiple ticks without state collisions', () => {
    // repeat 2 [ repeat 3 [ change x by 1 ] ]
    const blocks = [
      makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'outer_loop' }),
      makeBlock({
        id: 'outer_loop',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 2 },
          SUBSTACK: { name: 'SUBSTACK', value: 'inner_loop' },
        },
        next: null,
      }),
      makeBlock({
        id: 'inner_loop',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
        next: null,
      }),
      makeBlock({
        id: 'move',
        opcode: 'motion_changexby',
        inputs: { DX: { name: 'DX', value: 1 } },
        next: null,
      }),
    ];

    const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
    runtime.addTarget(sprite);

    runtime.start();

    // 1st outer iteration, 1st inner -> change x, yield
    runtime.stepOnce();
    expect(sprite.x).toBe(1);

    // 1st outer iteration, 2nd inner -> change x, yield
    runtime.stepOnce();
    expect(sprite.x).toBe(2);

    // 1st outer iteration completes inner loop, yields outer loop -> x stays at 3, yields
    runtime.stepOnce();
    expect(sprite.x).toBe(3);

    // 2nd outer iteration, 1st inner -> change x, yield -> x becomes 4
    runtime.stepOnce();
    expect(sprite.x).toBe(4);

    // 2nd outer iteration, 2nd inner -> change x, yield -> x becomes 5
    runtime.stepOnce();
    expect(sprite.x).toBe(5);

    // 2nd outer iteration, 3rd inner completes, entire script finishes -> x becomes 6, completed & swept
    runtime.stepOnce();
    expect(sprite.x).toBe(6);
    expect(runtime.activeThreads).toHaveLength(0);
    runtime.stop();
  });

  // 8. duplicate thread restart behavior (marked DONE + isKilled, swept naturally in Phase 3)
  it('should restart duplicate threads safely by marking old thread DONE + isKilled, sweeping it in Phase 3', () => {
    // Create a loop script that yields so it remains active
    const blocks = [
      makeBlock({
        id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
        fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        next: 'loop',
      }),
      makeBlock({
        id: 'loop',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 10 },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
        next: null,
      }),
      makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 2 } }, next: null }),
    ];

    const script = makeScript('event_whenbroadcastreceived', blocks);
    const sprite = makeSprite({ scripts: [script] });
    runtime.addTarget(sprite);

    // We must manually start running without calling event_whenflagclicked
    runtime.start(); // Set isRunning = true
    runtime.triggerBroadcast('go'); // Enqueues the broadcast task
    runtime.stepOnce(); // Step once so thread_1 is active/yielded

    expect(runtime.activeThreads).toHaveLength(1);
    const firstThread = runtime.activeThreads[0];
    expect(firstThread.id).toBe('thread_1');
    expect(firstThread.status).toBe('YIELDED');
    expect(sprite.x).toBe(2);

    // Trigger the exact same broadcast again (creates a pending task)
    runtime.triggerBroadcast('go');

    // Step once:
    // Phase 1: Promote: dequeues go. Finds thread_1 as duplicate. Marks it DONE and isKilled. Spawns thread_2.
    // Phase 2: Steps thread_2 -> x becomes 4, yields.
    // Phase 3: Sweeps thread_1 out.
    runtime.stepOnce();

    expect(firstThread.status).toBe('DONE');
    expect(firstThread.isKilled).toBe(true);

    expect(runtime.activeThreads).toHaveLength(1);
    expect(runtime.activeThreads[0].id).toBe('thread_2');
    expect(runtime.activeThreads[0].status).toBe('YIELDED');
    expect(sprite.x).toBe(4); // 2 from first iteration of thread_1 + 2 from first iteration of thread_2

    runtime.stop();
  });

  describe('Phase 6C Step 5 - Deterministic Wait/Timer Foundation', () => {
    it('should block execution and transition thread to WAITING status when executing control_wait', () => {
      // hat -> wait 1 -> move 10
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.1 } }, // 0.1 seconds = 100ms
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Step 1: Promote + executes hat -> executes wait -> transitions status to WAITING, delayMs = 100
      runtime.stepOnce();
      expect(sprite.x).toBe(0); // move should NOT have executed yet
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      expect(runtime.activeThreads[0].delayMs).toBeCloseTo(100, 1);
      runtime.stop();
    });

    it('should decrement wait countdown in tick based on tickDurationMs and resume deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.1 } }, // 100ms
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Tick 1 (wait begins): status set to WAITING, remaining is 100
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      // At 30 FPS, tickDurationMs is 33.33ms.

      // Tick 2: delayMs decremented to ~66.67
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      expect(runtime.activeThreads[0].delayMs).toBeCloseTo(66.67, 1);

      // Tick 3: delayMs decremented to ~33.33
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      expect(runtime.activeThreads[0].delayMs).toBeCloseTo(33.33, 1);

      // Tick 4: delayMs reaches 0 -> status transitioned to RUNNING and steps move 10 -> completes script, swept!
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });

    it('should yield for exactly 1 tick on wait 0 or negative wait values and resume on next tick', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0 } },
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 20 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Tick 1: Executes hat -> wait 0 -> sets status WAITING, delayMs = 0
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      expect(runtime.activeThreads[0].delayMs).toBe(0);

      // Tick 2: delayMs decremented to <= 0 -> resumes RUNNING -> executes move 20 -> completes & swept
      runtime.stepOnce();
      expect(sprite.x).toBe(20);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });

    it('should support waits inside repeat loops deterministically', () => {
      // repeat 2 [ change x by 5, wait 0.05 ]
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_repeat',
          inputs: {
            TIMES: { name: 'TIMES', value: 2 },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: null,
        }),
        makeBlock({
          id: 'move',
          opcode: 'motion_changexby',
          inputs: { DX: { name: 'DX', value: 5 } },
          next: 'wait',
        }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } }, // 50ms
          next: null,
        }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Tick 1: 1st iteration: move 5 -> wait 50ms (WAITING, delayMs = 50)
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(runtime.activeThreads[0].status).toBe('WAITING');
      expect(runtime.activeThreads[0].delayMs).toBeCloseTo(50, 1);

      // Tick 2: delayMs decremented to ~16.67, still WAITING
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 3: delayMs <= 0 -> resumes.
      // Since 'wait' block next is null, it pops back to 'loop'.
      // 'loop' decrements remaining to 1, pushes 'loop', sets yieldRequest, returns 'move'.
      // Thread status becomes YIELDED.
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      // Tick 4: 2nd iteration: move 5 -> wait 50ms (WAITING, delayMs = 50)
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 5: delayMs decremented to ~16.67, still WAITING
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 6: delayMs <= 0 -> resumes. Wait next is null -> pops to loop.
      // Loop decrements remaining to 0 -> loop finishes -> script finishes -> swept!
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });

    it('should handle sequential/nested waits accumulating delay correctly', () => {
      // hat -> wait 0.05 (50ms) -> wait 0.05 (50ms) -> move 10
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait1' }),
        makeBlock({
          id: 'wait1',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } },
          next: 'wait2',
        }),
        makeBlock({
          id: 'wait2',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } },
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Tick 1: Executes hat -> executes wait1 (WAITING, delayMs = 50)
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 2: wait1 decremented to ~16.67
      runtime.stepOnce();
      expect(sprite.x).toBe(0);

      // Tick 3: wait1 <= 0 -> resumes -> executes wait2 (WAITING, delayMs = 50)
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 4: wait2 decremented to ~16.67
      runtime.stepOnce();
      expect(sprite.x).toBe(0);

      // Tick 5: wait2 <= 0 -> resumes -> executes move 10 -> completed & swept!
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });

    it('should support multiple concurrent waiting threads counting down independently', () => {
      // Thread 1: wait 0.05 (50ms) -> move 5
      // Thread 2: wait 0.1 (100ms) -> move 100
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait1' }),
        makeBlock({
          id: 'wait1',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } },
          next: 'move1',
        }),
        makeBlock({ id: 'move1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 5 } }, next: null }),
      ];

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait2' }),
        makeBlock({
          id: 'wait2',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.1 } },
          next: 'move2',
        }),
        makeBlock({ id: 'move2', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 100 } }, next: null }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();

      // Tick 1: Both threads promote and wait (Thread 1: delay=50, Thread 2: delay=100)
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(sprite.y).toBe(0);
      expect(runtime.activeThreads).toHaveLength(2);

      // Tick 2: Thread 1 decrements to ~16.67, Thread 2 decrements to ~66.67
      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(sprite.y).toBe(0);

      // Tick 3: Thread 1 delay <= 0 -> resumes & executes move1 -> Thread 1 completes/swept. Thread 2 decrements to ~33.33
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(sprite.y).toBe(0);
      expect(runtime.activeThreads).toHaveLength(1);

      // Tick 4: Thread 2 decrements to ~0 -> resumes & executes move2 -> Thread 2 completes/swept
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(sprite.y).toBe(100);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });

    it('should support broadcasts executing waits independently without collision', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'ping' } },
          next: 'wait',
        }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } },
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 3 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.triggerBroadcast('ping');

      // Tick 1: Promote -> executes wait -> WAITING
      runtime.stepOnce();
      expect(sprite.x).toBe(0);

      // Tick 2: Wait decrements
      runtime.stepOnce();
      expect(sprite.x).toBe(0);

      // Tick 3: Resumes -> executes move -> swept
      runtime.stepOnce();
      expect(sprite.x).toBe(3);
      expect(runtime.activeThreads).toHaveLength(0);
      runtime.stop();
    });
  });

  describe('Phase 6C Step 6 - Stop Semantics', () => {
    it('should immediately halt executing script and sweep it on control_stop("this script")', () => {
      // hat -> setx 5 -> stop "this script" -> setx 100
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'setx1' }),
        makeBlock({ id: 'setx1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 5 } }, next: 'stop' }),
        makeBlock({
          id: 'stop',
          opcode: 'control_stop',
          fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } },
          next: 'setx2',
        }),
        makeBlock({ id: 'setx2', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 100 } }, next: null }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Step once: promotes and executes. Runs hat -> setx 5 -> stop -> sets DONE and stops chain.
      runtime.stepOnce();
      expect(sprite.x).toBe(5); // should NOT have run setx 100
      expect(runtime.activeThreads).toHaveLength(0); // Swept immediately
      runtime.stop();
    });

    it('should immediately halt all executing scripts and stop runtime on control_stop("all")', () => {
      // Thread 1: setx 10 -> stop "all" -> setx 100
      // Thread 2: loop 50 [ change y by 1 ]
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'setx1' }),
        makeBlock({ id: 'setx1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 10 } }, next: 'stop' }),
        makeBlock({
          id: 'stop',
          opcode: 'control_stop',
          fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'all' } },
          next: 'setx2',
        }),
        makeBlock({ id: 'setx2', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 100 } }, next: null }),
      ];

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_repeat',
          inputs: {
            TIMES: { name: 'TIMES', value: 50 },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: null,
        }),
        makeBlock({ id: 'move', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 1 } }, next: null }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();
      expect(runtime.getIsRunning()).toBe(true);

      // Step once:
      // Thread 1 executes first -> setx 10 -> stop "all" -> marks all DONE + isKilled -> calls runtime.stop() -> sweeps all!
      // Thread 2 is killed before it ever steps (since Thread 1 executes first).
      runtime.stepOnce();

      expect(sprite.x).toBe(10);
      expect(sprite.y).toBe(0); // Thread 2 is killed before stepping
      expect(runtime.activeThreads).toHaveLength(0);
      expect(runtime.getIsRunning()).toBe(false);
    });

    it('should halt only sibling scripts on same target on control_stop("other scripts in sprite")', () => {
      // Thread 1: setx 20 -> stop "other scripts in sprite" -> setx 200
      // Thread 2: loop 50 [ change y by 1 ]
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'setx1' }),
        makeBlock({ id: 'setx1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 20 } }, next: 'stop' }),
        makeBlock({
          id: 'stop',
          opcode: 'control_stop',
          fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'other scripts in sprite' } },
          next: 'setx2',
        }),
        makeBlock({ id: 'setx2', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 200 } }, next: null }),
      ];

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_repeat',
          inputs: {
            TIMES: { name: 'TIMES', value: 50 },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: null,
        }),
        makeBlock({ id: 'move', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 1 } }, next: null }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();

      // Step once:
      // Thread 1 executes first -> setx 20 -> stop "other scripts" -> marks Thread 2 as DONE + isKilled.
      // Thread 1 continues -> executes setx 200 -> completed.
      // Thread 2 is skipped because it is already marked DONE/isKilled.
      // Phase 3 Sweep -> sweeps Thread 2 (isKilled) and Thread 1 (completed).
      runtime.stepOnce();

      expect(sprite.x).toBe(200);
      expect(sprite.y).toBe(0); // Thread 2 is killed before stepping
      expect(runtime.activeThreads).toHaveLength(0);
      expect(runtime.getIsRunning()).toBe(true); // Runtime should still be running
      runtime.stop();
    });
  });

  describe('Phase 6D.1 - Block Registry Optimization', () => {
    it('should perform target-level O(1) registry lookups successfully', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 42 } }, next: null }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      
      runtime.addTarget(sprite);
      
      const thread = { targetId: sprite.id } as any;
      
      const hatBlock = runtime.interpreter.findBlock(thread, 'hat');
      expect(hatBlock).toBeDefined();
      expect(hatBlock?.opcode).toBe('event_whenflagclicked');
      
      const moveBlock = runtime.interpreter.findBlock(thread, 'move');
      expect(moveBlock).toBeDefined();
      expect(moveBlock?.opcode).toBe('motion_setx');
      
      const nonExistent = runtime.interpreter.findBlock(thread, 'non_existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should handle duplicate block IDs gracefully by overwriting deterministically', () => {
      const blocks1 = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'dup' }),
        makeBlock({ id: 'dup', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 10 } }, next: null }),
      ];
      const blocks2 = [
        makeBlock({ id: 'dup', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 20 } }, next: null }),
      ];
      const blocksMap: Record<string, ASTBlock> = {
        'hat': blocks1[0],
        'dup': blocks2[0],
      };
      const script = {
        id: 'script_dup_test',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'hat',
        blocks: blocksMap,
      };
      
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);
      
      const thread = { targetId: sprite.id } as any;
      const dupBlock = runtime.interpreter.findBlock(thread, 'dup');
      
      expect(dupBlock).toBeDefined();
      expect(dupBlock?.opcode).toBe('motion_sety');
    });

    it('should rebuild registry correctly on initialize()', async () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: null }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      
      runtime.addTarget(sprite);
      
      let thread = { targetId: sprite.id } as any;
      expect(runtime.interpreter.findBlock(thread, 'hat')).toBeDefined();
      
      await runtime.initialize();
      
      expect(runtime.interpreter.findBlock(thread, 'hat')).toBeUndefined();
    });

    it('should gracefully handle malformed block references and missing block IDs without crashing', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'invalid_ref' }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);
      
      runtime.start();
      runtime.stepOnce();
      
      expect(runtime.activeThreads).toHaveLength(0);
    });

    it('should isolate block registries per target strictly', () => {
      const blocks1 = [
        makeBlock({ id: 'block_a', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 10 } }, next: null }),
      ];
      const blocks2 = [
        makeBlock({ id: 'block_b', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 20 } }, next: null }),
      ];
      
      const sprite1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });
      const sprite2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenflagclicked', blocks2)] });
      
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);
      
      const thread1 = { targetId: 's1' } as any;
      const thread2 = { targetId: 's2' } as any;
      
      expect(runtime.interpreter.findBlock(thread1, 'block_a')).toBeDefined();
      expect(runtime.interpreter.findBlock(thread1, 'block_b')).toBeUndefined();
      
      expect(runtime.interpreter.findBlock(thread2, 'block_b')).toBeDefined();
      expect(runtime.interpreter.findBlock(thread2, 'block_a')).toBeUndefined();
    });

    it('should maintain compatibility with broadcast thread spawning and lookup optimization', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'hello' } },
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 15 } }, next: null }),
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);
      
      runtime.start();
      runtime.triggerBroadcast('hello');
      
      runtime.stepOnce();
      
      expect(sprite.x).toBe(15);
      expect(runtime.activeThreads).toHaveLength(0);
    });

    it('should run nested control-flow logic compatibly with O(1) registry lookups', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_repeat',
          inputs: {
            TIMES: { name: 'TIMES', value: 2 },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: null,
        }),
        makeBlock({
          id: 'move',
          opcode: 'motion_changexby',
          inputs: { DX: { name: 'DX', value: 5 } },
          next: 'branch',
        }),
        makeBlock({
          id: 'branch',
          opcode: 'control_if',
          inputs: {
            CONDITION: { name: 'CONDITION', value: true },
            SUBSTACK: { name: 'SUBSTACK', value: 'move_y' },
          },
          next: null,
        }),
        makeBlock({
          id: 'move_y',
          opcode: 'motion_changeyby',
          inputs: { DY: { name: 'DY', value: 10 } },
          next: null,
        }),
      ];
      
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);
      
      runtime.start();
      
      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(sprite.y).toBe(10);
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');
      
      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(sprite.y).toBe(20);
      expect(runtime.activeThreads).toHaveLength(0);
      
      runtime.stop();
    });

    it('should log lightweight warnings for duplicate block IDs, malformed block references, and invalid script block entries', () => {
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: string) => {
        warnings.push(msg);
      };

      try {
        // 1. Duplicate block ID logging test
        const script1 = makeScript('event_whenflagclicked', [
          makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', next: 'dup' }),
          makeBlock({ id: 'dup', opcode: 'motion_setx' }),
        ]);
        const script2 = makeScript('event_whenflagclicked', [
          makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', next: 'dup' }),
          makeBlock({ id: 'dup', opcode: 'motion_sety' }),
        ]);
        const spriteWithDups = makeSprite({ id: 's_dup', scripts: [script1, script2] });
        runtime.addTarget(spriteWithDups);

        expect(warnings.some(w => w.includes('Duplicate block ID detected'))).toBe(true);

        // 2. Malformed block reference lookup logging test
        const thread = { targetId: 's_dup' } as any;
        runtime.interpreter.evaluateReporter(thread, 'nonexistent_id');
        expect(warnings.some(w => w.includes('Malformed reporter reference or missing reporter block'))).toBe(true);

        // 3. Invalid script block entry logging test
        const invalidScript = {
          id: 'script_invalid',
          hatOpcode: 'event_whenflagclicked',
          topBlockId: 'hat',
          blocks: {
            'hat': null as any,
          }
        };
        const spriteWithInvalid = makeSprite({ id: 's_invalid', scripts: [invalidScript] });
        runtime.addTarget(spriteWithInvalid);
        expect(warnings.some(w => w.includes('Invalid script block entry detected'))).toBe(true);

      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Phase 6D.2 - Reporter Evaluation Foundation', () => {
    it('should evaluate nested arithmetic trees correctly', () => {
      const blocks = [
        makeBlock({
          id: 'add',
          opcode: 'operator_add',
          inputs: {
            NUM1: { name: 'NUM1', value: 'mult' },
            NUM2: { name: 'NUM2', value: 'sub' },
          },
        }),
        makeBlock({
          id: 'mult',
          opcode: 'operator_multiply',
          inputs: {
            NUM1: { name: 'NUM1', value: 5 },
            NUM2: { name: 'NUM2', value: 6 },
          },
        }),
        makeBlock({
          id: 'sub',
          opcode: 'operator_subtract',
          inputs: {
            NUM1: { name: 'NUM1', value: 10 },
            NUM2: { name: 'NUM2', value: 2 },
          },
        }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);
      const thread = { targetId: sprite.id } as any;

      const result = runtime.interpreter.evaluateReporter(thread, 'add');
      expect(result).toBe(38);
    });

    it('should evaluate boolean chains recursively and accurately', () => {
      const blocks = [
        makeBlock({
          id: 'or',
          opcode: 'operator_or',
          inputs: {
            OPERAND1: { name: 'OPERAND1', value: 'and' },
            OPERAND2: { name: 'OPERAND2', value: 'not' },
          },
        }),
        makeBlock({
          id: 'and',
          opcode: 'operator_and',
          inputs: {
            OPERAND1: { name: 'OPERAND1', value: true },
            OPERAND2: { name: 'OPERAND2', value: false },
          },
        }),
        makeBlock({
          id: 'not',
          opcode: 'operator_not',
          inputs: {
            OPERAND: { name: 'OPERAND', value: false },
          },
        }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);
      const thread = { targetId: sprite.id } as any;

      const result = runtime.interpreter.evaluateReporter(thread, 'or');
      expect(result).toBe(true);
    });

    it('should evaluate comparison chains with Scratch-style numeric/string rules', () => {
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', [
        makeBlock({ id: 'eq', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: '123' }, OPERAND2: { name: 'OPERAND2', value: 123 } } }),
        makeBlock({ id: 'lt', opcode: 'operator_lt', inputs: { OPERAND1: { name: 'OPERAND1', value: 'Apple' }, OPERAND2: { name: 'OPERAND2', value: 'banana' } } }),
        makeBlock({ id: 'gt', opcode: 'operator_gt', inputs: { OPERAND1: { name: 'OPERAND1', value: 'banana' }, OPERAND2: { name: 'OPERAND2', value: 'Apple' } } }),
      ])] });
      runtime.addTarget(sprite);
      const thread = { targetId: sprite.id } as any;

      expect(runtime.interpreter.evaluateReporter(thread, 'eq')).toBe(true);
      expect(runtime.interpreter.evaluateReporter(thread, 'lt')).toBe(true);
      expect(runtime.interpreter.evaluateReporter(thread, 'gt')).toBe(true);
    });

    it('should handle malformed reporters safely by logging warnings and falling back', () => {
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: string) => { warnings.push(msg); };

      try {
        const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', [
          makeBlock({ id: 'bad', opcode: 'operator_unknown_opcode' }),
          makeBlock({ id: 'missing_inputs', opcode: 'operator_add' }),
        ])] });
        runtime.addTarget(sprite);
        const thread = { targetId: sprite.id } as any;

        const resultBad = runtime.interpreter.evaluateReporter(thread, 'bad');
        expect(resultBad).toBe(0);
        expect(warnings.some(w => w.includes('Unknown reporter opcode'))).toBe(true);

        const resultMissing = runtime.interpreter.evaluateReporter(thread, 'missing_inputs');
        expect(resultMissing).toBe(0);

        const resultNone = runtime.interpreter.evaluateReporter(thread, 'nonexistent');
        expect(resultNone).toBe(0);
        expect(warnings.some(w => w.includes('Malformed reporter reference or missing reporter block'))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should resolve variable lookups from target state and thread context correctly', () => {
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: string) => { warnings.push(msg); };

      try {
        const sprite = makeSprite({
          id: 'sprite_vars',
          variables: {
            'var1_id': { id: 'var1_id', name: 'myVar', value: 100 },
          },
          scripts: [makeScript('event_whenflagclicked', [
            makeBlock({ id: 'get_myVar', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'myVar' } } }),
            makeBlock({ id: 'get_local', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'localVar' } } }),
            makeBlock({ id: 'get_missing', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'missingVar' } } }),
          ])]
        });
        runtime.addTarget(sprite);

        const thread = {
          targetId: 'sprite_vars',
          context: {
            variables: {
              'localVar': 'hello',
            },
            localScope: {}
          }
        } as any;

        expect(runtime.interpreter.evaluateReporter(thread, 'get_myVar')).toBe(100);
        expect(runtime.interpreter.evaluateReporter(thread, 'get_local')).toBe('hello');
        expect(runtime.interpreter.evaluateReporter(thread, 'get_missing')).toBe('');
        expect(warnings.some(w => w.includes('Variable "missingVar" not found'))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should evaluate deeply nested recursive reporter trees deterministically', () => {
      const blocks = [
        makeBlock({ id: 'root_and', opcode: 'operator_and', inputs: { OPERAND1: { name: 'OPERAND1', value: 'gt' }, OPERAND2: { name: 'OPERAND2', value: 'not' } } }),
        makeBlock({ id: 'gt', opcode: 'operator_gt', inputs: { OPERAND1: { name: 'OPERAND1', value: 'mult' }, OPERAND2: { name: 'OPERAND2', value: 150 } } }),
        makeBlock({ id: 'mult', opcode: 'operator_multiply', inputs: { NUM1: { name: 'NUM1', value: 'get_myVar' }, NUM2: { name: 'NUM2', value: 2 } } }),
        makeBlock({ id: 'get_myVar', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'myVar' } } }),
        makeBlock({ id: 'not', opcode: 'operator_not', inputs: { OPERAND: { name: 'OPERAND', value: 'eq' } } }),
        makeBlock({ id: 'eq', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_myVar' }, OPERAND2: { name: 'OPERAND2', value: 50 } } }),
      ];

      const sprite = makeSprite({
        id: 's_tree',
        variables: {
          'v1': { id: 'v1', name: 'myVar', value: 100 },
        },
        scripts: [makeScript('event_whenflagclicked', blocks)]
      });
      runtime.addTarget(sprite);
      const thread = {
        targetId: 's_tree',
        context: { variables: {}, localScope: {} }
      } as any;

      expect(runtime.interpreter.evaluateReporter(thread, 'root_and')).toBe(true);

      sprite.variables['v1'].value = 50;
      expect(runtime.interpreter.evaluateReporter(thread, 'root_and')).toBe(false);
    });

    it('should handle division and modulo by zero safely without crashing', () => {
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', [
        makeBlock({ id: 'div_pos', opcode: 'operator_divide', inputs: { NUM1: { name: 'NUM1', value: 5 }, NUM2: { name: 'NUM2', value: 0 } } }),
        makeBlock({ id: 'div_neg', opcode: 'operator_divide', inputs: { NUM1: { name: 'NUM1', value: -5 }, NUM2: { name: 'NUM2', value: 0 } } }),
        makeBlock({ id: 'mod_zero', opcode: 'operator_mod', inputs: { NUM1: { name: 'NUM1', value: 5 }, NUM2: { name: 'NUM2', value: 0 } } }),
      ])] });
      runtime.addTarget(sprite);
      const thread = { targetId: sprite.id } as any;

      expect(runtime.interpreter.evaluateReporter(thread, 'div_pos')).toBe(Infinity);
      expect(runtime.interpreter.evaluateReporter(thread, 'div_neg')).toBe(-Infinity);
      expect(runtime.interpreter.evaluateReporter(thread, 'mod_zero')).toBe(0);
    });

    it('should coerce null, undefined, and NaN inputs safely to their defaults', () => {
      const blocks = [
        makeBlock({
          id: 'add',
          opcode: 'operator_add',
          inputs: {
            NUM1: { name: 'NUM1', value: null as any },
            NUM2: { name: 'NUM2', value: undefined as any },
          },
        }),
        makeBlock({
          id: 'add_nan',
          opcode: 'operator_add',
          inputs: {
            NUM1: { name: 'NUM1', value: NaN },
            NUM2: { name: 'NUM2', value: 10 },
          },
        }),
        makeBlock({
          id: 'not',
          opcode: 'operator_not',
          inputs: {
            OPERAND: { name: 'OPERAND', value: null as any },
          },
        }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);
      const thread = { targetId: sprite.id } as any;

      expect(runtime.interpreter.evaluateReporter(thread, 'add')).toBe(0);
      expect(runtime.interpreter.evaluateReporter(thread, 'add_nan')).toBe(10);
      expect(runtime.interpreter.evaluateReporter(thread, 'not')).toBe(true);
    });
  });

  describe('Phase 6D.3 - control_forever Foundation', () => {
    it('should persist forever-loop execution across multiple tick cycles', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      
      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      runtime.stepOnce();
      expect(sprite.x).toBe(2);
      expect(runtime.activeThreads).toHaveLength(1);

      runtime.stepOnce();
      expect(sprite.x).toBe(3);

      runtime.stop();
    });

    it('should support waits inside forever loops deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 5 } }, next: 'wait' }),
        makeBlock({
          id: 'wait',
          opcode: 'control_wait',
          inputs: { DURATION: { name: 'DURATION', value: 0.05 } },
        }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      runtime.stepOnce();
      expect(sprite.x).toBe(5);

      runtime.stepOnce();
      expect(sprite.x).toBe(5);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      runtime.stop();
    });

    it('should support nested forever loops without stack collisions or overflow', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop1' }),
        makeBlock({
          id: 'loop1',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'loop2' }),
        makeBlock({
          id: 'loop2',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move_y' } },
        }),
        makeBlock({ id: 'move_y', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 10 } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(sprite.y).toBe(10);

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(sprite.y).toBe(20);

      runtime.stepOnce();
      expect(sprite.y).toBe(30);

      runtime.stop();
    });

    it('should integrate forever loops with broadcast triggers executing concurrently', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'play' } },
          next: 'loop',
        }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 2 } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.triggerBroadcast('play');

      runtime.stepOnce();
      expect(sprite.x).toBe(2);

      runtime.stepOnce();
      expect(sprite.x).toBe(4);

      runtime.stop();
    });

    it('should handle empty/missing substacks safely as infinite yielding no-ops', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: {},
        }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');
      expect(runtime.activeThreads[0].currentBlockId).toBe('loop');

      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      runtime.stop();
    });

    it('should terminate forever loops cleanly using stop semantics', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'stop' }),
        makeBlock({
          id: 'stop',
          opcode: 'control_stop',
          fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } },
        }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should support deterministic per-iteration yielding behavior', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop1' }),
        makeBlock({ id: 'loop1', opcode: 'control_forever', inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move1' } } }),
        makeBlock({ id: 'move1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop2' }),
        makeBlock({ id: 'loop2', opcode: 'control_forever', inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move2' } } }),
        makeBlock({ id: 'move2', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 100 } } }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(sprite.y).toBe(100);

      runtime.stepOnce();
      expect(sprite.x).toBe(20);
      expect(sprite.y).toBe(200);

    });
  });

  describe('Phase 6D.4 - control_until Foundation', () => {
    it('should persist until-loop execution across ticks and exit when condition becomes true', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: 'move_after',
        }),
        makeBlock({
          id: 'eq',
          opcode: 'operator_equals',
          inputs: {
            OPERAND1: { name: 'OPERAND1', value: 'get_x' },
            OPERAND2: { name: 'OPERAND2', value: 3 },
          },
        }),
        makeBlock({ id: 'get_x', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } } }),
        makeBlock({
          id: 'move',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } },
          inputs: { VALUE: { name: 'VALUE', value: 1 } },
          next: 'move_sprite',
        }),
        makeBlock({ id: 'move_sprite', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
        makeBlock({ id: 'move_after', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 100 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite1',
        variables: {
          'x_var': { id: 'x_var', name: 'x', value: 0 },
        },
        scripts: [makeScript('event_whenflagclicked', blocks)]
      });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(1);
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      runtime.stepOnce();
      expect(sprite.x).toBe(2);

      runtime.stepOnce();
      expect(sprite.x).toBe(3);

      runtime.stepOnce();
      expect(sprite.x).toBe(3);
      expect(sprite.y).toBe(100);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should support waits inside until loops deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
        }),
        makeBlock({
          id: 'eq',
          opcode: 'operator_equals',
          inputs: {
            OPERAND1: { name: 'OPERAND1', value: 'get_x' },
            OPERAND2: { name: 'OPERAND2', value: 2 },
          },
        }),
        makeBlock({ id: 'get_x', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } } }),
        makeBlock({
          id: 'move',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } },
          inputs: { VALUE: { name: 'VALUE', value: 1 } },
          next: 'move_sprite',
        }),
        makeBlock({ id: 'move_sprite', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'wait' }),
        makeBlock({ id: 'wait', opcode: 'control_wait', inputs: { DURATION: { name: 'DURATION', value: 0.05 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite1',
        variables: {
          'x_var': { id: 'x_var', name: 'x', value: 0 },
        },
        scripts: [makeScript('event_whenflagclicked', blocks)]
      });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      runtime.stepOnce();

      runtime.stepOnce();
      expect(runtime.activeThreads[0].status).toBe('YIELDED');

      runtime.stepOnce();
      expect(sprite.x).toBe(2);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      runtime.stepOnce();

      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should support nested until loops without stack collisions or state pollution', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop1' }),
        makeBlock({
          id: 'loop1',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq_x' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move_x' },
          },
        }),
        makeBlock({ id: 'eq_x', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_x' }, OPERAND2: { name: 'OPERAND2', value: 2 } } }),
        makeBlock({ id: 'get_x', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } } }),
        makeBlock({
          id: 'move_x',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } },
          inputs: { VALUE: { name: 'VALUE', value: 1 } },
          next: 'move_x_sprite',
        }),
        makeBlock({ id: 'move_x_sprite', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'loop2' }),
        makeBlock({
          id: 'loop2',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq_y' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move_y' },
          },
        }),
        makeBlock({ id: 'eq_y', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_y' }, OPERAND2: { name: 'OPERAND2', value: 20 } } }),
        makeBlock({ id: 'get_y', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'y' } } }),
        makeBlock({
          id: 'move_y',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'y' } },
          inputs: { VALUE: { name: 'VALUE', value: 10 } },
          next: 'move_y_sprite',
        }),
        makeBlock({ id: 'move_y_sprite', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 10 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite1',
        variables: {
          'x_var': { id: 'x_var', name: 'x', value: 0 },
          'y_var': { id: 'y_var', name: 'y', value: 0 },
        },
        scripts: [makeScript('event_whenflagclicked', blocks)]
      });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(sprite.y).toBe(10);

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(sprite.y).toBe(20);

      runtime.stepOnce();
      expect(sprite.x).toBe(2);
      expect(sprite.y).toBe(20);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should integrate until loops with broadcast triggers executing concurrently', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'play' } },
          next: 'loop',
        }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
        }),
        makeBlock({ id: 'eq', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_x' }, OPERAND2: { name: 'OPERAND2', value: 1 } } }),
        makeBlock({ id: 'get_x', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } } }),
        makeBlock({
          id: 'move',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } },
          inputs: { VALUE: { name: 'VALUE', value: 1 } },
          next: 'move_sprite',
        }),
        makeBlock({ id: 'move_sprite', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite1',
        variables: {
          'x_var': { id: 'x_var', name: 'x', value: 0 },
        },
        scripts: [makeScript('event_whenbroadcastreceived', blocks)]
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.triggerBroadcast('play');

      runtime.stepOnce();
      expect(sprite.x).toBe(1);

      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should evaluate malformed/missing conditions safely via coercion rules', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'stop' }),
        makeBlock({ id: 'stop', opcode: 'control_stop', fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should exit immediately without stepping substack if condition is truthy initially', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: true },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
          next: 'move_after',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } }),
        makeBlock({ id: 'move_after', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 50 } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(0);
      expect(sprite.y).toBe(50);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should terminate until loops cleanly using stop semantics', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: false },
            SUBSTACK: { name: 'SUBSTACK', value: 'move' },
          },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'stop' }),
        makeBlock({ id: 'stop', opcode: 'control_stop', fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } } }),
      ];

      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should support deterministic per-iteration yielding behavior in until loops', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop1' }),
        makeBlock({
          id: 'loop1',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq1' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move1' },
          },
        }),
        makeBlock({ id: 'eq1', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_x' }, OPERAND2: { name: 'OPERAND2', value: 20 } } }),
        makeBlock({ id: 'get_x', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } } }),
        makeBlock({
          id: 'move1',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'x' } },
          inputs: { VALUE: { name: 'VALUE', value: 10 } },
          next: 'move1_sprite',
        }),
        makeBlock({ id: 'move1_sprite', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'loop2' }),
        makeBlock({
          id: 'loop2',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'eq2' },
            SUBSTACK: { name: 'SUBSTACK', value: 'move2' },
          },
        }),
        makeBlock({ id: 'eq2', opcode: 'operator_equals', inputs: { OPERAND1: { name: 'OPERAND1', value: 'get_y' }, OPERAND2: { name: 'OPERAND2', value: 200 } } }),
        makeBlock({ id: 'get_y', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'y' } } }),
        makeBlock({
          id: 'move2',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'y' } },
          inputs: { VALUE: { name: 'VALUE', value: 100 } },
          next: 'move2_sprite',
        }),
        makeBlock({ id: 'move2_sprite', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 100 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite1',
        variables: {
          'x_var': { id: 'x_var', name: 'x', value: 0 },
          'y_var': { id: 'y_var', name: 'y', value: 0 },
        },
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();

      runtime.stepOnce();
      expect(sprite.x).toBe(10);
      expect(sprite.y).toBe(100);

      runtime.stepOnce();
      expect(sprite.x).toBe(20);
      expect(sprite.y).toBe(200);

      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });
  });

  describe('Phase 6D.5 - Opcode Dispatch Table + Runtime Error Isolation', () => {
    it('should isolate unknown statement opcodes, log a warning, and skip them safely', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'unknown' }),
        makeBlock({ id: 'unknown', opcode: 'motion_unknown_opcode', next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();
        
        // Should skip the unknown block, execute the move block, and complete
        expect(sprite.x).toBe(10);
        expect(runtime.activeThreads).toHaveLength(0);
        expect(warnings.some(w => w.includes('Unknown statement opcode'))).toBe(true);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should gracefully handle variable statement blocks with malformed or missing fields', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'set_bad' }),
        makeBlock({ id: 'set_bad', opcode: 'data_setvariableto', fields: {}, inputs: { VALUE: { name: 'VALUE', value: 5 } }, next: 'change_bad' }),
        makeBlock({ id: 'change_bad', opcode: 'data_changevariableby', fields: {}, inputs: { VALUE: { name: 'VALUE', value: 5 } } }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();
        
        expect(runtime.activeThreads).toHaveLength(0);
        expect(warnings.some(w => w.includes('Missing VARIABLE field'))).toBe(true);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should isolate exceptions thrown inside opcode handlers, log a warning, and terminate the thread cleanly', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'crash_block' }),
        makeBlock({ id: 'crash_block', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      const interpreter = runtime.interpreter as any;
      const originalHandler = interpreter.statementHandlers['motion_movesteps'];
      interpreter.statementHandlers['motion_movesteps'] = () => {
        throw new Error('Intentional crash');
      };

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();

        // Thread should have crashed safely, status should be DONE/killed, x position unchanged
        expect(sprite.x).toBe(0);
        expect(runtime.activeThreads).toHaveLength(0);
        expect(warnings.some(w => w.includes('Error executing statement block') && w.includes('Intentional crash'))).toBe(true);
      } finally {
        interpreter.statementHandlers['motion_movesteps'] = originalHandler;
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should survive execution crashes in one thread while allowing other sibling threads to run concurrently', () => {
      const badBlocks = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'crash_block' }),
        makeBlock({ id: 'crash_block', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const goodBlocks = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'move_block' }),
        makeBlock({ id: 'move_block', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 50 } } }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', badBlocks),
          makeScript('event_whenflagclicked', goodBlocks),
        ],
      });
      runtime.addTarget(sprite);

      const interpreter = runtime.interpreter as any;
      const originalHandler = interpreter.statementHandlers['motion_movesteps'];
      interpreter.statementHandlers['motion_movesteps'] = () => {
        throw new Error('Intentional crash');
      };

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();

        // Sibling thread executed move block successfully
        expect(sprite.x).toBe(50);
        expect(runtime.activeThreads).toHaveLength(0);
        expect(warnings.some(w => w.includes('Intentional crash'))).toBe(true);
      } finally {
        interpreter.statementHandlers['motion_movesteps'] = originalHandler;
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should safely sweep completed and crashed threads from activeThreads during Phase 3 of tick()', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'crash_block' }),
        makeBlock({ id: 'crash_block', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      const interpreter = runtime.interpreter as any;
      const originalHandler = interpreter.statementHandlers['motion_movesteps'];
      interpreter.statementHandlers['motion_movesteps'] = () => {
        throw new Error('Intentional crash');
      };

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        
        // Call stepOnce/tick
        runtime.stepOnce();
        
        // Crashed thread was swept cleanly
        expect(runtime.activeThreads).toHaveLength(0);
      } finally {
        interpreter.statementHandlers['motion_movesteps'] = originalHandler;
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should preserve waiting threads countdown even when a concurrent thread crashes', () => {
      const waitBlocks = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'wait' }),
        makeBlock({ id: 'wait', opcode: 'control_wait', inputs: { DURATION: { name: 'DURATION', value: 0.05 } }, next: 'move_wait' }),
        makeBlock({ id: 'move_wait', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 100 } } }),
      ];
      const crashBlocks = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'crash_block' }),
        makeBlock({ id: 'crash_block', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', waitBlocks),
          makeScript('event_whenflagclicked', crashBlocks),
        ],
      });
      runtime.addTarget(sprite);

      const interpreter = runtime.interpreter as any;
      const originalHandler = interpreter.statementHandlers['motion_movesteps'];
      interpreter.statementHandlers['motion_movesteps'] = () => {
        throw new Error('Intentional crash');
      };

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        
        // Tick 1: Good thread goes to WAITING, bad thread crashes
        runtime.stepOnce();
        expect(runtime.activeThreads).toHaveLength(1);
        expect(runtime.activeThreads[0].status).toBe('WAITING');
        expect(sprite.x).toBe(0);

        // Tick 2: wait countdown
        runtime.stepOnce();

        // Tick 3: wait countdown finishes, executes move_wait, and completes
        runtime.stepOnce();
        expect(sprite.x).toBe(100);
        expect(runtime.activeThreads).toHaveLength(0);
      } finally {
        interpreter.statementHandlers['motion_movesteps'] = originalHandler;
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should safely handle malformed substacks or condition blocks in forever/until loops without browser freezes', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'until_bad' }),
        makeBlock({
          id: 'until_bad',
          opcode: 'control_until',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'bad_reporter' },
            SUBSTACK: { name: 'SUBSTACK', value: 'missing_substack' },
          },
        }),
        makeBlock({ id: 'bad_reporter', opcode: 'operator_bad_reporter' }),
      ];
      const sprite = makeSprite({ scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        
        // Loop executes safely, logs warnings for missing substack and unknown reporter, and yields once per tick instead of freezing CPU
        runtime.stepOnce();
        expect(runtime.activeThreads).toHaveLength(1);
        expect(runtime.activeThreads[0].status).toBe('YIELDED');
        expect(runtime.activeThreads[0].currentBlockId).toBe('until_bad');
        expect(warnings.some(w => w.includes('Substack block') || w.includes('Unknown reporter opcode'))).toBe(true);

        runtime.stepOnce();
        expect(runtime.activeThreads[0].status).toBe('YIELDED');
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should enforce deterministic sweep cleanup order for concurrent active thread registry', () => {
      // 3 concurrent threads: thread 1 finishes cleanly, thread 2 crashes, thread 3 is stopped
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'move1' }),
        makeBlock({ id: 'move1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true, next: 'crash' }),
        makeBlock({ id: 'crash', opcode: 'motion_movesteps' }),
      ];
      const blocks3 = [
        makeBlock({ id: 'hat3', opcode: 'event_whenflagclicked', topLevel: true, next: 'stop' }),
        makeBlock({ id: 'stop', opcode: 'control_stop', fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } } }),
      ];

      const sprite = makeSprite({
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whenflagclicked', blocks2),
          makeScript('event_whenflagclicked', blocks3),
        ],
      });
      runtime.addTarget(sprite);

      const interpreter = runtime.interpreter as any;
      const originalHandler = interpreter.statementHandlers['motion_movesteps'];
      interpreter.statementHandlers['motion_movesteps'] = () => {
        throw new Error('Intentional crash');
      };

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();

        // All 3 threads completed/crashed/stopped and swept cleanly in Phase 3
        expect(runtime.activeThreads).toHaveLength(0);
        expect(sprite.x).toBe(1);
      } finally {
        interpreter.statementHandlers['motion_movesteps'] = originalHandler;
        console.warn = originalWarn;
        runtime.stop();
      }
    });
  });

  describe('Phase 6E - Clone & Dynamic Target Foundation', () => {
    it('should spawn a synchronous clone with independent variable states via createCloneOf', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        variables: {
          'health_id': { id: 'health_id', name: 'health', value: 100 },
        },
        scripts: [makeScript('event_whenflagclicked', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.createCloneOf('sprite_root');

      const targets = runtime.getTargets();
      // Should have root target + clone target
      expect(targets).toHaveLength(2);
      
      const clone = targets.find(t => t.id !== 'sprite_root')!;
      expect(clone.isClone).toBe(true);
      expect(clone.parentTargetId).toBe('sprite_root');
      expect(clone.runtimeGenerated).toBe(true);
      expect(clone.variables['health_id'].value).toBe(100);

      // Mutate clone variable and verify root variable remains independent (explicit copy boundary)
      clone.variables['health_id'].value = 80;
      expect(sprite.variables['health_id'].value).toBe(100);

      runtime.stop();
    });

    it('should enqueue and execute clone-start triggers event_whencloned deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();
      
      // Spawn clone
      runtime.createCloneOf('sprite_root');

      // In tick 1: clone event task enqueued in trigger, promoted to activeThreads, executes and completes
      runtime.stepOnce();

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')! as SpriteState;
      expect(clone.x).toBe(10);
      expect(sprite.x).toBe(0); // root stays 0

      runtime.stop();
    });

    it('should support deterministic clone ordering when multiple clones are created', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'change_var' }),
        makeBlock({
          id: 'change_var',
          opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'index' } },
          inputs: { VALUE: { name: 'VALUE', value: 1 } },
        }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        variables: {
          'idx_var': { id: 'idx_var', name: 'index', value: 0 },
        },
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();

      // Create two clones
      runtime.createCloneOf('sprite_root'); // clone 1
      runtime.createCloneOf('sprite_root'); // clone 2

      // Both clones start execution in creation FIFO order
      runtime.stepOnce();

      const targets = runtime.getTargets();
      const clone1 = targets.find(t => t.id === 'sprite_root_clone_0')! as SpriteState;
      const clone2 = targets.find(t => t.id === 'sprite_root_clone_1')! as SpriteState;

      expect(clone1.x).toBe(1);
      expect(clone1.variables['idx_var'].value).toBe(1);
      
      expect(clone2.x).toBe(1);
      expect(clone2.variables['idx_var'].value).toBe(1);

      runtime.stop();
    });

    it('should propagate broadcast messages to reach dynamic clones concurrently', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
          next: 'move',
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 50 } } }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whenbroadcastreceived', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.createCloneOf('sprite_root');

      runtime.start();
      runtime.triggerBroadcast('go');

      // Both root and clone execute broadcast concurrently
      runtime.stepOnce();

      const targets = runtime.getTargets();
      const root = targets.find(t => t.id === 'sprite_root')! as SpriteState;
      const clone = targets.find(t => t.id !== 'sprite_root')! as SpriteState;

      expect(root.x).toBe(50);
      expect(clone.x).toBe(50);

      runtime.stop();
    });

    it('should terminate and dispose clone threads and target completely upon control_delete_this_clone', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } }, next: 'delete' }),
        makeBlock({ id: 'delete', opcode: 'control_delete_this_clone' }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      // Tick 1: Spawn thread, executes move, executes delete, marks thread DONE + isKilled, swept in Phase 3
      runtime.stepOnce();

      expect(runtime.getTargets()).toHaveLength(1); // Only root remains
      expect(runtime.activeThreads).toHaveLength(0); // Thread is swept cleanly

      runtime.stop();
    });

    it('should protect root targets from deletion and log warning only', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'delete' }),
        makeBlock({ id: 'delete', opcode: 'control_delete_this_clone' }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whenflagclicked', blocks)],
      });
      runtime.addTarget(sprite);

      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();
        runtime.stepOnce();

        // Root is NOT deleted
        expect(runtime.getTargets()).toHaveLength(1);
        expect(warnings.some(w => w.includes('Deleting root target') && w.includes('protected'))).toBe(true);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should support deterministic waits inside dynamic clone scripts', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 5 } }, next: 'wait' }),
        makeBlock({ id: 'wait', opcode: 'control_wait', inputs: { DURATION: { name: 'DURATION', value: 0.05 } }, next: 'move2' }),
        makeBlock({ id: 'move2', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 100 } } }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      // Tick 1: executes move (x=5), sets status WAITING
      runtime.stepOnce();
      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')! as SpriteState;
      expect(clone.x).toBe(5);
      expect(clone.y).toBe(0);
      expect(runtime.activeThreads[0].status).toBe('WAITING');

      // Tick 2: wait decrement
      runtime.stepOnce();

      // Tick 3: wait finishes, executes move2 (y=100), thread DONE, swept
      runtime.stepOnce();
      expect(clone.y).toBe(100);
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should terminate active forever loops cleanly when a clone is deleted', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'loop' }),
        makeBlock({
          id: 'loop',
          opcode: 'control_forever',
          inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      // Tick 1: loop starts running
      runtime.stepOnce();
      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')! as SpriteState;
      expect(clone.x).toBe(1);
      expect(runtime.activeThreads).toHaveLength(1);

      // Tick 2: loop continues
      runtime.stepOnce();
      expect(clone.x).toBe(2);

      // Now delete the clone manually
      runtime.deleteClone(clone.id);

      // Sibling clone is immediately removed
      expect(runtime.getTargets()).toHaveLength(1);

      // Sibling clone threads are swept cleanly in stepOnce
      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should support spawning nested clones recursively from inside clone execution stacks', () => {
      // Script: when flag clicked -> create clone. when cloned -> change x by 1, create clone (only once to avoid recursion)
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'clone1' }),
        makeBlock({ id: 'clone1', opcode: 'control_create_clone_of', inputs: { CLONE_OPTION: { name: 'CLONE_OPTION', value: '_myself' } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whencloned', topLevel: true, next: 'cond' }),
        makeBlock({
          id: 'cond',
          opcode: 'control_if',
          inputs: {
            CONDITION: { name: 'CONDITION', value: 'not_root_clone' },
            SUBSTACK: { name: 'SUBSTACK', value: 'nested_clone' },
          },
        }),
        makeBlock({
          id: 'not_root_clone',
          opcode: 'operator_equals',
          inputs: {
            OPERAND1: { name: 'OPERAND1', value: 'get_name' },
            OPERAND2: { name: 'OPERAND2', value: 'sprite_root Clone' },
          },
        }),
        makeBlock({ id: 'get_name', opcode: 'variable_get', fields: { VARIABLE: { name: 'VARIABLE', value: 'myname' } } }),
        makeBlock({ id: 'nested_clone', opcode: 'control_create_clone_of', inputs: { CLONE_OPTION: { name: 'CLONE_OPTION', value: '_myself' } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite_root',
        variables: {
          'name_var': { id: 'name_var', name: 'myname', value: 'sprite_root' },
        },
        scripts: [
          makeScript('event_whenflagclicked', blocks1),
          makeScript('event_whencloned', blocks2),
        ],
      });
      // Override names in construction
      sprite.variables['name_var'].value = 'sprite_root';
      runtime.addTarget(sprite);

      runtime.start();
      
      // Tick 1: Runs flag script -> spawns clone 1 ("sprite_root Clone")
      runtime.stepOnce();
      expect(runtime.getTargets()).toHaveLength(2);

      // Mutate clone 1 variable myname to "sprite_root Clone" so it triggers the nested clone condition
      const clone1 = runtime.getTargets().find(t => t.id !== 'sprite_root')!;
      clone1.variables['name_var'].value = 'sprite_root Clone';

      // Tick 2: Promotes clone 1 trigger stack -> condition true -> executes nested clone -> spawns clone 2 ("sprite_root Clone Clone")
      runtime.stepOnce();
      expect(runtime.getTargets()).toHaveLength(3);

      runtime.stop();
    });

    it('should sweep all threads associated with a clone target cleanly avoiding orphan threads', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whencloned', topLevel: true, next: 'loop1' }),
        makeBlock({ id: 'loop1', opcode: 'control_forever', inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move1' } } }),
        makeBlock({ id: 'move1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whencloned', topLevel: true, next: 'loop2' }),
        makeBlock({ id: 'loop2', opcode: 'control_forever', inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'move2' } } }),
        makeBlock({ id: 'move2', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: 10 } } }),
      ];

      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [
          makeScript('event_whencloned', blocks1),
          makeScript('event_whencloned', blocks2),
        ],
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      // Tick 1: Both threads starts running on clone
      runtime.stepOnce();
      const clone = runtime.getTargets().find(t => t.id !== 'sprite_root')!;
      expect(runtime.activeThreads).toHaveLength(2);

      // Delete the clone
      runtime.deleteClone(clone.id);

      // Sibling clone threads are swept concurrently in tick step
      runtime.stepOnce();
      expect(runtime.activeThreads).toHaveLength(0);

      runtime.stop();
    });

    it('should gracefully handle malformed target clones and log isolated warnings', () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (msg) => { warnings.push(msg as string); };

      try {
        runtime.start();

        // 1. Spawning from non-existent target ID
        runtime.createCloneOf('nonexistent_root');
        expect(warnings.some(w => w.includes('Invalid clone source') && w.includes('nonexistent_root'))).toBe(true);

        // 2. Deleting non-existent target ID
        runtime.deleteClone('nonexistent_clone');
        expect(warnings.some(w => w.includes('Malformed clone target') && w.includes('nonexistent_clone'))).toBe(true);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('should unregister and clean O(1) block registries completely after clone deletion', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whencloned', topLevel: true, next: 'delete' }),
        makeBlock({ id: 'delete', opcode: 'control_delete_this_clone' }),
      ];
      const sprite = makeSprite({
        id: 'sprite_root',
        scripts: [makeScript('event_whencloned', blocks)],
      });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')!;
      
      // Verify block registry is populated
      const interpreter = runtime.interpreter as any;
      expect(interpreter.blockRegistries.has(clone.id)).toBe(true);

      // Execute delete
      runtime.stepOnce();

      // Verify block registry is completely deleted (no memory leaks)
      expect(interpreter.blockRegistries.has(clone.id)).toBe(false);

      runtime.stop();
    });
  });

  describe('Phase 6F — Event System & Broadcast Scheduler Stabilization', () => {
    let runtime: BaseRuntime;

    beforeEach(async () => {
      runtime = new BaseRuntime();
      await runtime.initialize();
      resetThreadCounter();
    });

    it('1. should maintain deterministic broadcast ordering (target insertion -> script index)', () => {
      const orders: string[] = [];
      const interpreter = runtime.interpreter as any;

      const originalStep = interpreter.stepThread.bind(interpreter);
      interpreter.stepThread = (thread: any) => {
        orders.push(thread.targetId);
        originalStep(thread);
      };

      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', [
        makeBlock({ id: 'hat1', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } } }),
        makeBlock({ id: 'act1', opcode: 'motion_gotoxy', inputs: { X: { name: 'X', value: 10 }, Y: { name: 'Y', value: 10 } } })
      ])] });

      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } } }),
        makeBlock({ id: 'act2', opcode: 'motion_gotoxy', inputs: { X: { name: 'X', value: 20 }, Y: { name: 'Y', value: 20 } } })
      ])] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();
      runtime.triggerBroadcast('go');
      runtime.stepOnce();

      expect(orders).toEqual(['s1', 's2']);
      runtime.stop();
    });

    it('2. should execute event_broadcast statement block from within script', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'bcast' }),
        makeBlock({ id: 'bcast', opcode: 'event_broadcast', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'hello' } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', topLevel: true, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'hello' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 99 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();
      runtime.stepOnce();
      expect(s2.x).toBe(0);

      runtime.stepOnce();
      expect(s2.x).toBe(99);
      runtime.stop();
    });

    it('3. should block and resume caller in event_broadcast_and_wait lifecycle', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'bcast_wait' }),
        makeBlock({ id: 'bcast_wait', opcode: 'event_broadcastandwait', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'work' } }, next: 'after' }),
        makeBlock({ id: 'after', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 100 } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', topLevel: true, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'work' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 200 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();

      runtime.stepOnce();
      expect(runtime.activeThreads[0]?.status).toBe('BLOCKED');
      expect(s2.y).toBe(0);

      runtime.stepOnce();
      expect(s2.y).toBe(200);

      runtime.stepOnce();
      expect(s1.x).toBe(100);

      runtime.stop();
    });

    it('4. should handle nested broadcasts in correct chronological sequence', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'ping' } }, next: 'bcast' }),
        makeBlock({ id: 'bcast', opcode: 'event_broadcast', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'pong' } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'pong' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 55 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();
      runtime.triggerBroadcast('ping');

      runtime.stepOnce();
      expect(s2.x).toBe(0);

      runtime.stepOnce();
      expect(s2.x).toBe(55);

      runtime.stop();
    });

    it('5. should trigger recursive broadcast overflow protection and defer remaining', () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
      };

      try {
        const blocks1 = [
          makeBlock({ id: 'hat1', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'ping' } }, next: 'bcast' }),
          makeBlock({ id: 'bcast', opcode: 'event_broadcast', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'pong' } } })
        ];
        const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks1)] });

        const blocks2 = [
          makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'pong' } }, next: 'bcast2' }),
          makeBlock({ id: 'bcast2', opcode: 'event_broadcast', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'ping' } } })
        ];
        const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

        runtime.addTarget(s1);
        runtime.addTarget(s2);

        runtime.start();

        for (let i = 0; i < 400; i++) {
          runtime.triggerBroadcast('ping');
        }

        runtime.stepOnce();
        expect(warnings.some(w => w.includes('Broadcast limit of 300 exceeded'))).toBe(true);
        expect(runtime.pendingBroadcasts.length).toBeGreaterThan(0);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('6. should propagate broadcasts to clones deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'hi' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 10 } } })
      ];
      const sprite = makeSprite({ id: 'sprite_root', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      runtime.stepOnce();

      runtime.triggerBroadcast('hi');
      runtime.stepOnce();

      const targets = runtime.getTargets();
      for (const t of targets) {
        expect((t as SpriteState).x).toBe(10);
      }

      runtime.stop();
    });

    it('7. should respect waits inside a broadcast listener during broadcast_and_wait', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'bcast_wait' }),
        makeBlock({ id: 'bcast_wait', opcode: 'event_broadcastandwait', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'go' } }, next: 'after' }),
        makeBlock({ id: 'after', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 77 } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', topLevel: true, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } }, next: 'wait' }),
        makeBlock({ id: 'wait', opcode: 'control_wait', inputs: { DURATION: { name: 'DURATION', value: 0.1 } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 88 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();

      runtime.stepOnce();
      expect(runtime.activeThreads[0]?.status).toBe('BLOCKED');

      runtime.stepOnce();
      const s2Thread = runtime.activeThreads.find(t => t.targetId === 's2')!;
      expect(s2Thread.status).toBe('WAITING');
      expect(s1.x).toBe(0);

      for (let i = 0; i < 4; i++) {
        runtime.stepOnce();
      }

      expect(s2.y).toBe(88);
      expect(s1.x).toBe(77);

      runtime.stop();
    });

    it('8. should resume broadcast_and_wait caller if listener contains forever loop but gets killed', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'bcast_wait' }),
        makeBlock({ id: 'bcast_wait', opcode: 'event_broadcastandwait', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'loop' } }, next: 'after' }),
        makeBlock({ id: 'after', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 12 } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', topLevel: true, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'loop' } }, next: 'forever' }),
        makeBlock({ id: 'forever', opcode: 'control_forever', inputs: { SUBSTACK: { name: 'SUBSTACK', value: 'act' } } }),
        makeBlock({ id: 'act', opcode: 'motion_changeyby', inputs: { DX: { name: 'DX', value: 1 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();
      runtime.stepOnce();
      runtime.stepOnce();

      const s2Thread = runtime.activeThreads.find(t => t.targetId === 's2')!;
      expect(s2Thread.status).toBe('YIELDED');
      expect(s1.x).toBe(0);

      s2Thread.status = 'DONE';
      s2Thread.isKilled = true;

      runtime.stepOnce();
      expect(s1.x).toBe(12);

      runtime.stop();
    });

    it('9. should log warning and ignore malformed broadcast listeners', () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
      };

      try {
        const blocks = [
          makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true })
        ];
        const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
        runtime.addTarget(s1);

        expect(warnings.some(w => w.includes('Malformed listener') && w.includes('missing BROADCAST_OPTION'))).toBe(true);
      } finally {
        console.warn = originalWarn;
        runtime.stop();
      }
    });

    it('10. should remove clone from listenerRegistry when deleted to prevent leaks', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'leak' } } })
      ];
      const sprite = makeSprite({ id: 'sprite_root', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')!;

      const registryKey = 'leak';
      let entries = runtime.listenerRegistry.get(registryKey) ?? [];
      expect(entries.some(e => e.targetId === clone.id)).toBe(true);

      runtime.deleteClone(clone.id);

      entries = runtime.listenerRegistry.get(registryKey) ?? [];
      expect(entries.some(e => e.targetId === clone.id)).toBe(false);

      runtime.stop();
    });

    it('11. should ignore orphan queued tasks safely when clone is deleted', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 99 } } })
      ];
      const sprite = makeSprite({ id: 'sprite_root', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');

      runtime.stepOnce();

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'sprite_root')!;

      // Manually enqueue task to taskQueue to simulate orphan queued tasks
      runtime.taskQueue.enqueue({
        targetId: clone.id,
        scriptIndex: 0,
        trigger: 'go'
      });

      // Now delete clone immediately before the task is promoted in the next tick
      runtime.deleteClone(clone.id);

      expect(runtime.taskQueue.isEmpty()).toBe(false);

      runtime.stepOnce();
      expect(runtime.activeThreads.some(t => t.targetId === clone.id)).toBe(false);

      runtime.stop();
    });

    it('12. should execute multiple same-tick broadcasts in FIFO promotion order', () => {
      const executions: string[] = [];
      const interpreter = runtime.interpreter as any;
      const originalStep = interpreter.stepThread.bind(interpreter);
      interpreter.stepThread = (thread: any) => {
        executions.push(thread.targetId);
        originalStep(thread);
      };

      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', [
        makeBlock({ id: 'hat1', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'first' } } })
      ])] });

      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'second' } } })
      ])] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();

      runtime.triggerBroadcast('first');
      runtime.triggerBroadcast('second');

      runtime.stepOnce();

      expect(executions).toEqual(['s1', 's2']);
      runtime.stop();
    });

    it('13. should execute concurrent clone broadcasts deterministically', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'wave' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 1 } } })
      ];
      const sprite = makeSprite({ id: 'sprite_root', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('sprite_root');
      runtime.createCloneOf('sprite_root');

      runtime.stepOnce();

      runtime.triggerBroadcast('wave');
      runtime.stepOnce();

      const targets = runtime.getTargets();
      for (const t of targets) {
        expect((t as SpriteState).x).toBe(1);
      }

      runtime.stop();
    });

    it('14. should resolve broadcast wait token if a listener thread is killed by restart policy', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'bcast_wait' }),
        makeBlock({ id: 'bcast_wait', opcode: 'event_broadcastandwait', inputs: { BROADCAST_INPUT: { name: 'BROADCAST_INPUT', value: 'go' } }, next: 'after' }),
        makeBlock({ id: 'after', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 45 } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });

      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenbroadcastreceived', topLevel: true, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } }, next: 'wait' }),
        makeBlock({ id: 'wait', opcode: 'control_wait', inputs: { DURATION: { name: 'DURATION', value: 5.0 } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 99 } } })
      ];
      const s2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenbroadcastreceived', blocks2)] });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      runtime.start();
      runtime.stepOnce();
      runtime.stepOnce();

      const s2Thread = runtime.activeThreads.find(t => t.targetId === 's2')!;
      expect(s2Thread.status).toBe('WAITING');

      runtime.triggerBroadcast('go');
      runtime.stepOnce();
      runtime.stepOnce();
      expect(s1.x).toBe(45);

      runtime.stop();
    });

    it('15. should match broadcast names case-insensitively', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'GoTime' } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 10 } } })
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.triggerBroadcast('gotime');
      runtime.stepOnce();

      expect(sprite.x).toBe(10);
      runtime.stop();
    });

    it('16. should preserve broadcast ordering using target snapshot during mid-tick clone mutations', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'wave' } }, next: 'clone' }),
        makeBlock({ id: 'clone', opcode: 'control_create_clone_of', inputs: { CLONE_OPTION: { name: 'CLONE_OPTION', value: '_myself' } } })
      ];
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenbroadcastreceived', blocks1)] });
      runtime.addTarget(s1);

      runtime.start();
      runtime.triggerBroadcast('wave');
      
      expect(() => runtime.stepOnce()).not.toThrow();

      runtime.stop();
    });
  });

  describe('Phase 7A — Runtime ↔ Stage Synchronization Foundation', () => {
    let runtime: BaseRuntime;

    beforeEach(async () => {
      runtime = new BaseRuntime();
      await runtime.initialize();
      resetThreadCounter();
    });

    it('1. should synchronize motion transforms to targets visual states', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'goto' }),
        makeBlock({ id: 'goto', opcode: 'motion_gotoxy', inputs: { X: { name: 'X', value: 12 }, Y: { name: 'Y', value: 34 } } })
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();

      expect(sprite.x).toBe(12);
      expect(sprite.y).toBe(34);
      runtime.stop();
    });

    it('2. should deterministically update positions in StageSyncState snapshots', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'move' }),
        makeBlock({ id: 'move', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } })
      ];
      const sprite = makeSprite({ id: 's1', direction: 90, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();

      const snapshot = runtime.getStageSnapshot();
      const s1Snap = snapshot.find(s => s.targetId === 's1')!;
      expect(s1Snap.x).toBeCloseTo(10);
      expect(s1Snap.y).toBeCloseTo(0);
      runtime.stop();
    });

    it('3a. should synchronize looks_hide state changes', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'hide' }),
        makeBlock({ id: 'hide', opcode: 'looks_hide' })
      ];
      const sprite = makeSprite({ id: 's1', visible: true, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.visible).toBe(false);
      runtime.stop();
    });

    it('3b. should synchronize looks_show state changes', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'show' }),
        makeBlock({ id: 'show', opcode: 'looks_show' })
      ];
      const sprite = makeSprite({ id: 's1', visible: false, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.visible).toBe(true);
      runtime.stop();
    });

    it('4a. should switch costumes deterministically by index', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'costume_idx' }),
        makeBlock({ id: 'costume_idx', opcode: 'looks_switchcostumeto', inputs: { COSTUME: { name: 'COSTUME', value: 1 } } })
      ];
      const costumes = [
        { id: 'c1', name: 'costume1', type: 'costume', assetId: 'a1', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c2', name: 'costume2', type: 'costume', assetId: 'a2', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c3', name: 'costume3', type: 'costume', assetId: 'a3', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 }
      ] as any[];
      const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.currentCostumeIndex).toBe(1);
      runtime.stop();
    });

    it('4b. should switch costumes deterministically by name', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'costume_name' }),
        makeBlock({ id: 'costume_name', opcode: 'looks_switchcostumeto', inputs: { COSTUME: { name: 'COSTUME', value: 'costume3' } } })
      ];
      const costumes = [
        { id: 'c1', name: 'costume1', type: 'costume', assetId: 'a1', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c2', name: 'costume2', type: 'costume', assetId: 'a2', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c3', name: 'costume3', type: 'costume', assetId: 'a3', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 }
      ] as any[];
      const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.currentCostumeIndex).toBe(2);
      runtime.stop();
    });

    it('5a. should increment costume index via looks_nextcostume', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'next1' }),
        makeBlock({ id: 'next1', opcode: 'looks_nextcostume' })
      ];
      const costumes = [
        { id: 'c1', name: 'costume1', type: 'costume', assetId: 'a1', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c2', name: 'costume2', type: 'costume', assetId: 'a2', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 }
      ] as any[];
      const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.currentCostumeIndex).toBe(1);
      runtime.stop();
    });

    it('5b. should wrap costume switching index modulo costumes length', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'next1' }),
        makeBlock({ id: 'next1', opcode: 'looks_nextcostume', next: 'next2' }),
        makeBlock({ id: 'next2', opcode: 'looks_nextcostume' })
      ];
      const costumes = [
        { id: 'c1', name: 'costume1', type: 'costume', assetId: 'a1', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 },
        { id: 'c2', name: 'costume2', type: 'costume', assetId: 'a2', assetUrl: '', dataFormat: 'png', rotationCenterX: 0, rotationCenterY: 0 }
      ] as any[];
      const sprite = makeSprite({ id: 's1', costumes, currentCostumeIndex: 0, scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      expect(sprite.currentCostumeIndex).toBe(0);
      runtime.stop();
    });

    it('6. should shift layer order front correctly', () => {
      const stage = makeSprite({ id: 'stage', isStage: true } as any);
      const s1 = makeSprite({ id: 's1' });
      const s2 = makeSprite({ id: 's2' });
      const s3 = makeSprite({ id: 's3' });

      // Stage is always at index 0, Sprites follow
      runtime.addTarget(stage);
      runtime.addTarget(s1);
      runtime.addTarget(s2);
      runtime.addTarget(s3);

      expect(runtime.layerOrderList).toEqual(['stage', 's1', 's2', 's3']);
    });

    it('7. should respect front/back layering operation logic', () => {
      const stage = makeSprite({ id: 'stage', isStage: true } as any);
      const s1 = makeSprite({ id: 's1' });
      const s2 = makeSprite({ id: 's2' });
      const s3 = makeSprite({ id: 's3', scripts: [makeScript('event_whenflagclicked', [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'goto' }),
        makeBlock({ id: 'goto', opcode: 'looks_gotofrontback', fields: { FRONT_BACK: { name: 'FRONT_BACK', value: 'back' } } })
      ])] });

      runtime.addTarget(stage);
      runtime.addTarget(s1);
      runtime.addTarget(s2);
      runtime.addTarget(s3);

      expect(runtime.layerOrderList).toEqual(['stage', 's1', 's2', 's3']);

      runtime.start();
      runtime.stepOnce(); // runs s3 goto back

      // s3 goes to back (index 1 immediately after stage at index 0)
      expect(runtime.layerOrderList).toEqual(['stage', 's3', 's1', 's2']);
      expect(s3.layerOrder).toBe(1);
      expect(s1.layerOrder).toBe(2);

      runtime.stop();
    });

    it('8. should support relative layers shifting (forward/backward)', () => {
      const stage = makeSprite({ id: 'stage', isStage: true } as any);
      const s1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true, next: 'shift' }),
        makeBlock({ id: 'shift', opcode: 'looks_goforwardbackwardlayers', fields: { FORWARD_BACKWARD: { name: 'FORWARD_BACKWARD', value: 'forward' } }, inputs: { NUM: { name: 'NUM', value: 2 } } })
      ])] });
      const s2 = makeSprite({ id: 's2' });
      const s3 = makeSprite({ id: 's3' });

      runtime.addTarget(stage);
      runtime.addTarget(s1);
      runtime.addTarget(s2);
      runtime.addTarget(s3);

      expect(runtime.layerOrderList).toEqual(['stage', 's1', 's2', 's3']);

      runtime.start();
      runtime.stepOnce(); // runs forward 2

      // S1 (index 1) is spliced. remaining: ['stage', 's2', 's3'].
      // new index = Math.min(3, 1 + 2) = 3.
      // S1 inserted at index 3 -> ['stage', 's2', 's3', 's1']!
      expect(runtime.layerOrderList).toEqual(['stage', 's2', 's3', 's1']);
      runtime.stop();
    });

    it('9. should synchronize looks_say bubble creation and overwrite think bubble', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'say' }),
        makeBlock({ id: 'say', opcode: 'looks_say', inputs: { MESSAGE: { name: 'MESSAGE', value: 'hello' } } })
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });
      sprite.thinkBubble = { text: 'hmm' };
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();

      expect(sprite.sayBubble?.text).toBe('hello');
      expect(sprite.thinkBubble).toBeUndefined(); // overwritten
      runtime.stop();
    });

    it('10. should synchronize looks_think bubble creation and overwrite say bubble', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'think' }),
        makeBlock({ id: 'think', opcode: 'looks_think', inputs: { MESSAGE: { name: 'MESSAGE', value: 'what?' } } })
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });
      sprite.sayBubble = { text: 'hello' };
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();

      expect(sprite.thinkBubble?.text).toBe('what?');
      expect(sprite.sayBubble).toBeUndefined(); // overwritten
      runtime.stop();
    });

    it('11. should block caller in looks_sayforsecs WAITING lifecycle and resume', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true, next: 'say_secs' }),
        makeBlock({ id: 'say_secs', opcode: 'looks_sayforsecs', inputs: { MESSAGE: { name: 'MESSAGE', value: 'later' }, SECS: { name: 'SECS', value: 0.1 } }, next: 'act' }),
        makeBlock({ id: 'act', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 12 } } })
      ];
      const sprite = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks)] });
      runtime.addTarget(sprite);

      runtime.start();

      // Step 1: Executes sayforsecs, enters WAITING, bubble is active
      runtime.stepOnce();
      expect(sprite.sayBubble?.text).toBe('later');
      expect(runtime.activeThreads[0]?.status).toBe('WAITING');
      expect(sprite.x).toBe(0);

      // Step until timer expires
      for (let i = 0; i < 4; i++) {
        runtime.stepOnce();
      }

      // Thread has completed, bubble expired, and x became 12
      expect(sprite.sayBubble).toBeUndefined();
      expect(sprite.x).toBe(12);

      runtime.stop();
    });

    it('12. should decrement bubble expiration deterministically using tickDurationMs', () => {
      const sprite = makeSprite({ id: 's1' });
      sprite.sayBubble = { text: 'expire', expiresAt: 100 }; // 100ms
      runtime.addTarget(sprite);

      runtime.start();

      // Step once (decrements 33.33ms) -> remaining ~66.66ms
      runtime.stepOnce();
      expect(sprite.sayBubble).toBeDefined();

      // Step twice more -> remaining ~0ms -> cleared
      runtime.stepOnce();
      runtime.stepOnce();
      expect(sprite.sayBubble).toBeUndefined();

      runtime.stop();
    });

    it('13. should copy visual state correctly into new clones', () => {
      const sprite = makeSprite({ id: 'parent', x: 100, y: 200, direction: 45, visible: false });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('parent');

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'parent')! as SpriteState;

      expect(clone.x).toBe(100);
      expect(clone.y).toBe(200);
      expect(clone.direction).toBe(45);
      expect(clone.visible).toBe(false);

      runtime.stop();
    });

    it('14. should keep clone visual states completely independent from parent', () => {
      const sprite = makeSprite({ id: 'parent', x: 0 });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.createCloneOf('parent');

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 'parent')! as SpriteState;

      // Mutate clone x
      clone.x = 55;
      expect(sprite.x).toBe(0); // parent remains unchanged

      runtime.stop();
    });

    it('15. should insert clones right above parent in layerOrderList', () => {
      const s1 = makeSprite({ id: 's1' });
      const s2 = makeSprite({ id: 's2' });

      runtime.addTarget(s1);
      runtime.addTarget(s2);

      expect(runtime.layerOrderList).toEqual(['s1', 's2']);

      runtime.start();
      runtime.createCloneOf('s1'); // clone parent is s1

      const targets = runtime.getTargets();
      const clone = targets.find(t => t.id !== 's1' && t.id !== 's2')!;

      // Clone is inserted immediately above parent s1 (index 0 + 1 = 1) -> ['s1', clone, 's2']!
      expect(runtime.layerOrderList).toEqual(['s1', clone.id, 's2']);
      runtime.stop();
    });

    it('16. should verify StageSyncState snapshot outputs deep copies sorted by layer', () => {
      const s1 = makeSprite({ id: 's1' });
      runtime.addTarget(s1);

      runtime.start();
      const snapshot = runtime.getStageSnapshot();
      expect(snapshot[0].targetId).toBe('s1');

      // Mutate target state directly, verify snapshot was deep cloned and doesn't change
      s1.sayBubble = { text: 'test' };
      expect(snapshot[0].sayBubble).toBeUndefined();

      runtime.stop();
    });
  });
});
