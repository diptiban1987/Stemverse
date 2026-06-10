import { describe, it, expect, beforeEach } from 'vitest';
import { MinimalASTInterpreter, StubHardwareAdapter, MAX_BLOCKS_PER_TICK, MAX_STACK_DEPTH } from '../src/ast/interpreter';
import { ASTBlock, ASTScript, SpriteState, Thread } from '../src/types';
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
  for (let i = 0; i < blocks.length; i++) {
    const block = { ...blocks[i] };
    if (block.next === null && i < blocks.length - 1) {
      block.next = blocks[i + 1].id;
    }
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

describe('Phase 6C Control-Flow Foundation', () => {
  let interpreter: MinimalASTInterpreter;

  beforeEach(() => {
    interpreter = new MinimalASTInterpreter(new StubHardwareAdapter());
    resetThreadCounter();
  });

  // ─── Step 1 Foundation Tests ─────────────────────────────────────
  describe('Step 1 - stepThread Foundation', () => {
    it('should execute sequential blocks and set status to DONE upon completion', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
        makeBlock({ id: 'b2', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 20 } } }),
      ];

      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = script.topBlockId;

      interpreter.stepThread(thread);

      expect(sprite.x).toBe(30);
      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should yield and save state when executing budget is exceeded (MAX_BLOCKS_PER_TICK)', () => {
      const blocksCount = MAX_BLOCKS_PER_TICK + 5;
      const blocks: ASTBlock[] = [];
      for (let i = 1; i <= blocksCount; i++) {
        blocks.push(
          makeBlock({
            id: `b${i}`,
            opcode: 'motion_movesteps',
            inputs: { STEPS: { name: 'STEPS', value: 1 } },
          })
        );
      }

      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, script.topBlockId, sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = script.topBlockId;

      interpreter.stepThread(thread);

      expect(sprite.x).toBe(1000);
      expect(thread.status).toBe('YIELDED');
      expect(thread.currentBlockId).toBe('b1001');

      thread.status = 'RUNNING';
      interpreter.stepThread(thread);

      expect(sprite.x).toBe(1005);
      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should pop from the stack and continue execution when end of chain is reached', () => {
      const script1 = makeScript('event_whenflagclicked', [
        makeBlock({ id: 'b1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } })
      ]);
      const script2 = makeScript('other', [
        makeBlock({ id: 'resume_block', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } })
      ]);

      const sprite = makeSprite({ scripts: [script1, script2] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';
      thread.stack.push('resume_block');

      interpreter.stepThread(thread);

      expect(sprite.x).toBe(15);
      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should terminate immediately and set status to DONE when target is missing', () => {
      const thread = createThread('nonexistent_sprite', 'b1');
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should terminate immediately and set status to DONE when block is missing', () => {
      const sprite = makeSprite();
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'nonexistent_block', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'nonexistent_block';

      interpreter.stepThread(thread);

      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should terminate immediately and set status to DONE when thread is killed', () => {
      const blocks = [
        makeBlock({ id: 'b1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } }),
      ];
      const script = makeScript('event_whenflagclicked', blocks);
      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';
      thread.isKilled = true;

      interpreter.stepThread(thread);

      expect(sprite.x).toBe(0);
      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });

    it('should trigger stack overflow safety block and terminate if stack length is exceeded', () => {
      const sprite = makeSprite();
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      // Manually overflow stack frame limit
      for (let i = 0; i < MAX_STACK_DEPTH + 10; i++) {
        thread.stack.push('some_id');
      }

      interpreter.stepThread(thread);

      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
    });
  });

  // ─── Step 2 Branching Tests ──────────────────────────────────────
  describe('Step 2 - control_if and control_if_else', () => {
    it('should execute if-body and continue sequentially when control_if is true', () => {
      // Structure:
      // b1: control_if (CONDITION: true, SUBSTACK: 'sub1') -> next: 'after'
      // sub1: motion_movesteps 10
      // after: motion_movesteps 5
      const ifBlock = makeBlock({
        id: 'b1',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
        },
        next: 'after',
      });
      const subBlock = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: ifBlock, sub1: subBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Verify that substack ran and execution popped back to 'after' block
      // 10 (substack) + 5 (after) = 15
      expect(sprite.x).toBe(15);
      expect(thread.status).toBe('DONE');
    });

    it('should skip if-body and continue sequentially when control_if is false', () => {
      const ifBlock = makeBlock({
        id: 'b1',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: false },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
        },
        next: 'after',
      });
      const subBlock = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: ifBlock, sub1: subBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Verify substack was skipped, and only 'after' ran
      expect(sprite.x).toBe(5);
      expect(thread.status).toBe('DONE');
    });

    it('should execute if-body (SUBSTACK) when control_if_else is true', () => {
      const ifElseBlock = makeBlock({
        id: 'b1',
        opcode: 'control_if_else',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
          SUBSTACK2: { name: 'SUBSTACK2', value: 'sub2' },
        },
        next: 'after',
      });
      const sub1Block = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const sub2Block = makeBlock({ id: 'sub2', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 20 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: ifElseBlock, sub1: sub1Block, sub2: sub2Block, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Verify sub1 ran, sub2 skipped, then after ran
      // 10 + 5 = 15
      expect(sprite.x).toBe(15);
      expect(thread.status).toBe('DONE');
    });

    it('should execute else-body (SUBSTACK2) when control_if_else is false', () => {
      const ifElseBlock = makeBlock({
        id: 'b1',
        opcode: 'control_if_else',
        inputs: {
          CONDITION: { name: 'CONDITION', value: false },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
          SUBSTACK2: { name: 'SUBSTACK2', value: 'sub2' },
        },
        next: 'after',
      });
      const sub1Block = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const sub2Block = makeBlock({ id: 'sub2', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 20 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: ifElseBlock, sub1: sub1Block, sub2: sub2Block, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Verify sub2 ran, sub1 skipped, then after ran
      // 20 + 5 = 25
      expect(sprite.x).toBe(25);
      expect(thread.status).toBe('DONE');
    });

    it('should support nesting multiple levels of branching', () => {
      // Structure:
      // b1: if (true, SUBSTACK: 'inner_if') -> next: 'after_all'
      // inner_if: if (true, SUBSTACK: 'move_inner') -> next: 'move_outer'
      // move_inner: motion_movesteps 10
      // move_outer: motion_movesteps 20
      // after_all: motion_movesteps 5
      const outerIf = makeBlock({
        id: 'b1',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'inner_if' },
        },
        next: 'after_all',
      });
      const innerIf = makeBlock({
        id: 'inner_if',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'move_inner' },
        },
        next: 'move_outer',
      });
      const moveInner = makeBlock({ id: 'move_inner', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const moveOuter = makeBlock({ id: 'move_outer', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 20 } } });
      const afterAll = makeBlock({ id: 'after_all', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: {
          b1: outerIf,
          inner_if: innerIf,
          move_inner: moveInner,
          move_outer: moveOuter,
          after_all: afterAll,
        },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // 10 (innermost) + 20 (inner next) + 5 (outer next) = 35
      expect(sprite.x).toBe(35);
      expect(thread.status).toBe('DONE');
    });

    it('should handle missing or invalid substacks safely without freezing', () => {
      // IF true but SUBSTACK points to nonexistent 'missing' -> next: 'after'
      const ifBlock = makeBlock({
        id: 'b1',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'missing' },
        },
        next: 'after',
      });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: ifBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Verify it skipped the missing substack and executed 'after' safely
      expect(sprite.x).toBe(5);
      expect(thread.status).toBe('DONE');
    });
  });

  // ─── Step 3 Repeat Loop Tests ────────────────────────────────────
  describe('Step 3 - control_repeat Loops', () => {
    it('should execute repeat-body N times and yield per iteration', () => {
      // Structure:
      // b1: control_repeat (TIMES: 3, SUBSTACK: 'sub1') -> next: 'after'
      // sub1: motion_movesteps 10
      // after: motion_movesteps 5
      const repeatBlock = makeBlock({
        id: 'b1',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
        },
        next: 'after',
      });
      const subBlock = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: repeatBlock, sub1: subBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      // --- Tick 1 ---
      interpreter.stepThread(thread);
      // First iteration runs. At the end of the iteration, it pops to repeatBlock.
      // repeatBlock decrements counter to 2. It pushes block.id again, sets yieldRequest, and points to 'sub1'.
      // Then it yields.
      expect(sprite.x).toBe(10); // First iteration executed
      expect(thread.status).toBe('YIELDED');
      expect(thread.currentBlockId).toBe('sub1'); // Ready to execute substack again
      expect(thread.context.localScope['loop_b1_remaining']).toBe(2);

      // --- Tick 2 ---
      thread.status = 'RUNNING';
      interpreter.stepThread(thread);
      // Second iteration runs. Returns to repeatBlock, decrements to 1. Sets yieldRequest, points to 'sub1', yields.
      expect(sprite.x).toBe(20);
      expect(thread.status).toBe('YIELDED');
      expect(thread.currentBlockId).toBe('sub1');
      expect(thread.context.localScope['loop_b1_remaining']).toBe(1);

      // --- Tick 3 ---
      thread.status = 'RUNNING';
      interpreter.stepThread(thread);
      // Third iteration runs. Returns to repeatBlock, decrements to 0. Deletes scope counter, continues to 'after' block.
      // Total movement: 10 + 10 + 10 + 5 (after) = 35.
      expect(sprite.x).toBe(35);
      expect(thread.status).toBe('DONE');
      expect(thread.currentBlockId).toBeNull();
      expect(thread.context.localScope['loop_b1_remaining']).toBeUndefined();
    });

    it('should skip repeat-body and continue sequentially when TIMES is 0 or negative', () => {
      const repeatBlock = makeBlock({
        id: 'b1',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 0 },
          SUBSTACK: { name: 'SUBSTACK', value: 'sub1' },
        },
        next: 'after',
      });
      const subBlock = makeBlock({ id: 'sub1', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'b1',
        blocks: { b1: repeatBlock, sub1: subBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'b1', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'b1';

      interpreter.stepThread(thread);

      // Should skip repeat entirely and execute 'after'
      expect(sprite.x).toBe(5);
      expect(thread.status).toBe('DONE');
    });

    it('should support nesting repeat loops with independent counter scopes', () => {
      // Outer: repeat 2 -> next: 'after_all'
      // Outer substack: repeat 3 -> next: null
      // Inner substack: motion_movesteps 10
      // after_all: motion_movesteps 5
      const outerRepeat = makeBlock({
        id: 'outer',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 2 },
          SUBSTACK: { name: 'SUBSTACK', value: 'inner' },
        },
        next: 'after_all',
      });
      const innerRepeat = makeBlock({
        id: 'inner',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
      });
      const moveBlock = makeBlock({ id: 'move', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });
      const afterAll = makeBlock({ id: 'after_all', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'outer',
        blocks: { outer: outerRepeat, inner: innerRepeat, move: moveBlock, after_all: afterAll },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'outer', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'outer';

      // Let's run a simple synchronous loop simulator or step it tick by tick
      // Since it yields per iteration, we can count the ticks it takes to finish!
      // Total inner iterations = 2 * 3 = 6. Each inner iteration yields.
      // Let's step until DONE:
      let ticks = 0;
      while ((thread.status as string) !== 'DONE' && ticks < 20) {
        if ((thread.status as string) === 'YIELDED') {
          thread.status = 'RUNNING';
        }
        interpreter.stepThread(thread);
        ticks++;
      }

      // Total movement: 2 * 3 * 10 = 60 + 5 (after_all) = 65.
      expect(sprite.x).toBe(65);
      expect(thread.status).toBe('DONE');
      expect(ticks).toBe(6); // Yields after each inner repeat block iteration
    });

    it('should support repeat with branching inside', () => {
      // Repeat 3:
      //   if score > 15 (true):
      //     move 10
      const repeatBlock = makeBlock({
        id: 'repeat',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'if_block' },
        },
      });
      const ifBlock = makeBlock({
        id: 'if_block',
        opcode: 'control_if',
        inputs: {
          CONDITION: { name: 'CONDITION', value: true },
          SUBSTACK: { name: 'SUBSTACK', value: 'move' },
        },
      });
      const moveBlock = makeBlock({ id: 'move', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 10 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'repeat',
        blocks: { repeat: repeatBlock, if_block: ifBlock, move: moveBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'repeat', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'repeat';

      let ticks = 0;
      while ((thread.status as string) !== 'DONE' && ticks < 20) {
        if ((thread.status as string) === 'YIELDED') {
          thread.status = 'RUNNING';
        }
        interpreter.stepThread(thread);
        ticks++;
      }

      expect(sprite.x).toBe(30);
      expect(thread.status).toBe('DONE');
    });

    it('should handle repeat loop with missing substack safely as no-op', () => {
      const repeatBlock = makeBlock({
        id: 'repeat',
        opcode: 'control_repeat',
        inputs: {
          TIMES: { name: 'TIMES', value: 3 },
          SUBSTACK: { name: 'SUBSTACK', value: 'missing' },
        },
        next: 'after',
      });
      const afterBlock = makeBlock({ id: 'after', opcode: 'motion_movesteps', inputs: { STEPS: { name: 'STEPS', value: 5 } } });

      const script = {
        id: 'script1',
        hatOpcode: 'event_whenflagclicked',
        topBlockId: 'repeat',
        blocks: { repeat: repeatBlock, after: afterBlock },
      };

      const sprite = makeSprite({ scripts: [script] });
      interpreter.registerTarget(sprite);

      const thread = createThread(sprite.id, 'repeat', sprite);
      thread.status = 'RUNNING';
      thread.currentBlockId = 'repeat';

      interpreter.stepThread(thread);

      // Substack is missing, so it should run as a no-op, skipping body, and finishing immediately
      expect(sprite.x).toBe(5);
      expect(thread.status).toBe('DONE');
    });
  });
});
