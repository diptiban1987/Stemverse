import { describe, it, expect, beforeEach } from 'vitest';
import { MinimalASTInterpreter, StubHardwareAdapter } from '../src/ast/interpreter';
import { ASTBlock, ASTScript, SpriteState, Thread, TargetState } from '../src/types';
import { createThread, resetThreadCounter } from '../src/runtime/execution-context';

// ─── Test helpers ──────────────────────────────────────────────────

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
  // Chain blocks via next pointers
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

describe('MinimalASTInterpreter', () => {
  let interpreter: MinimalASTInterpreter;
  let hardwareAdapter: StubHardwareAdapter;

  beforeEach(() => {
    hardwareAdapter = new StubHardwareAdapter();
    interpreter = new MinimalASTInterpreter(hardwareAdapter);
    resetThreadCounter();
  });

  describe('sequential traversal', () => {
    it('should traverse a chain of blocks in order', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'b2', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
        makeBlock({ id: 'b3', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 20 } } }),
      ];

      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      interpreter.traverse(thread, script.topBlockId);

      // Sprite should have moved 10 + 20 = 30 steps in direction 90 (right = +x)
      expect(sprite.x).toBeCloseTo(30, 5);
      expect(sprite.y).toBeCloseTo(0, 5);
    });

    it('should handle an empty script gracefully', () => {
      const sprite = makeSprite();
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'nonexistent');
      // Should not throw
      interpreter.traverse(thread, 'nonexistent');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should stop at end of chain (next = null)', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 42 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      interpreter.traverse(thread, script.topBlockId);

      expect(sprite.x).toBe(42);
    });
  });

  describe('event node dispatch', () => {
    it('should pass through hat blocks without side effects', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenflagclicked', topLevel: true }),
        makeBlock({ id: 'move', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 100 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      interpreter.traverse(thread, script.topBlockId);

      // Hat block is a passthrough, motion block should have executed
      expect(sprite.x).toBe(100);
    });

    it('should handle broadcast hat blocks', () => {
      const blocks = [
        makeBlock({ id: 'hat', opcode: 'event_whenbroadcastreceived', topLevel: true }),
        makeBlock({ id: 'move', opcode: 'motion_sety', inputs: { Y: { name: 'Y', value: 50 } } }),
      ];
      const script = makeScript('event_whenbroadcastreceived', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      interpreter.traverse(thread, script.topBlockId);

      expect(sprite.y).toBe(50);
    });
  });

  describe('motion node execution', () => {
    it('should execute motion_movesteps correctly at direction 90 (right)', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ direction: 90, scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.x).toBeCloseTo(10, 5);
      expect(sprite.y).toBeCloseTo(0, 5);
    });

    it('should execute motion_movesteps at direction 0 (up)', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ direction: 0, scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.x).toBeCloseTo(0, 5);
      expect(sprite.y).toBeCloseTo(10, 5);
    });

    it('should execute motion_gotoxy', () => {
      const blocks = [
        makeBlock({
          id: 'b1', opcode: 'motion_gotoxy',
          inputs: {
            X: { name: 'X', value: 100 },
            Y: { name: 'Y', value: -50 },
          },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.x).toBe(100);
      expect(sprite.y).toBe(-50);
    });

    it('should execute motion_changexby and motion_changeyby', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_changexby', inputs: { DX: { name: 'DX', value: 15 } } }),
        makeBlock({ id: 'b2', opcode: 'motion_changeyby', inputs: { DY: { name: 'DY', value: -10 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ x: 5, y: 20, scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.x).toBe(20); // 5 + 15
      expect(sprite.y).toBe(10); // 20 + (-10)
    });

    it('should execute turn and point in direction', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_turnright', inputs: { DEGREES: { name: 'DEGREES', value: 45 } } }),
        makeBlock({ id: 'b2', opcode: 'motion_turnleft', inputs: { DEGREES: { name: 'DEGREES', value: 10 } } }),
        makeBlock({ id: 'b3', opcode: 'motion_pointindirection', inputs: { DIRECTION: { name: 'DIRECTION', value: 0 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ direction: 90, scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      // Final direction should be 0 (pointindirection overrides)
      expect(sprite.direction).toBe(0);
    });

    it('should skip motion opcodes on stage targets', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 999 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const stage: TargetState = {
        id: 'stage',
        name: 'Stage',
        isStage: true,
        variables: {},
        lists: {},
        costumes: [],
        currentCostumeIndex: 0,
        sounds: [],
        volume: 100,
        scripts: [script],
      };
      interpreter.registerTarget(stage);

      const thread = createThread(stage.id, 'b1', stage);
      interpreter.traverse(thread, 'b1');
      // No crash, and stage has no x property to mutate
    });
  });

  describe('variable node execution', () => {
    it('should set a variable value', () => {
      const blocks = [
        makeBlock({
          id: 'b1', opcode: 'data_setvariableto',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'score' } },
          inputs: { VALUE: { name: 'VALUE', value: 42 } },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({
        variables: { v1: { id: 'v1', name: 'score', value: 0 } },
        scripts: [script],
      });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.variables['v1'].value).toBe(42);
      expect(thread.context.variables['score']).toBe(42);
    });

    it('should change a variable by delta', () => {
      const blocks = [
        makeBlock({
          id: 'b1', opcode: 'data_changevariableby',
          fields: { VARIABLE: { name: 'VARIABLE', value: 'score' } },
          inputs: { VALUE: { name: 'VALUE', value: 5 } },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({
        variables: { v1: { id: 'v1', name: 'score', value: 10 } },
        scripts: [script],
      });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(sprite.variables['v1'].value).toBe(15);
      expect(thread.context.variables['score']).toBe(15);
    });
  });

  describe('hardware node execution', () => {
    it('should delegate hardware_digitalwrite to adapter', () => {
      const blocks = [
        makeBlock({
          id: 'b1', opcode: 'hardware_digitalwrite',
          inputs: {
            PIN: { name: 'PIN', value: 13 },
            VALUE: { name: 'VALUE', value: 1 },
          },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(hardwareAdapter.callLog).toHaveLength(1);
      expect(hardwareAdapter.callLog[0]).toEqual({
        method: 'digitalWrite',
        args: [13, 1],
      });
    });

    it('should delegate hardware_analogread to adapter', () => {
      const blocks = [
        makeBlock({
          id: 'b1', opcode: 'hardware_analogread',
          inputs: { PIN: { name: 'PIN', value: 34 } },
        }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      expect(hardwareAdapter.callLog).toHaveLength(1);
      expect(hardwareAdapter.callLog[0]).toEqual({
        method: 'analogRead',
        args: [34],
      });
    });
  });

  describe('unknown opcodes', () => {
    it('should skip unknown opcodes without crashing', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'unknown_future_opcode' }),
        makeBlock({ id: 'b2', opcode: 'motion_setx', inputs: { X: { name: 'X', value: 7 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      interpreter.traverse(thread, 'b1');

      // Unknown opcode skipped, motion still executed
      expect(sprite.x).toBe(7);
    });
  });

  describe('findBlock', () => {
    it('should find a block across scripts', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_setx' }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      const found = interpreter.findBlock(thread, 'b1');
      expect(found).toBeDefined();
      expect(found?.opcode).toBe('motion_setx');
    });

    it('should return undefined for missing blocks', () => {
      const sprite = makeSprite();
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'nope');
      expect(interpreter.findBlock(thread, 'nope')).toBeUndefined();
    });
  });
});
