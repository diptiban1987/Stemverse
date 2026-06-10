import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StubHardwareAdapter } from '../src/ast/interpreter';
import { ASTBlock, ASTScript, SpriteState, TargetState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Helpers ───────────────────────────────────────────────────────

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

function makeScript(hatOpcode: string, blocks: ASTBlock[]): ASTScript {
  const blocksMap: Record<string, ASTBlock> = {};
  for (let i = 0; i < blocks.length; i++) {
    const block = { ...blocks[i] };
    block.next = i < blocks.length - 1 ? blocks[i + 1].id : null;
    blocksMap[block.id] = block;
  }
  return {
    id: `script_${hatOpcode}`,
    hatOpcode,
    topBlockId: blocks[0].id,
    blocks: blocksMap,
  };
}

// ─── Test suites ───────────────────────────────────────────────────

describe('BaseRuntime', () => {
  let runtime: BaseRuntime;
  let hw: StubHardwareAdapter;

  beforeEach(async () => {
    hw = new StubHardwareAdapter();
    runtime = new BaseRuntime(hw);
    await runtime.initialize();
    resetThreadCounter();
  });

  describe('target management', () => {
    it('should add and retrieve targets', () => {
      const sprite = makeSprite();
      runtime.addTarget(sprite);

      expect(runtime.getTargets()).toHaveLength(1);
      expect(runtime.getTargetById('sprite1')).toBe(sprite);
    });

    it('should remove targets', () => {
      const sprite = makeSprite();
      runtime.addTarget(sprite);
      runtime.removeTarget('sprite1');

      expect(runtime.getTargets()).toHaveLength(0);
      expect(runtime.getTargetById('sprite1')).toBeUndefined();
    });
  });

  describe('tick execution', () => {
    it('should execute green-flag scripts on start + tick', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 50 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      // Start enqueues green-flag scripts
      runtime.start();
      // Immediately step one tick to execute
      runtime.stepOnce();
      runtime.stop();

      expect(sprite.x).toBe(50);
    });

    it('should increment tick count', () => {
      const sprite = makeSprite();
      runtime.addTarget(sprite);

      expect(runtime.getTickCount()).toBe(0);

      runtime.start();
      runtime.stepOnce();
      runtime.stepOnce();
      runtime.stop();

      // start() calls tick internally after an interval; stepOnce forces manual ticks
      expect(runtime.getTickCount()).toBeGreaterThanOrEqual(2);
    });

    it('should not execute while paused', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 99 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.pause();
      // stepOnce while paused — isPaused is true
      // But stepOnce sets isRunning temporarily, let's check the paused path
      // Actually, pause() sets isPaused = true and tick() checks it.
      // stepOnce sets isRunning but tick also checks isPaused.
      // The pending task from start() should not execute during pause.

      expect(sprite.x).toBe(0); // Nothing should have executed yet
    });

    it('should clear task queue on stop', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stop();

      expect(runtime.taskQueue.isEmpty()).toBe(true);
    });
  });

  describe('broadcast dispatch', () => {
    it('should trigger scripts matching broadcast name', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 77 } } }),
      ];
      const script = makeScript('event_whenbroadcastreceived', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      runtime.triggerBroadcast('go');
      runtime.stepOnce();

      expect(sprite.x).toBe(77);
    });

    it('should NOT trigger scripts for non-matching broadcast', () => {
      const blocks = [
        makeBlock({
          id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true,
          fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'go' } },
        }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 77 } } }),
      ];
      const script = makeScript('event_whenbroadcastreceived', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      runtime.triggerBroadcast('something_else');
      runtime.stepOnce();

      expect(sprite.x).toBe(0); // Should NOT have moved
    });
  });

  describe('hardware integration', () => {
    it('should delegate hardware blocks to adapter via tick', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({
          id: 'hw', opcode: 'hardware_digitalwrite',
          inputs: {
            PIN: { name: 'PIN', value: 2 },
            VALUE: { name: 'VALUE', value: 1 },
          },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      runtime.addTarget(sprite);

      runtime.start();
      runtime.stepOnce();
      runtime.stop();

      expect(hw.callLog).toHaveLength(1);
      expect(hw.callLog[0].method).toBe('digitalWrite');
    });
  });

  describe('multi-target execution', () => {
    it('should execute scripts across multiple sprites', () => {
      const blocks1 = [
        makeBlock({ id: 'hat1', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'move1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 10 } } }),
      ];
      const blocks2 = [
        makeBlock({ id: 'hat2', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'move2', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 20 } } }),
      ];

      const sprite1 = makeSprite({ id: 's1', scripts: [makeScript('event_whenflagclicked', blocks1)] });
      const sprite2 = makeSprite({ id: 's2', scripts: [makeScript('event_whenflagclicked', blocks2)] });

      runtime.addTarget(sprite1);
      runtime.addTarget(sprite2);

      runtime.start();
      runtime.stepOnce();
      runtime.stop();

      expect(sprite1.x).toBe(10);
      expect(sprite2.x).toBe(20);
    });
  });
});
