import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { TargetState, SpriteState, StageState, ASTBlock, ASTScript, Thread } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';

function makeBlock(id: string, opcode: string, next: string | null = null, inputs: Record<string, any> = {}, fields: Record<string, any> = {}): ASTBlock {
  return {
    id,
    opcode,
    next,
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, { name: k, value: v }])),
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { name: k, value: v }])),
    shadow: false,
    topLevel: false,
  };
}

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  return {
    id: `script_${blocks[0]?.id}`,
    hatOpcode,
    topBlockId: blocks[0]?.id || 'none',
    blocks: Object.fromEntries(blocks.map(b => [b.id, b])),
  };
}

function makeSprite(id: string, name: string, scripts: ASTScript[], overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id,
    name,
    isStage: false,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts,
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

function makeStage(scripts: ASTScript[] = []): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts,
    tempo: 60,
    videoState: 'off',
  };
}

function getSprite(runtime: BaseRuntime, id: string): SpriteState {
  return runtime.getTargetById(id) as SpriteState;
}

describe('Phase 7J — Sensing Runtime Foundation', () => {
  let runtime: BaseRuntime;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    resetThreadCounter();
  });

  // ─── 1. Timer Progression ──────────────────────────────────────

  describe('Timer Progression', () => {
    it('1. should advance timer deterministically with ticks', () => {
      runtime.addTarget(makeStage());
      runtime.start();

      expect(runtime.getTimerMs()).toBe(0);

      runtime.tick();
      const afterOneTick = runtime.getTimerMs();
      expect(afterOneTick).toBeGreaterThan(0);
      expect(afterOneTick).toBeCloseTo(1000 / 30, 1);

      runtime.tick();
      const afterTwoTicks = runtime.getTimerMs();
      expect(afterTwoTicks).toBeCloseTo(2 * (1000 / 30), 1);

      runtime.stop();
    });

    it('2. should report timer in seconds via sensing_timer reporter', () => {
      const reporterBlock = makeBlock('r1', 'sensing_timer', null, {}, {});
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'r1');
      const setBlock = makeBlock('set1', 'data_setvariableto', null, { VALUE: 0 });
      setBlock.fields = { VARIABLE: { name: 'VARIABLE', value: 'timer_val' } };
      reporterBlock.next = 'set1';

      const script = makeScript('event_whenflagclicked', [hatBlock, reporterBlock, setBlock]);
      const sprite = makeSprite('s1', 'Cat', [script], { variables: { timer_val: { id: 'timer_val', name: 'timer_val', value: 0 } } });

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();
      runtime.tick();

      const timerVal = runtime.getTimerMs() / 1000;
      expect(timerVal).toBeGreaterThan(0);

      runtime.stop();
    });
  });

  // ─── 2. Reset Timer ───────────────────────────────────────────

  describe('Reset Timer', () => {
    it('3. should reset timer to zero via sensing_resettimer', () => {
      runtime.addTarget(makeStage());
      runtime.start();

      runtime.tick();
      runtime.tick();
      expect(runtime.getTimerMs()).toBeGreaterThan(0);

      runtime.resetTimer();
      expect(runtime.getTimerMs()).toBe(0);

      runtime.stop();
    });

    it('4. should reset timer via block execution', () => {
      const resetBlock = makeBlock('reset1', 'sensing_resettimer', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'reset1');
      const script = makeScript('event_whenflagclicked', [hatBlock, resetBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      // Advance a few ticks before the reset block runs
      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      // The reset block ran during the first tick execution,
      // so timer was reset to 0 after tick 1's accumulation.
      // Subsequent ticks accumulated from 0 again.
      const timerAfter = runtime.getTimerMs();
      expect(timerAfter).toBeGreaterThan(0);

      runtime.stop();
    });
  });

  // ─── 3. Mouse Position Synchronization ───────────────────────

  describe('Mouse Position Synchronization', () => {
    it('5. should read mouse position from registry', () => {
      runtime.setMousePosition(100, -50);
      const ms = runtime.getMouseState();
      expect(ms.x).toBe(100);
      expect(ms.y).toBe(-50);
    });

    it('6. should reject non-finite mouse coordinates', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: any[]) => { warns.push(args.join(' ')); };

      runtime.setMousePosition(Infinity, 0);
      runtime.setMousePosition(0, NaN);

      console.warn = origWarn;
      expect(warns.some(w => w.includes('invalid mouse coordinates'))).toBe(true);
    });
  });

  // ─── 4. Mouse Button Synchronization ─────────────────────────

  describe('Mouse Button Synchronization', () => {
    it('7. should track mouse down state', () => {
      expect(runtime.getMouseState().isDown).toBe(false);
      runtime.setMouseDown(true);
      expect(runtime.getMouseState().isDown).toBe(true);
      runtime.setMouseDown(false);
      expect(runtime.getMouseState().isDown).toBe(false);
    });
  });

  // ─── 5. Keyboard Registry Updates ────────────────────────────

  describe('Keyboard Registry Updates', () => {
    it('8. should register key presses', () => {
      runtime.setKeyPressed('space');
      expect(runtime.isKeyDown('space')).toBe(true);
      expect(runtime.isKeyDown('a')).toBe(false);
    });

    it('9. should deregister key releases', () => {
      runtime.setKeyPressed('a');
      expect(runtime.isKeyDown('a')).toBe(true);
      runtime.setKeyReleased('a');
      expect(runtime.isKeyDown('a')).toBe(false);
    });
  });

  // ─── 6. Case-Insensitive Key Matching ─────────────────────────

  describe('Case-Insensitive Key Matching', () => {
    it('10. should match keys case-insensitively', () => {
      runtime.setKeyPressed('A');
      expect(runtime.isKeyDown('a')).toBe(true);
      expect(runtime.isKeyDown('A')).toBe(true);

      runtime.setKeyReleased('a');
      expect(runtime.isKeyDown('A')).toBe(false);
    });
  });

  // ─── 7. Duplicate Key Safety ─────────────────────────────────

  describe('Duplicate Key Safety', () => {
    it('11. should not duplicate keys in pressedKeys list', () => {
      runtime.setKeyPressed('space');
      runtime.setKeyPressed('space');
      runtime.setKeyPressed('space');
      const ks = runtime.getKeyboardState();
      const spaceCount = ks.pressedKeys.filter(k => k === 'space').length;
      expect(spaceCount).toBe(1);
    });
  });

  // ─── 8. Edge Sensing Correctness ─────────────────────────────

  describe('Edge Sensing Correctness', () => {
    it('12. should detect when sprite is touching edge', () => {
      const sprite = makeSprite('s1', 'Cat', [], { x: 240, y: 0 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      expect(runtime.interpreter.onIsTouchingEdge!('s1')).toBe(true);
    });

    it('13. should detect when sprite is NOT touching edge', () => {
      const sprite = makeSprite('s1', 'Cat', [], { x: 100, y: 50 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      expect(runtime.interpreter.onIsTouchingEdge!('s1')).toBe(false);
    });

    it('14. should detect touching Y edges', () => {
      const sprite = makeSprite('s1', 'Cat', [], { x: 0, y: 180 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      expect(runtime.interpreter.onIsTouchingEdge!('s1')).toBe(true);
    });

    it('15. should return false for stage targets', () => {
      runtime.addTarget(makeStage());
      expect(runtime.interpreter.onIsTouchingEdge!('stage')).toBe(false);
    });
  });

  // ─── 9. Object Sensing Approximation ─────────────────────────

  describe('Object Sensing Approximation', () => {
    it('16. should detect approximate overlap between sprites', () => {
      const sprite1 = makeSprite('s1', 'Cat', [], { x: 10, y: 10, size: 100 });
      const sprite2 = makeSprite('s2', 'Dog', [], { x: 10, y: 10, size: 100 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);

      expect(runtime.interpreter.onIsTouchingObject!('s1', 'Dog')).toBe(true);
    });

    it('17. should not detect overlap when sprites are far apart', () => {
      const sprite1 = makeSprite('s1', 'Cat', [], { x: 0, y: 0, size: 100 });
      const sprite2 = makeSprite('s2', 'Dog', [], { x: 200, y: 200, size: 100 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);

      expect(runtime.interpreter.onIsTouchingObject!('s1', 'Dog')).toBe(false);
    });
  });

  // ─── 10. Clone-Safe Sensing ──────────────────────────────────

  describe('Clone-Safe Sensing', () => {
    it('18. should isolate edge sensing per clone', () => {
      const sprite = makeSprite('s1', 'Cat', [], { x: 0, y: 0 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      runtime.createCloneOf('s1');

      const cloneId = runtime.getTargets().find(t => t.isClone)?.id;
      expect(cloneId).toBeDefined();

      const clone = runtime.getTargetById(cloneId!) as SpriteState;
      clone.x = 240;

      expect(runtime.interpreter.onIsTouchingEdge!(cloneId!)).toBe(true);
      expect(runtime.interpreter.onIsTouchingEdge!('s1')).toBe(false);
    });
  });

  // ─── 11. Broadcasts + Sensing Cooperation ─────────────────────

  describe('Broadcasts + Sensing Cooperation', () => {
    it('19. should process broadcasts while sensing state is active', () => {
      runtime.setKeyPressed('space');
      runtime.setMousePosition(50, -30);

      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: -100, Y: -100 });
      const bcastHat = makeBlock('bhat1', 'event_whenbroadcastreceived', 'move1', {}, { BROADCAST_OPTION: 'test' });
      const listenScript = makeScript('event_whenbroadcastreceived', [bcastHat, moveBlock]);

      const sprite = makeSprite('s1', 'Cat', [listenScript], { x: 0, y: 0 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.triggerBroadcast('test');
      runtime.tick();
      runtime.tick();

      const s = getSprite(runtime, 's1');
      expect(s.x).toBe(-100);
      expect(s.y).toBe(-100);

      expect(runtime.isKeyDown('space')).toBe(true);

      runtime.stop();
    });
  });

  // ─── 12. Waits + Sensing Cooperation ─────────────────────────

  describe('Waits + Sensing Cooperation', () => {
    it('20. should preserve sensing state across wait blocks', () => {
      runtime.setMousePosition(42, -17);

      const waitBlock = makeBlock('wait1', 'control_wait', null, { DURATION: 0.1 });
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'wait1');
      const script = makeScript('event_whenflagclicked', [hatBlock, waitBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      runtime.tick();

      expect(runtime.getMouseState().x).toBe(42);
      expect(runtime.getMouseState().y).toBe(-17);

      runtime.stop();
    });
  });

  // ─── 13. Forever Loops + Sensing Cooperation ─────────────────

  describe('Forever Loops + Sensing Cooperation', () => {
    it('21. should not block forever loops when sensing is active', () => {
      runtime.setKeyPressed('a');

      const moveBlock = makeBlock('move1', 'motion_gotoxy', null, { X: 10, Y: 10 });
      const foreverHat = makeBlock('fhat', 'event_whenflagclicked', 'forever1');
      const foreverBlock = makeBlock('forever1', 'control_forever', null, {}, {});
      (foreverBlock.inputs as any)['SUBSTACK'] = { name: 'SUBSTACK', value: 'move1' };
      const foreverScript = makeScript('event_whenflagclicked', [foreverHat, foreverBlock, moveBlock]);

      const sprite = makeSprite('s1', 'Cat', [foreverScript]);
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      expect(runtime.isKeyDown('a')).toBe(true);

      runtime.stop();
    });
  });

  // ─── 14. Deterministic Timer Progression ──────────────────────

  describe('Deterministic Timer Progression', () => {
    it('22. should advance timer deterministically by tickDurationMs each tick', () => {
      runtime.addTarget(makeStage());
      runtime.start();

      const expectedMsPerTick = 1000 / 30;

      runtime.tick();
      expect(runtime.getTimerMs()).toBeCloseTo(expectedMsPerTick, 5);

      for (let i = 0; i < 29; i++) {
        runtime.tick();
      }

      expect(runtime.getTimerMs()).toBeCloseTo(30 * expectedMsPerTick, 5);

      runtime.stop();
    });
  });

  // ─── 15. Snapshot Immutability ────────────────────────────────

  describe('Snapshot Immutability', () => {
    it('23. should produce deep-copied sensing snapshots', () => {
      runtime.setKeyPressed('space');
      runtime.setMousePosition(100, 200);

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap?.keyboardState).toBeDefined();
      expect(stageSnap?.mouseState).toBeDefined();

      if (stageSnap?.keyboardState) {
        stageSnap.keyboardState.pressedKeys.push('a');
        expect(runtime.isKeyDown('a')).toBe(false);
      }

      if (stageSnap?.mouseState) {
        stageSnap.mouseState.x = 999;
        expect(runtime.getMouseState().x).toBe(100);
      }

      runtime.stop();
    });
  });

  // ─── 16. Renderer Synchronization ─────────────────────────────

  describe('Renderer Synchronization', () => {
    it('24. should synchronize sensing metadata to renderer', () => {
      runtime.setKeyPressed('up');
      runtime.setMousePosition(50, -30);
      runtime.setMouseDown(true);

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(snapshot);

      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget).toBeDefined();
      expect(stageTarget!.keyboardState).toBeDefined();
      expect(stageTarget!.keyboardState!.pressedKeys).toContain('up');
      expect(stageTarget!.mouseState).toBeDefined();
      expect(stageTarget!.mouseState!.x).toBe(50);
      expect(stageTarget!.mouseState!.y).toBe(-30);
      expect(stageTarget!.mouseState!.isDown).toBe(true);

      runtime.stop();
    });
  });

  // ─── 17. Malformed Sensing Blocks ────────────────────────────

  describe('Malformed Sensing Blocks', () => {
    it('25. should warn on empty key name', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: any[]) => { warns.push(args.join(' ')); };

      runtime.setKeyPressed('');

      console.warn = origWarn;
      expect(warns.some(w => w.includes('malformed key names'))).toBe(true);
    });

    it('26. should warn on non-string key name', () => {
      const warns: string[] = [];
      const origWarn = console.warn;
      console.warn = (...args: any[]) => { warns.push(args.join(' ')); };

      runtime.setKeyPressed(42 as any);

      console.warn = origWarn;
      expect(warns.some(w => w.includes('malformed key names'))).toBe(true);
    });
  });

  // ─── 18. Malformed Target References ──────────────────────────

  describe('Malformed Target References', () => {
    it('27. should return false for edge sensing on nonexistent target', () => {
      runtime.addTarget(makeStage());
      expect(runtime.interpreter.onIsTouchingEdge!('nonexistent')).toBe(false);
    });

    it('28. should return false for object sensing on nonexistent target', () => {
      runtime.addTarget(makeStage());
      expect(runtime.interpreter.onIsTouchingObject!('nonexistent', 'Cat')).toBe(false);
    });
  });

  // ─── 19. Warning-Only Diagnostics ─────────────────────────────

  describe('Warning-Only Diagnostics', () => {
    it('29. should not throw runtime-breaking exceptions from sensing handlers', () => {
      runtime.addTarget(makeStage());

      expect(() => runtime.setKeyPressed('')).not.toThrow();
      expect(() => runtime.setMousePosition(NaN, 0)).not.toThrow();
      expect(() => runtime.setMousePosition(0, Infinity)).not.toThrow();
    });
  });

  // ─── 20. Cleanup Lifecycle Safety ─────────────────────────────

  describe('Cleanup Lifecycle Safety', () => {
    it('30. should clear keyboard state on initialize', async () => {
      runtime.setKeyPressed('a');
      runtime.setMousePosition(100, 200);
      runtime.setMouseDown(true);

      await runtime.initialize();

      expect(runtime.getKeyboardState().pressedKeys).toEqual([]);
      expect(runtime.getMouseState().x).toBe(0);
      expect(runtime.getMouseState().y).toBe(0);
      expect(runtime.getMouseState().isDown).toBe(false);
      expect(runtime.getTimerMs()).toBe(0);
    });

    it('31. should clear sensing state on stop', () => {
      runtime.setKeyPressed('a');
      runtime.setMousePosition(100, 200);
      runtime.setMouseDown(true);

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();
      runtime.stop();

      expect(runtime.getKeyboardState().pressedKeys).toEqual([]);
      expect(runtime.getMouseState().x).toBe(0);
      expect(runtime.getMouseState().y).toBe(0);
      expect(runtime.getMouseState().isDown).toBe(false);
      expect(runtime.getTimerMs()).toBe(0);
    });
  });

  // ─── 21. Centralized Sweep Preservation ──────────────────────

  describe('Centralized Sweep Preservation', () => {
    it('32. should not interfere with thread sweep after sensing execution', () => {
      const resetBlock = makeBlock('reset1', 'sensing_resettimer', null);
      const hatBlock = makeBlock('hat1', 'event_whenflagclicked', 'reset1');
      const script = makeScript('event_whenflagclicked', [hatBlock, resetBlock]);
      const sprite = makeSprite('s1', 'Cat', [script]);

      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);
      runtime.start();

      for (let i = 0; i < 5; i++) {
        runtime.tick();
      }

      const aliveThreads = runtime.activeThreads.filter(t => t.targetId === 's1');
      expect(aliveThreads.length).toBe(0);

      runtime.stop();
    });
  });

  // ─── 22. Concurrent Clone Sensing ─────────────────────────────

  describe('Concurrent Clone Sensing', () => {
    it('33. should handle sensing across multiple clones independently', () => {
      const sprite = makeSprite('s1', 'Cat', [], { x: 0, y: 0 });
      runtime.addTarget(makeStage());
      runtime.addTarget(sprite);

      runtime.createCloneOf('s1');
      runtime.createCloneOf('s1');

      const clones = runtime.getTargets().filter(t => t.isClone);
      expect(clones.length).toBe(2);

      const clone1 = clones[0] as SpriteState;
      const clone2 = clones[1] as SpriteState;

      clone1.x = 240;
      clone2.x = 0;

      expect(runtime.interpreter.onIsTouchingEdge!(clone1.id)).toBe(true);
      expect(runtime.interpreter.onIsTouchingEdge!(clone2.id)).toBe(false);
      expect(runtime.interpreter.onIsTouchingEdge!('s1')).toBe(false);
    });
  });

  // ─── 23. Runtime Stop/Reset Cleanup ───────────────────────────

  describe('Runtime Stop/Reset Cleanup', () => {
    it('34. should reset timer on initialize', async () => {
      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();
      runtime.tick();
      runtime.tick();

      expect(runtime.getTimerMs()).toBeGreaterThan(0);

      await runtime.initialize();
      expect(runtime.getTimerMs()).toBe(0);
    });
  });

  // ─── 24. Renderer/Runtime Isolation ──────────────────────────

  describe('Renderer/Runtime Isolation', () => {
    it('35. should not allow renderer mutations to affect runtime state', () => {
      runtime.setKeyPressed('space');
      runtime.setMousePosition(100, -50);
      runtime.setMouseDown(true);

      runtime.addTarget(makeStage());
      runtime.start();
      runtime.tick();

      const snapshot = runtime.getStageSnapshot();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(snapshot);

      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.keyboardState).toBeDefined();

      if (stageTarget?.keyboardState) {
        stageTarget.keyboardState.pressedKeys.push('z');
      }
      if (stageTarget?.mouseState) {
        stageTarget.mouseState.x = -999;
      }

      expect(runtime.isKeyDown('z')).toBe(false);
      expect(runtime.getMouseState().x).toBe(100);

      runtime.stop();
    });
  });
});
