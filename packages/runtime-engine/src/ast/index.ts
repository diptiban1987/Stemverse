import { ASTBlock, ASTScript, BlockId, Thread } from '../types';

/**
 * Representation of a full block coding program containing multiple targets and their scripts.
 */
export interface ASTProgram {
  id: string;
  name: string;
  targets: Record<string, {
    id: string;
    name: string;
    isStage: boolean;
    scripts: ASTScript[];
  }>;
}

/**
 * Basic interface for traversing and walking AST block nodes.
 */
export interface IASTInterpreter {
  /**
   * Clears all registered targets and registries.
   */
  clear(): void;

  /**
   * Evaluates a target script starting at the given block ID.
   */
  evaluateScript(thread: Thread, script: ASTScript): void;

  /**
   * Traverses a chain of sequential blocks, executing them step-by-step.
   */
  traverse(thread: Thread, startingBlockId: BlockId): void;

  /**
   * Steps a thread execution forward, executing up to MAX_BLOCKS_PER_TICK blocks
   * or until yielding/blocking/completion.
   */
  stepThread(thread: Thread): void;

  findBlock(thread: Thread, blockId: BlockId): ASTBlock | undefined;

  /**
   * Evaluates a reporter block (expression) recursively and returns its value.
   */
  evaluateReporter(thread: Thread, blockIdOrBlock: BlockId | ASTBlock): unknown;
}

// Re-export concrete interpreter
export { MinimalASTInterpreter, StubHardwareAdapter } from './interpreter';
export type { BlockExecutionResult, IHardwareAdapter } from './interpreter';

