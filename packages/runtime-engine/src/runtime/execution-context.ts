import { ExecutionContext, TargetId, TargetState, Thread, ThreadId, BlockId } from '../types';

/**
 * Lightweight execution context factory.
 * Creates properly initialized contexts for thread execution.
 * Keeps state flat and serializable — no deep nesting.
 */
export function createExecutionContext(targetId: TargetId, target?: TargetState): ExecutionContext {
  const variables: Record<string, string | number | boolean> = {};

  // Seed context variables from target state if available
  if (target) {
    for (const varState of Object.values(target.variables)) {
      variables[varState.name] = varState.value;
    }
  }

  return {
    targetId,
    variables,
    localScope: {},
  };
}

/**
 * Creates a fresh thread instance with a properly initialized context.
 */
let threadCounter = 0;

export function createThread(
  targetId: TargetId,
  topBlockId: BlockId,
  target?: TargetState
): Thread {
  const id = `thread_${++threadCounter}`;

  return {
    id,
    targetId,
    topBlockId,
    status: 'IDLE',
    currentBlockId: null,
    stack: [],
    context: createExecutionContext(targetId, target),
    isKilled: false,
    yieldRequest: false,
  };
}

/**
 * Resets the thread counter. Useful for deterministic tests.
 */
export function resetThreadCounter(): void {
  threadCounter = 0;
}

/**
 * Lightweight task queue for deterministic single-tick processing.
 * No concurrency, no priorities — just a simple FIFO queue of pending scripts to run.
 */
export interface PendingTask {
  targetId: TargetId;
  scriptIndex: number;
  trigger: string; // hat opcode or broadcast name that triggered this
  broadcastTokenId?: string; // Phase 6F broadcast wait token reference
}

export class TaskQueue {
  private queue: PendingTask[] = [];

  enqueue(task: PendingTask): void {
    this.queue.push(task);
  }

  dequeue(): PendingTask | undefined {
    return this.queue.shift();
  }

  peek(): PendingTask | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}
