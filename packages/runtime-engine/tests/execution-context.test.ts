import { describe, it, expect, beforeEach } from 'vitest';
import { createExecutionContext, createThread, resetThreadCounter, TaskQueue } from '../src/runtime/execution-context';
import { SpriteState } from '../src/types';

// ─── Helpers ───────────────────────────────────────────────────────

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

// ─── Test suites ───────────────────────────────────────────────────

describe('ExecutionContext', () => {
  beforeEach(() => {
    resetThreadCounter();
  });

  describe('createExecutionContext', () => {
    it('should create a context with target ID', () => {
      const ctx = createExecutionContext('target_1');
      expect(ctx.targetId).toBe('target_1');
      expect(ctx.variables).toEqual({});
      expect(ctx.localScope).toEqual({});
    });

    it('should seed variables from target state', () => {
      const sprite = makeSprite({
        variables: {
          v1: { id: 'v1', name: 'score', value: 100 },
          v2: { id: 'v2', name: 'lives', value: 3 },
        },
      });

      const ctx = createExecutionContext(sprite.id, sprite);
      expect(ctx.variables['score']).toBe(100);
      expect(ctx.variables['lives']).toBe(3);
    });

    it('should handle target with no variables', () => {
      const sprite = makeSprite();
      const ctx = createExecutionContext(sprite.id, sprite);
      expect(Object.keys(ctx.variables)).toHaveLength(0);
    });
  });

  describe('createThread', () => {
    it('should create a thread with unique IDs', () => {
      const t1 = createThread('s1', 'block_a');
      const t2 = createThread('s1', 'block_b');

      expect(t1.id).not.toBe(t2.id);
      expect(t1.id).toMatch(/^thread_\d+$/);
    });

    it('should initialize thread with correct defaults', () => {
      const thread = createThread('sprite_1', 'top_block');

      expect(thread.targetId).toBe('sprite_1');
      expect(thread.topBlockId).toBe('top_block');
      expect(thread.status).toBe('IDLE');
      expect(thread.currentBlockId).toBeNull();
      expect(thread.stack).toEqual([]);
      expect(thread.isKilled).toBe(false);
      expect(thread.yieldRequest).toBe(false);
    });

    it('should seed context from target when provided', () => {
      const sprite = makeSprite({
        id: 's1',
        variables: { v1: { id: 'v1', name: 'x', value: 42 } },
      });

      const thread = createThread(sprite.id, 'block1', sprite);
      expect(thread.context.targetId).toBe('s1');
      expect(thread.context.variables['x']).toBe(42);
    });
  });

  describe('resetThreadCounter', () => {
    it('should reset the counter so IDs restart', () => {
      const t1 = createThread('s1', 'b1');
      resetThreadCounter();
      const t2 = createThread('s1', 'b1');

      expect(t1.id).toBe(t2.id); // Both should be thread_1
    });
  });
});

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('should start empty', () => {
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it('should enqueue and dequeue in FIFO order', () => {
    queue.enqueue({ targetId: 't1', scriptIndex: 0, trigger: 'green_flag' });
    queue.enqueue({ targetId: 't2', scriptIndex: 1, trigger: 'broadcast' });

    expect(queue.size()).toBe(2);
    expect(queue.isEmpty()).toBe(false);

    const first = queue.dequeue();
    expect(first?.targetId).toBe('t1');

    const second = queue.dequeue();
    expect(second?.targetId).toBe('t2');

    expect(queue.isEmpty()).toBe(true);
  });

  it('should peek without removing', () => {
    queue.enqueue({ targetId: 't1', scriptIndex: 0, trigger: 'test' });
    expect(queue.peek()?.targetId).toBe('t1');
    expect(queue.size()).toBe(1);
  });

  it('should clear all items', () => {
    queue.enqueue({ targetId: 't1', scriptIndex: 0, trigger: 'test' });
    queue.enqueue({ targetId: 't2', scriptIndex: 1, trigger: 'test' });
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });

  it('should return undefined when dequeueing from empty queue', () => {
    expect(queue.dequeue()).toBeUndefined();
  });
});
