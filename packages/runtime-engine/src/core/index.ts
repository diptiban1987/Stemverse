import { TargetId, Thread, ThreadId, BlockId, ASTBlock } from '../types';

/**
 * Main engine controller interface responsible for initiating execution,
 * running the tick updates, managing targets, and firing project events.
 */
export interface IRuntime {
  /**
   * Initializes the engine, registering targets and starting the clock.
   */
  initialize(): void;

  /**
   * Starts the execution loop.
   */
  start(): void;

  /**
   * Pauses the execution loop, keeping thread stacks intact.
   */
  pause(): void;

  /**
   * Stops the execution loop, killing all running threads and resetting runtime states.
   */
  stop(): void;

  /**
   * Steps the execution engine forward by one complete tick.
   * Typically executed on a requestAnimationFrame or interval loop.
   */
  tick(): void;

  /**
   * Adds an execution target (Sprite or Stage) to the runtime memory.
   */
  addTarget(target: any): void;

  /**
   * Removes an execution target by ID.
   */
  removeTarget(targetId: TargetId): void;

  /**
   * Dispatches a broadcast event to start matching scripts on all targets.
   */
  triggerBroadcast(broadcastName: string): void;

  /**
   * Returns all active targets registered in the system.
   */
  getTargets(): any[];

  /**
   * Returns a specific target by ID.
   */
  getTargetById(targetId: TargetId): any | undefined;
}

/**
 * Thread Scheduler in charge of ordering, yielding, and sweeping thread states.
 */
export interface IThreadManager {
  /**
   * Registers and starts a new thread for a script stack.
   */
  createThread(targetId: TargetId, topBlockId: BlockId): Thread;

  /**
   * Removes a thread from the scheduler.
   */
  killThread(threadId: ThreadId): void;

  /**
   * Removes all threads in the active pool.
   */
  killAllThreads(): void;

  /**
   * Returns the list of currently managed threads.
   */
  getThreads(): Thread[];

  /**
   * Runs the scheduler scheduler round, updating thread execution status.
   */
  stepThreads(): void;
}

/**
 * Execution Engine responsible for resolving blocks, executing opcodes, 
 * and calling primitive methods.
 */
export interface IExecutionEngine {
  /**
   * Executes a single block within a thread's context.
   * Returns the ID of the next block to execute, or null if yielded/ended.
   */
  executeBlock(thread: Thread, block: ASTBlock): string | null;

  /**
   * Resolves the value of a block's input parameters (e.g., constants, variables, reporter sub-blocks).
   */
  resolveBlockInput(thread: Thread, inputName: string, block: ASTBlock): unknown;
}
