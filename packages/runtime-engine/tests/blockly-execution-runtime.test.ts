import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  BlocklyInstructionModel,
  BlocklyProgramModel,
  BlocklyExecutionContextModel,
  BlocklyExecutionModel,
  BlocklyExecutionSnapshot,
  BlocklyExecutionState,
  BlocklyInstructionOpcode,
  GPIOPinMode,
  GPIOPinState,
  StageState,
} from '../src/types';
import {
  createDefaultBlocklyInstructionModel,
  createDefaultBlocklyProgramModel,
  createDefaultBlocklyExecutionContextModel,
  createDefaultBlocklyExecutionModel,
  validateBlocklyInstructionModel,
  validateBlocklyProgramModel,
  validateBlocklyExecutionContextModel,
  validateBlocklyExecutionModel,
  validateDuplicateInstructionIds,
  validateDuplicateProgramIds,
  validateDuplicateContextIds,
  validateDuplicateExecutionIds,
  executeInstruction,
  stepExecution,
  runSetup,
  advanceLoop,
  tickDelay,
  resetExecution,
  pauseExecution,
  resumeExecution,
  stopExecution,
  BlocklyRuntimeBridge,
  BlocklyExecutionSynchronizer,
  ExecutionStepResult,
  VALID_BLOCKLY_EXECUTION_STATES,
  VALID_BLOCKLY_OPCODES,
  VALID_BLOCKLY_PHASES,
  MAX_LOOP_ITERATIONS,
  MAX_INSTRUCTIONS_PER_STEP,
  DEFAULT_DELAY_MS,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ═══════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════

function makeStage(overrides: Partial<StageState> = {}): StageState {
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
    scripts: [],
    tempo: 60,
    videoState: 'off',
    ...overrides,
  };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

/** Create a mock bridge with vi.fn() spies */
function mockBridge(): BlocklyRuntimeBridge {
  return {
    pinMode: vi.fn(),
    digitalWrite: vi.fn(),
    digitalRead: vi.fn().mockReturnValue('LOW' as GPIOPinState),
    ledcWrite: vi.fn(),
    tick: vi.fn(),
  };
}

/** Create a simple instruction */
function instr(
  i: number,
  opcode: BlocklyInstructionOpcode = 'NOP',
  args: Record<string, unknown> = {},
): BlocklyInstructionModel {
  return createDefaultBlocklyInstructionModel(`instr_${i}`, {
    opcode,
    args,
    sourceBlockId: `block_${i}`,
    lineNumber: i,
  });
}

/** Create a program with setup and loop instructions */
function makeProgram(
  id: string,
  setupCount: number,
  loopCount: number,
  setupOpcode: BlocklyInstructionOpcode = 'NOP',
  loopOpcode: BlocklyInstructionOpcode = 'NOP',
): BlocklyProgramModel {
  const setup: BlocklyInstructionModel[] = [];
  const loop: BlocklyInstructionModel[] = [];
  for (let i = 0; i < setupCount; i++) {
    setup.push(instr(i, setupOpcode));
  }
  for (let i = 0; i < loopCount; i++) {
    loop.push(instr(setupCount + i, loopOpcode));
  }
  return createDefaultBlocklyProgramModel(id, {
    esp32Id: 'esp32_0',
    programName: `Program ${id}`,
    setupInstructions: setup,
    loopInstructions: loop,
  });
}

/** Create a full execution model ready to run */
function makeExecution(
  executionId: string,
  setupCount: number,
  loopCount: number,
  setupOpcode: BlocklyInstructionOpcode = 'NOP',
  loopOpcode: BlocklyInstructionOpcode = 'NOP',
): BlocklyExecutionModel {
  const program = makeProgram('prog_1', setupCount, loopCount, setupOpcode, loopOpcode);
  const context = createDefaultBlocklyExecutionContextModel('ctx_1', {
    esp32Id: 'esp32_0',
    programId: 'prog_1',
  });
  return createDefaultBlocklyExecutionModel(executionId, {
    program,
    context,
    isActive: false,
  });
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 21B Constants', () => {
  it('VALID_BLOCKLY_EXECUTION_STATES contains all 6 states', () => {
    expect(VALID_BLOCKLY_EXECUTION_STATES).toEqual(['IDLE', 'RUNNING', 'PAUSED', 'DELAYED', 'COMPLETED', 'ERROR']);
    expect(VALID_BLOCKLY_EXECUTION_STATES).toHaveLength(6);
  });

  it('VALID_BLOCKLY_OPCODES contains all 10 opcodes', () => {
    expect(VALID_BLOCKLY_OPCODES).toContain('PIN_MODE');
    expect(VALID_BLOCKLY_OPCODES).toContain('DIGITAL_WRITE');
    expect(VALID_BLOCKLY_OPCODES).toContain('DIGITAL_READ');
    expect(VALID_BLOCKLY_OPCODES).toContain('PWM_WRITE');
    expect(VALID_BLOCKLY_OPCODES).toContain('DELAY');
    expect(VALID_BLOCKLY_OPCODES).toContain('TIMER_START');
    expect(VALID_BLOCKLY_OPCODES).toContain('TIMER_STOP');
    expect(VALID_BLOCKLY_OPCODES).toContain('LOOP_START');
    expect(VALID_BLOCKLY_OPCODES).toContain('LOOP_END');
    expect(VALID_BLOCKLY_OPCODES).toContain('NOP');
    expect(VALID_BLOCKLY_OPCODES).toHaveLength(10);
  });

  it('VALID_BLOCKLY_PHASES contains SETUP and LOOP', () => {
    expect(VALID_BLOCKLY_PHASES).toEqual(['SETUP', 'LOOP']);
  });

  it('MAX_LOOP_ITERATIONS is 1,000,000', () => {
    expect(MAX_LOOP_ITERATIONS).toBe(1_000_000);
  });

  it('MAX_INSTRUCTIONS_PER_STEP is 100', () => {
    expect(MAX_INSTRUCTIONS_PER_STEP).toBe(100);
  });

  it('DEFAULT_DELAY_MS is 1000', () => {
    expect(DEFAULT_DELAY_MS).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Factory: createDefaultBlocklyInstructionModel', () => {
  it('creates instruction with given id', () => {
    const m = createDefaultBlocklyInstructionModel('i1');
    expect(m.instructionId).toBe('i1');
    expect(m.opcode).toBe('NOP');
    expect(m.args).toEqual({});
    expect(m.sourceBlockId).toBe('');
    expect(m.lineNumber).toBe(0);
    expect(m.futureInstructionHints).toEqual({});
  });

  it('applies overrides but preserves id', () => {
    const m = createDefaultBlocklyInstructionModel('i2', {
      opcode: 'PIN_MODE',
      args: { pin: 13, mode: 'OUTPUT' },
      lineNumber: 5,
      instructionId: 'should_be_overridden',
    });
    expect(m.instructionId).toBe('i2');
    expect(m.opcode).toBe('PIN_MODE');
    expect(m.args).toEqual({ pin: 13, mode: 'OUTPUT' });
    expect(m.lineNumber).toBe(5);
  });

  it('creates multiple unique instructions', () => {
    const models = Array.from({ length: 20 }, (_, i) =>
      createDefaultBlocklyInstructionModel(`instr_${i}`, { lineNumber: i })
    );
    const ids = new Set(models.map(m => m.instructionId));
    expect(ids.size).toBe(20);
  });
});

describe('Factory: createDefaultBlocklyProgramModel', () => {
  it('creates program with given id', () => {
    const m = createDefaultBlocklyProgramModel('p1');
    expect(m.programId).toBe('p1');
    expect(m.esp32Id).toBe('');
    expect(m.programName).toBe('');
    expect(m.setupInstructions).toEqual([]);
    expect(m.loopInstructions).toEqual([]);
    expect(m.sourceXml).toBe('');
    expect(m.createdAt).toBe(0);
    expect(m.futureBlocklyHints).toEqual({});
  });

  it('applies overrides but preserves id', () => {
    const m = createDefaultBlocklyProgramModel('p2', {
      esp32Id: 'esp32_1',
      programName: 'Blink LED',
      programId: 'should_be_overridden',
    });
    expect(m.programId).toBe('p2');
    expect(m.esp32Id).toBe('esp32_1');
    expect(m.programName).toBe('Blink LED');
  });

  it('creates program with instructions', () => {
    const setup = [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })];
    const loop = [
      instr(1, 'DIGITAL_WRITE', { pin: 13, state: 'HIGH' }),
      instr(2, 'DELAY', { ms: 1000 }),
      instr(3, 'DIGITAL_WRITE', { pin: 13, state: 'LOW' }),
      instr(4, 'DELAY', { ms: 1000 }),
    ];
    const m = createDefaultBlocklyProgramModel('blink', {
      esp32Id: 'esp32_0',
      programName: 'Blink',
      setupInstructions: setup,
      loopInstructions: loop,
    });
    expect(m.setupInstructions).toHaveLength(1);
    expect(m.loopInstructions).toHaveLength(4);
  });
});

describe('Factory: createDefaultBlocklyExecutionContextModel', () => {
  it('creates context with given id', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx_1');
    expect(m.contextId).toBe('ctx_1');
    expect(m.programId).toBe('');
    expect(m.esp32Id).toBe('');
    expect(m.executionState).toBe('IDLE');
    expect(m.currentPhase).toBe('SETUP');
    expect(m.instructionPointer).toBe(0);
    expect(m.loopIteration).toBe(0);
    expect(m.delayRemainingMs).toBe(0);
    expect(m.lastInstructionResult).toBeNull();
    expect(m.errorMessage).toBe('');
    expect(m.executionStartMs).toBe(0);
    expect(m.totalInstructionsExecuted).toBe(0);
    expect(m.futureContextHints).toEqual({});
  });

  it('applies overrides but preserves id', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx_2', {
      executionState: 'RUNNING',
      currentPhase: 'LOOP',
      contextId: 'should_be_overridden',
    });
    expect(m.contextId).toBe('ctx_2');
    expect(m.executionState).toBe('RUNNING');
    expect(m.currentPhase).toBe('LOOP');
  });
});

describe('Factory: createDefaultBlocklyExecutionModel', () => {
  it('creates execution with given id and embedded program/context', () => {
    const m = createDefaultBlocklyExecutionModel('exec_1');
    expect(m.executionId).toBe('exec_1');
    expect(m.program).toBeDefined();
    expect(m.context).toBeDefined();
    expect(m.isActive).toBe(false);
    expect(m.futureExecutionHints).toEqual({});
    expect(m.program.programId).toBe('');
    expect(m.context.contextId).toBe('');
  });

  it('applies overrides with custom program and context', () => {
    const program = createDefaultBlocklyProgramModel('prog_a', { programName: 'Test' });
    const context = createDefaultBlocklyExecutionContextModel('ctx_a', { esp32Id: 'esp32_0' });
    const m = createDefaultBlocklyExecutionModel('exec_2', {
      program,
      context,
      isActive: true,
    });
    expect(m.executionId).toBe('exec_2');
    expect(m.program.programId).toBe('prog_a');
    expect(m.program.programName).toBe('Test');
    expect(m.context.contextId).toBe('ctx_a');
    expect(m.context.esp32Id).toBe('esp32_0');
    expect(m.isActive).toBe(true);
  });

  it('id override is always preserved', () => {
    const m = createDefaultBlocklyExecutionModel('exec_3', {
      executionId: 'should_be_overridden',
    });
    expect(m.executionId).toBe('exec_3');
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Validator: validateBlocklyInstructionModel', () => {
  it('returns no warnings for valid instruction', () => {
    const m = instr(1, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' });
    const w = validateBlocklyInstructionModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on null model', () => {
    const w = validateBlocklyInstructionModel(null);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('INVALID_BLOCKLY_INSTRUCTION');
  });

  it('warns on undefined model', () => {
    const w = validateBlocklyInstructionModel(undefined);
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on empty instructionId', () => {
    const m = createDefaultBlocklyInstructionModel('');
    const w = validateBlocklyInstructionModel(m);
    expect(w.some(x => x.code === 'EMPTY_INSTRUCTION_ID')).toBe(true);
  });

  it('warns on invalid opcode', () => {
    const m = createDefaultBlocklyInstructionModel('i1', { opcode: 'INVALID' as any });
    const w = validateBlocklyInstructionModel(m);
    expect(w.some(x => x.code === 'INVALID_OPCODE')).toBe(true);
  });

  it('warns on negative lineNumber', () => {
    const m = createDefaultBlocklyInstructionModel('i1', { lineNumber: -1 });
    const w = validateBlocklyInstructionModel(m);
    expect(w.some(x => x.code === 'INVALID_LINE_NUMBER')).toBe(true);
  });

  it('warns on null args', () => {
    const m = createDefaultBlocklyInstructionModel('i1');
    (m as any).args = null;
    const w = validateBlocklyInstructionModel(m);
    expect(w.some(x => x.code === 'INVALID_ARGS')).toBe(true);
  });

  it('warns on null futureInstructionHints', () => {
    const m = createDefaultBlocklyInstructionModel('i1');
    (m as any).futureInstructionHints = null;
    const w = validateBlocklyInstructionModel(m);
    expect(w.some(x => x.code === 'INVALID_FUTURE_HINTS')).toBe(true);
  });

  it('accepts all valid opcodes without warning', () => {
    for (const opcode of VALID_BLOCKLY_OPCODES) {
      const m = createDefaultBlocklyInstructionModel(`i_${opcode}`, { opcode });
      const w = validateBlocklyInstructionModel(m);
      expect(w).toHaveLength(0);
    }
  });
});

describe('Validator: validateBlocklyProgramModel', () => {
  it('returns no warnings for valid program', () => {
    const m = createDefaultBlocklyProgramModel('p1', {
      esp32Id: 'esp32_0',
      programName: 'Test',
    });
    const w = validateBlocklyProgramModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on null model', () => {
    const w = validateBlocklyProgramModel(null);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('INVALID_BLOCKLY_PROGRAM');
  });

  it('warns on empty programId', () => {
    const m = createDefaultBlocklyProgramModel('', { esp32Id: 'e', programName: 'n' });
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'EMPTY_PROGRAM_ID')).toBe(true);
  });

  it('warns on empty esp32Id', () => {
    const m = createDefaultBlocklyProgramModel('p1', { programName: 'n' });
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
  });

  it('warns on empty programName', () => {
    const m = createDefaultBlocklyProgramModel('p1', { esp32Id: 'e' });
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'EMPTY_PROGRAM_NAME')).toBe(true);
  });

  it('warns on null futureBlocklyHints', () => {
    const m = createDefaultBlocklyProgramModel('p1', { esp32Id: 'e', programName: 'n' });
    (m as any).futureBlocklyHints = null;
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'INVALID_FUTURE_HINTS')).toBe(true);
  });

  it('warns on non-array setupInstructions', () => {
    const m = createDefaultBlocklyProgramModel('p1', { esp32Id: 'e', programName: 'n' });
    (m as any).setupInstructions = 'not_array';
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'INVALID_SETUP_INSTRUCTIONS')).toBe(true);
  });

  it('warns on non-array loopInstructions', () => {
    const m = createDefaultBlocklyProgramModel('p1', { esp32Id: 'e', programName: 'n' });
    (m as any).loopInstructions = null;
    const w = validateBlocklyProgramModel(m);
    expect(w.some(x => x.code === 'INVALID_LOOP_INSTRUCTIONS')).toBe(true);
  });
});

describe('Validator: validateBlocklyExecutionContextModel', () => {
  it('returns no warnings for valid context', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
    });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on null model', () => {
    const w = validateBlocklyExecutionContextModel(null);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('INVALID_BLOCKLY_CONTEXT');
  });

  it('warns on empty contextId', () => {
    const m = createDefaultBlocklyExecutionContextModel('', { esp32Id: 'e', programId: 'p' });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'EMPTY_CONTEXT_ID')).toBe(true);
  });

  it('warns on empty programId', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', { esp32Id: 'e' });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'EMPTY_PROGRAM_ID')).toBe(true);
  });

  it('warns on empty esp32Id', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', { programId: 'p' });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
  });

  it('warns on invalid executionState', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', {
      esp32Id: 'e', programId: 'p', executionState: 'INVALID' as any,
    });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'INVALID_EXECUTION_STATE')).toBe(true);
  });

  it('warns on invalid currentPhase', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', {
      esp32Id: 'e', programId: 'p', currentPhase: 'UNKNOWN' as any,
    });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'INVALID_PHASE')).toBe(true);
  });

  it('warns on negative instructionPointer', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', {
      esp32Id: 'e', programId: 'p', instructionPointer: -1,
    });
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'INVALID_INSTRUCTION_POINTER')).toBe(true);
  });

  it('warns on null futureContextHints', () => {
    const m = createDefaultBlocklyExecutionContextModel('ctx', {
      esp32Id: 'e', programId: 'p',
    });
    (m as any).futureContextHints = null;
    const w = validateBlocklyExecutionContextModel(m);
    expect(w.some(x => x.code === 'INVALID_FUTURE_HINTS')).toBe(true);
  });

  it('accepts all valid execution states', () => {
    for (const state of VALID_BLOCKLY_EXECUTION_STATES) {
      const m = createDefaultBlocklyExecutionContextModel('ctx', {
        esp32Id: 'e', programId: 'p', executionState: state,
      });
      const w = validateBlocklyExecutionContextModel(m);
      expect(w).toHaveLength(0);
    }
  });
});

describe('Validator: validateBlocklyExecutionModel', () => {
  it('returns no warnings for valid execution', () => {
    const m = makeExecution('exec_1', 0, 0);
    const w = validateBlocklyExecutionModel(m);
    expect(w).toHaveLength(0);
  });

  it('warns on null model', () => {
    const w = validateBlocklyExecutionModel(null);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('INVALID_BLOCKLY_EXECUTION');
  });

  it('warns on undefined model', () => {
    const w = validateBlocklyExecutionModel(undefined);
    expect(w.length).toBeGreaterThan(0);
  });

  it('warns on empty executionId', () => {
    const m = makeExecution('', 0, 0);
    const w = validateBlocklyExecutionModel(m);
    expect(w.some(x => x.code === 'EMPTY_EXECUTION_ID')).toBe(true);
  });

  it('warns on null program', () => {
    const m = makeExecution('exec_1', 0, 0);
    (m as any).program = null;
    const w = validateBlocklyExecutionModel(m);
    expect(w.some(x => x.code === 'INVALID_PROGRAM')).toBe(true);
  });

  it('warns on null context', () => {
    const m = makeExecution('exec_1', 0, 0);
    (m as any).context = null;
    const w = validateBlocklyExecutionModel(m);
    expect(w.some(x => x.code === 'INVALID_CONTEXT')).toBe(true);
  });

  it('warns on null futureExecutionHints', () => {
    const m = makeExecution('exec_1', 0, 0);
    (m as any).futureExecutionHints = null;
    const w = validateBlocklyExecutionModel(m);
    expect(w.some(x => x.code === 'INVALID_FUTURE_HINTS')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Duplicate Validators', () => {
  it('validateDuplicateInstructionIds detects duplicates', () => {
    const models = [instr(1), instr(1)]; // same id
    const w = validateDuplicateInstructionIds(models);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('DUPLICATE_INSTRUCTION_ID');
  });

  it('validateDuplicateInstructionIds returns empty for unique ids', () => {
    const models = [instr(1), instr(2), instr(3)];
    const w = validateDuplicateInstructionIds(models);
    expect(w).toHaveLength(0);
  });

  it('validateDuplicateProgramIds detects duplicates', () => {
    const models = [
      createDefaultBlocklyProgramModel('p1'),
      createDefaultBlocklyProgramModel('p1'),
    ];
    const w = validateDuplicateProgramIds(models);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('DUPLICATE_PROGRAM_ID');
  });

  it('validateDuplicateProgramIds returns empty for unique ids', () => {
    const models = [
      createDefaultBlocklyProgramModel('p1'),
      createDefaultBlocklyProgramModel('p2'),
    ];
    const w = validateDuplicateProgramIds(models);
    expect(w).toHaveLength(0);
  });

  it('validateDuplicateContextIds detects duplicates', () => {
    const models = [
      createDefaultBlocklyExecutionContextModel('ctx_1'),
      createDefaultBlocklyExecutionContextModel('ctx_1'),
    ];
    const w = validateDuplicateContextIds(models);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('DUPLICATE_CONTEXT_ID');
  });

  it('validateDuplicateContextIds returns empty for unique ids', () => {
    const models = [
      createDefaultBlocklyExecutionContextModel('ctx_1'),
      createDefaultBlocklyExecutionContextModel('ctx_2'),
    ];
    const w = validateDuplicateContextIds(models);
    expect(w).toHaveLength(0);
  });

  it('validateDuplicateExecutionIds detects duplicates', () => {
    const models = [
      createDefaultBlocklyExecutionModel('exec_1'),
      createDefaultBlocklyExecutionModel('exec_1'),
    ];
    const w = validateDuplicateExecutionIds(models);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('DUPLICATE_EXECUTION_ID');
  });

  it('validateDuplicateExecutionIds returns empty for unique ids', () => {
    const models = [
      createDefaultBlocklyExecutionModel('exec_1'),
      createDefaultBlocklyExecutionModel('exec_2'),
    ];
    const w = validateDuplicateExecutionIds(models);
    expect(w).toHaveLength(0);
  });

  it('validates large set of unique ids', () => {
    const models = Array.from({ length: 50 }, (_, i) => instr(i));
    const w = validateDuplicateInstructionIds(models);
    expect(w).toHaveLength(0);
  });

  it('detects multiple duplicates in same set', () => {
    const models = [instr(1), instr(2), instr(1), instr(2), instr(3)];
    const w = validateDuplicateInstructionIds(models);
    expect(w).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// INSTRUCTION EXECUTOR — executeInstruction
// ═══════════════════════════════════════════════════════════════

describe('executeInstruction', () => {
  let bridge: BlocklyRuntimeBridge;
  let context: BlocklyExecutionContextModel;

  beforeEach(() => {
    bridge = mockBridge();
    context = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
      executionState: 'RUNNING',
    });
  });

  // ─── PIN_MODE ────────────────────────────────────────────────
  describe('PIN_MODE', () => {
    it('calls bridge.pinMode with correct args', () => {
      const instruction = instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 13, 'OUTPUT');
      expect(result.sideEffects).toContain('PIN_MODE:13:OUTPUT');
      expect(result.delayMs).toBe(0);
    });

    it('defaults to pin 0 and OUTPUT mode', () => {
      const instruction = instr(0, 'PIN_MODE', {});
      executeInstruction(instruction, context, bridge);
      expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 0, 'OUTPUT');
    });

    it('increments totalInstructionsExecuted', () => {
      const instruction = instr(0, 'PIN_MODE', { pin: 2, mode: 'INPUT' });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.updatedContext.totalInstructionsExecuted).toBe(1);
    });

    it('does not mutate the original context', () => {
      const original = JSON.parse(JSON.stringify(context));
      const instruction = instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' });
      executeInstruction(instruction, context, bridge);
      expect(context).toEqual(original);
    });
  });

  // ─── DIGITAL_WRITE ──────────────────────────────────────────
  describe('DIGITAL_WRITE', () => {
    it('calls bridge.digitalWrite HIGH', () => {
      const instruction = instr(0, 'DIGITAL_WRITE', { pin: 13, state: 'HIGH' });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.digitalWrite).toHaveBeenCalledWith('esp32_0', 13, 'HIGH');
      expect(result.sideEffects).toContain('DIGITAL_WRITE:13:HIGH');
    });

    it('calls bridge.digitalWrite LOW', () => {
      const instruction = instr(0, 'DIGITAL_WRITE', { pin: 5, state: 'LOW' });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.digitalWrite).toHaveBeenCalledWith('esp32_0', 5, 'LOW');
      expect(result.sideEffects).toContain('DIGITAL_WRITE:5:LOW');
    });

    it('defaults to pin 0 and LOW state', () => {
      const instruction = instr(0, 'DIGITAL_WRITE', {});
      executeInstruction(instruction, context, bridge);
      expect(bridge.digitalWrite).toHaveBeenCalledWith('esp32_0', 0, 'LOW');
    });
  });

  // ─── DIGITAL_READ ───────────────────────────────────────────
  describe('DIGITAL_READ', () => {
    it('calls bridge.digitalRead and stores result', () => {
      (bridge.digitalRead as any).mockReturnValue('HIGH');
      const instruction = instr(0, 'DIGITAL_READ', { pin: 4 });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.digitalRead).toHaveBeenCalledWith('esp32_0', 4);
      expect(result.readResult).toBe('HIGH');
      expect(result.updatedContext.lastInstructionResult).toBe('HIGH');
      expect(result.sideEffects).toContain('DIGITAL_READ:4:HIGH');
    });

    it('returns LOW when bridge returns LOW', () => {
      (bridge.digitalRead as any).mockReturnValue('LOW');
      const instruction = instr(0, 'DIGITAL_READ', { pin: 2 });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.readResult).toBe('LOW');
    });

    it('defaults to pin 0', () => {
      const instruction = instr(0, 'DIGITAL_READ', {});
      executeInstruction(instruction, context, bridge);
      expect(bridge.digitalRead).toHaveBeenCalledWith('esp32_0', 0);
    });
  });

  // ─── PWM_WRITE ──────────────────────────────────────────────
  describe('PWM_WRITE', () => {
    it('calls bridge.ledcWrite with channel and duty', () => {
      const instruction = instr(0, 'PWM_WRITE', { channel: 0, duty: 128 });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.ledcWrite).toHaveBeenCalledWith('esp32_0', 0, 128);
      expect(result.sideEffects).toContain('PWM_WRITE:0:128');
    });

    it('defaults to channel 0 and duty 0', () => {
      const instruction = instr(0, 'PWM_WRITE', {});
      executeInstruction(instruction, context, bridge);
      expect(bridge.ledcWrite).toHaveBeenCalledWith('esp32_0', 0, 0);
    });
  });

  // ─── DELAY ──────────────────────────────────────────────────
  describe('DELAY', () => {
    it('sets delayMs and delayRemainingMs', () => {
      const instruction = instr(0, 'DELAY', { ms: 500 });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.delayMs).toBe(500);
      expect(result.updatedContext.delayRemainingMs).toBe(500);
      expect(result.sideEffects).toContain('DELAY:500');
    });

    it('defaults to DEFAULT_DELAY_MS', () => {
      const instruction = instr(0, 'DELAY', {});
      const result = executeInstruction(instruction, context, bridge);
      expect(result.delayMs).toBe(DEFAULT_DELAY_MS);
    });

    it('handles negative delay (clamped to 0)', () => {
      const instruction = instr(0, 'DELAY', { ms: -100 });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.delayMs).toBe(0);
    });

    it('handles zero delay', () => {
      const instruction = instr(0, 'DELAY', { ms: 0 });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.delayMs).toBe(0);
    });

    it('handles large delay', () => {
      const instruction = instr(0, 'DELAY', { ms: 60000 });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.delayMs).toBe(60000);
    });
  });

  // ─── TIMER_START ────────────────────────────────────────────
  describe('TIMER_START', () => {
    it('calls bridge.tick and records side effect', () => {
      const instruction = instr(0, 'TIMER_START', { timerId: 'timer_0', intervalMs: 2000 });
      const result = executeInstruction(instruction, context, bridge);
      expect(bridge.tick).toHaveBeenCalledWith('esp32_0', 0);
      expect(result.sideEffects).toContain('TIMER_START:timer_0:2000');
    });

    it('defaults timerId and intervalMs', () => {
      const instruction = instr(0, 'TIMER_START', {});
      const result = executeInstruction(instruction, context, bridge);
      expect(result.sideEffects).toContain('TIMER_START::1000');
    });
  });

  // ─── TIMER_STOP ─────────────────────────────────────────────
  describe('TIMER_STOP', () => {
    it('records side effect', () => {
      const instruction = instr(0, 'TIMER_STOP', { timerId: 'timer_0' });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.sideEffects).toContain('TIMER_STOP:timer_0');
      expect(result.delayMs).toBe(0);
    });
  });

  // ─── NOP / LOOP_START / LOOP_END ────────────────────────────
  describe('No-op instructions', () => {
    it('NOP produces no side effects', () => {
      const instruction = instr(0, 'NOP');
      const result = executeInstruction(instruction, context, bridge);
      expect(result.sideEffects).toHaveLength(0);
      expect(result.delayMs).toBe(0);
      expect(result.updatedContext.totalInstructionsExecuted).toBe(1);
    });

    it('LOOP_START produces no side effects', () => {
      const instruction = instr(0, 'LOOP_START');
      const result = executeInstruction(instruction, context, bridge);
      expect(result.sideEffects).toHaveLength(0);
    });

    it('LOOP_END produces no side effects', () => {
      const instruction = instr(0, 'LOOP_END');
      const result = executeInstruction(instruction, context, bridge);
      expect(result.sideEffects).toHaveLength(0);
    });
  });

  // ─── Error handling ─────────────────────────────────────────
  describe('Error handling', () => {
    it('catches bridge errors and sets ERROR state', () => {
      (bridge.pinMode as any).mockImplementation(() => { throw new Error('Bridge failed'); });
      const instruction = instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.updatedContext.executionState).toBe('ERROR');
      expect(result.updatedContext.errorMessage).toContain('Bridge failed');
    });

    it('catches non-Error throws', () => {
      (bridge.digitalWrite as any).mockImplementation(() => { throw 'string_error'; });
      const instruction = instr(0, 'DIGITAL_WRITE', { pin: 13, state: 'HIGH' });
      const result = executeInstruction(instruction, context, bridge);
      expect(result.updatedContext.executionState).toBe('ERROR');
      expect(result.updatedContext.errorMessage).toBe('string_error');
    });
  });

  // ─── Immutability ───────────────────────────────────────────
  describe('Immutability', () => {
    it('does not mutate original context', () => {
      const original = JSON.parse(JSON.stringify(context));
      const instruction = instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' });
      executeInstruction(instruction, context, bridge);
      expect(context).toEqual(original);
    });

    it('returns a new context object', () => {
      const instruction = instr(0, 'NOP');
      const result = executeInstruction(instruction, context, bridge);
      expect(result.updatedContext).not.toBe(context);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEDULER — stepExecution
// ═══════════════════════════════════════════════════════════════

describe('stepExecution', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('does not step when not RUNNING', () => {
    const exec = makeExecution('exec_1', 3, 0);
    exec.context.executionState = 'IDLE';
    const result = stepExecution(exec, bridge);
    expect(result.result.sideEffects).toHaveLength(0);
    expect(result.execution.context.instructionPointer).toBe(0);
  });

  it('does not step when PAUSED', () => {
    const exec = makeExecution('exec_1', 3, 0);
    exec.context.executionState = 'PAUSED';
    const result = stepExecution(exec, bridge);
    expect(result.result.sideEffects).toHaveLength(0);
  });

  it('does not step when COMPLETED', () => {
    const exec = makeExecution('exec_1', 3, 0);
    exec.context.executionState = 'COMPLETED';
    const result = stepExecution(exec, bridge);
    expect(result.result.sideEffects).toHaveLength(0);
  });

  it('does not step when ERROR', () => {
    const exec = makeExecution('exec_1', 3, 0);
    exec.context.executionState = 'ERROR';
    const result = stepExecution(exec, bridge);
    expect(result.result.sideEffects).toHaveLength(0);
  });

  it('executes one SETUP instruction and advances pointer', () => {
    const exec = makeExecution('exec_1', 3, 2);
    exec.context.executionState = 'RUNNING';
    const result = stepExecution(exec, bridge);
    expect(result.execution.context.instructionPointer).toBe(1);
    expect(result.execution.context.currentPhase).toBe('SETUP');
  });

  it('transitions from SETUP to LOOP when setup instructions exhausted', () => {
    const exec = makeExecution('exec_1', 2, 3);
    exec.context.executionState = 'RUNNING';
    exec.context.instructionPointer = 2; // past end of setup
    const result = stepExecution(exec, bridge);
    expect(result.execution.context.currentPhase).toBe('LOOP');
    expect(result.execution.context.instructionPointer).toBe(0);
    expect(result.result.sideEffects).toContain('PHASE_TRANSITION:SETUP->LOOP');
  });

  it('marks COMPLETED when SETUP done and no LOOP instructions', () => {
    const exec = makeExecution('exec_1', 1, 0);
    exec.context.executionState = 'RUNNING';
    exec.context.instructionPointer = 1; // past end of setup
    const result = stepExecution(exec, bridge);
    expect(result.execution.context.currentPhase).toBe('LOOP');
    expect(result.execution.context.executionState).toBe('COMPLETED');
  });

  it('wraps loop around and increments loopIteration', () => {
    const exec = makeExecution('exec_1', 0, 2);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    exec.context.instructionPointer = 2; // past end of loop
    exec.context.loopIteration = 0;
    const result = stepExecution(exec, bridge);
    expect(result.execution.context.instructionPointer).toBe(0);
    expect(result.execution.context.loopIteration).toBe(1);
    expect(result.result.sideEffects).toContain('LOOP_WRAP:1');
  });

  it('sets ERROR when MAX_LOOP_ITERATIONS exceeded', () => {
    const exec = makeExecution('exec_1', 0, 2);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    exec.context.instructionPointer = 2;
    exec.context.loopIteration = MAX_LOOP_ITERATIONS - 1; // next wrap will exceed
    const result = stepExecution(exec, bridge);
    expect(result.execution.context.executionState).toBe('ERROR');
    expect(result.execution.context.errorMessage).toContain('Max loop iterations');
    expect(result.result.sideEffects).toContain('MAX_LOOP_EXCEEDED');
  });

  it('sets DELAYED state when instruction produces delay', () => {
    const program = createDefaultBlocklyProgramModel('prog_1', {
      esp32Id: 'esp32_0',
      programName: 'Delay Test',
      setupInstructions: [],
      loopInstructions: [
        instr(0, 'DELAY', { ms: 500 }),
      ],
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
      executionState: 'RUNNING',
      currentPhase: 'LOOP',
    });
    const exec = createDefaultBlocklyExecutionModel('exec_1', { program, context });

    const result = stepExecution(exec, bridge);
    expect(result.execution.context.executionState).toBe('DELAYED');
    expect(result.result.delayMs).toBe(500);
  });

  it('does not mutate original execution', () => {
    const exec = makeExecution('exec_1', 3, 2);
    exec.context.executionState = 'RUNNING';
    const original = JSON.parse(JSON.stringify(exec));
    stepExecution(exec, bridge);
    expect(exec).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEDULER — runSetup
// ═══════════════════════════════════════════════════════════════

describe('runSetup', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('executes all setup instructions', () => {
    const exec = makeExecution('exec_1', 3, 2);
    const result = runSetup(exec, bridge);
    // After running setup, should have transitioned to LOOP phase
    expect(result.context.currentPhase).toBe('LOOP');
    expect(result.context.totalInstructionsExecuted).toBe(3);
  });

  it('handles empty setup', () => {
    const exec = makeExecution('exec_1', 0, 2);
    const result = runSetup(exec, bridge);
    expect(result.context.currentPhase).toBe('LOOP');
    expect(result.context.totalInstructionsExecuted).toBe(0);
  });

  it('handles empty setup and empty loop (marks COMPLETED)', () => {
    const exec = makeExecution('exec_1', 0, 0);
    const result = runSetup(exec, bridge);
    expect(result.context.executionState).toBe('COMPLETED');
  });

  it('sets executionState to RUNNING during setup', () => {
    const exec = makeExecution('exec_1', 1, 1);
    const result = runSetup(exec, bridge);
    // After setup completes, state should still be RUNNING (ready for loop)
    expect(result.context.executionState).toBe('RUNNING');
  });

  it('calls bridge methods for PIN_MODE setup', () => {
    const program = createDefaultBlocklyProgramModel('prog_1', {
      esp32Id: 'esp32_0',
      programName: 'Test',
      setupInstructions: [
        instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' }),
        instr(1, 'PIN_MODE', { pin: 2, mode: 'INPUT' }),
      ],
      loopInstructions: [],
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
    });
    const exec = createDefaultBlocklyExecutionModel('exec_1', { program, context });

    runSetup(exec, bridge);
    expect(bridge.pinMode).toHaveBeenCalledTimes(2);
    expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 13, 'OUTPUT');
    expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 2, 'INPUT');
  });

  it('does not mutate original execution', () => {
    const exec = makeExecution('exec_1', 5, 3);
    const original = JSON.parse(JSON.stringify(exec));
    runSetup(exec, bridge);
    expect(exec).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEDULER — advanceLoop
// ═══════════════════════════════════════════════════════════════

describe('advanceLoop', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('does nothing when not RUNNING', () => {
    const exec = makeExecution('exec_1', 0, 3);
    exec.context.executionState = 'IDLE';
    exec.context.currentPhase = 'LOOP';
    const result = advanceLoop(exec, bridge);
    expect(result.context.instructionPointer).toBe(0);
    expect(result.context.totalInstructionsExecuted).toBe(0);
  });

  it('executes up to maxSteps instructions', () => {
    const exec = makeExecution('exec_1', 0, 5);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    const result = advanceLoop(exec, bridge, 3);
    expect(result.context.totalInstructionsExecuted).toBe(3);
    expect(result.context.instructionPointer).toBe(3);
  });

  it('stops on DELAY', () => {
    const program = createDefaultBlocklyProgramModel('prog_1', {
      esp32Id: 'esp32_0',
      programName: 'Test',
      setupInstructions: [],
      loopInstructions: [
        instr(0, 'NOP'),
        instr(1, 'DELAY', { ms: 500 }),
        instr(2, 'NOP'),
      ],
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
      executionState: 'RUNNING',
      currentPhase: 'LOOP',
    });
    const exec = createDefaultBlocklyExecutionModel('exec_1', { program, context });

    const result = advanceLoop(exec, bridge, 100);
    // Should stop after the delay instruction (2 instructions executed)
    expect(result.context.totalInstructionsExecuted).toBe(2);
    expect(result.context.executionState).toBe('DELAYED');
  });

  it('wraps around loop iterations', () => {
    const exec = makeExecution('exec_1', 0, 2);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    // With maxSteps=10 and 2 loop instructions, it wraps several times
    const result = advanceLoop(exec, bridge, 10);
    expect(result.context.totalInstructionsExecuted).toBeGreaterThan(0);
    expect(result.context.loopIteration).toBeGreaterThan(0);
  });

  it('does not mutate original', () => {
    const exec = makeExecution('exec_1', 0, 3);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    const original = JSON.parse(JSON.stringify(exec));
    advanceLoop(exec, bridge, 5);
    expect(exec).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// tickDelay
// ═══════════════════════════════════════════════════════════════

describe('tickDelay', () => {
  it('does nothing when not DELAYED', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'RUNNING',
    });
    const result = tickDelay(ctx, 1000);
    expect(result.executionState).toBe('RUNNING');
  });

  it('decrements delayRemainingMs', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p',
      executionState: 'DELAYED',
      delayRemainingMs: 500,
    });
    const result = tickDelay(ctx, 200);
    expect(result.delayRemainingMs).toBe(300);
    expect(result.executionState).toBe('DELAYED');
  });

  it('transitions back to RUNNING when delay expires', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p',
      executionState: 'DELAYED',
      delayRemainingMs: 100,
    });
    const result = tickDelay(ctx, 100);
    expect(result.delayRemainingMs).toBe(0);
    expect(result.executionState).toBe('RUNNING');
  });

  it('transitions when delta exceeds remaining delay', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p',
      executionState: 'DELAYED',
      delayRemainingMs: 50,
    });
    const result = tickDelay(ctx, 200);
    expect(result.delayRemainingMs).toBe(0);
    expect(result.executionState).toBe('RUNNING');
  });

  it('does not mutate original context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p',
      executionState: 'DELAYED',
      delayRemainingMs: 500,
    });
    const original = JSON.parse(JSON.stringify(ctx));
    tickDelay(ctx, 200);
    expect(ctx).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// resetExecution
// ═══════════════════════════════════════════════════════════════

describe('resetExecution', () => {
  it('resets all context fields to initial values', () => {
    const exec = makeExecution('exec_1', 3, 5);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    exec.context.instructionPointer = 42;
    exec.context.loopIteration = 10;
    exec.context.delayRemainingMs = 500;
    exec.context.lastInstructionResult = 'HIGH';
    exec.context.errorMessage = 'some error';
    exec.context.totalInstructionsExecuted = 100;
    exec.isActive = true;

    const reset = resetExecution(exec);
    expect(reset.context.executionState).toBe('IDLE');
    expect(reset.context.currentPhase).toBe('SETUP');
    expect(reset.context.instructionPointer).toBe(0);
    expect(reset.context.loopIteration).toBe(0);
    expect(reset.context.delayRemainingMs).toBe(0);
    expect(reset.context.lastInstructionResult).toBeNull();
    expect(reset.context.errorMessage).toBe('');
    expect(reset.context.totalInstructionsExecuted).toBe(0);
    expect(reset.isActive).toBe(false);
  });

  it('preserves executionId', () => {
    const exec = makeExecution('exec_1', 1, 1);
    const reset = resetExecution(exec);
    expect(reset.executionId).toBe('exec_1');
  });

  it('preserves program', () => {
    const exec = makeExecution('exec_1', 3, 5);
    const reset = resetExecution(exec);
    expect(reset.program.programId).toBe('prog_1');
    expect(reset.program.setupInstructions).toHaveLength(3);
    expect(reset.program.loopInstructions).toHaveLength(5);
  });

  it('does not mutate original', () => {
    const exec = makeExecution('exec_1', 1, 1);
    exec.context.executionState = 'RUNNING';
    const original = JSON.parse(JSON.stringify(exec));
    resetExecution(exec);
    expect(exec).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE HELPERS
// ═══════════════════════════════════════════════════════════════

describe('pauseExecution', () => {
  it('pauses a RUNNING context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'RUNNING',
    });
    const paused = pauseExecution(ctx);
    expect(paused.executionState).toBe('PAUSED');
  });

  it('pauses a DELAYED context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'DELAYED',
    });
    const paused = pauseExecution(ctx);
    expect(paused.executionState).toBe('PAUSED');
  });

  it('does not pause an IDLE context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'IDLE',
    });
    const result = pauseExecution(ctx);
    expect(result.executionState).toBe('IDLE');
  });

  it('does not pause a COMPLETED context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'COMPLETED',
    });
    const result = pauseExecution(ctx);
    expect(result.executionState).toBe('COMPLETED');
  });

  it('does not pause an ERROR context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'ERROR',
    });
    const result = pauseExecution(ctx);
    expect(result.executionState).toBe('ERROR');
  });

  it('does not mutate original', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'RUNNING',
    });
    const original = JSON.parse(JSON.stringify(ctx));
    pauseExecution(ctx);
    expect(ctx).toEqual(original);
  });
});

describe('resumeExecution', () => {
  it('resumes a PAUSED context to RUNNING', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'PAUSED', delayRemainingMs: 0,
    });
    const resumed = resumeExecution(ctx);
    expect(resumed.executionState).toBe('RUNNING');
  });

  it('resumes a PAUSED context to DELAYED if delay remaining', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'PAUSED', delayRemainingMs: 500,
    });
    const resumed = resumeExecution(ctx);
    expect(resumed.executionState).toBe('DELAYED');
  });

  it('does not resume an IDLE context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'IDLE',
    });
    const result = resumeExecution(ctx);
    expect(result.executionState).toBe('IDLE');
  });

  it('does not resume a COMPLETED context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'COMPLETED',
    });
    const result = resumeExecution(ctx);
    expect(result.executionState).toBe('COMPLETED');
  });

  it('does not mutate original', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'PAUSED',
    });
    const original = JSON.parse(JSON.stringify(ctx));
    resumeExecution(ctx);
    expect(ctx).toEqual(original);
  });
});

describe('stopExecution', () => {
  it('stops a RUNNING context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'RUNNING',
    });
    const stopped = stopExecution(ctx);
    expect(stopped.executionState).toBe('COMPLETED');
  });

  it('stops a PAUSED context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'PAUSED',
    });
    const stopped = stopExecution(ctx);
    expect(stopped.executionState).toBe('COMPLETED');
  });

  it('stops a DELAYED context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'DELAYED',
    });
    const stopped = stopExecution(ctx);
    expect(stopped.executionState).toBe('COMPLETED');
  });

  it('stops an IDLE context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'IDLE',
    });
    const stopped = stopExecution(ctx);
    expect(stopped.executionState).toBe('COMPLETED');
  });

  it('stops an ERROR context', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'ERROR',
    });
    const stopped = stopExecution(ctx);
    expect(stopped.executionState).toBe('COMPLETED');
  });

  it('does not mutate original', () => {
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'e', programId: 'p', executionState: 'RUNNING',
    });
    const original = JSON.parse(JSON.stringify(ctx));
    stopExecution(ctx);
    expect(ctx).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// BlocklyExecutionSynchronizer
// ═══════════════════════════════════════════════════════════════

describe('BlocklyExecutionSynchronizer', () => {
  it('builds snapshot from valid models', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = makeExecution('exec_1', 2, 3);
    const prog = createDefaultBlocklyProgramModel('prog_1', { esp32Id: 'e', programName: 'n' });
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', { esp32Id: 'e', programId: 'p' });

    const snap = sync.buildSnapshot([exec], [prog], [ctx]);
    expect(snap.executions).toHaveLength(1);
    expect(snap.programs).toHaveLength(1);
    expect(snap.contexts).toHaveLength(1);
  });

  it('rejects invalid models (empty id)', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = createDefaultBlocklyExecutionModel('');
    const snap = sync.buildSnapshot([exec], [], []);
    expect(snap.executions).toHaveLength(0);
  });

  it('clear() empties all registries', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = makeExecution('exec_1', 0, 0);
    sync.buildSnapshot([exec], [], []);
    sync.clear();
    expect(sync.executions.getAll()).toHaveLength(0);
    expect(sync.programs.getAll()).toHaveLength(0);
    expect(sync.contexts.getAll()).toHaveLength(0);
  });

  it('toJSON() returns current state', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = makeExecution('exec_1', 0, 0);
    const prog = createDefaultBlocklyProgramModel('prog_1', { esp32Id: 'e', programName: 'n' });
    sync.buildSnapshot([exec], [prog], []);
    const json = sync.toJSON();
    expect(json.executions).toHaveLength(1);
    expect(json.programs).toHaveLength(1);
    expect(json.contexts).toHaveLength(0);
  });

  it('fromJSON() restores state', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = makeExecution('exec_1', 0, 0);
    const prog = createDefaultBlocklyProgramModel('prog_1', { esp32Id: 'e', programName: 'n' });
    const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', { esp32Id: 'e', programId: 'p' });
    sync.buildSnapshot([exec], [prog], [ctx]);

    const json = sync.toJSON();
    const sync2 = new BlocklyExecutionSynchronizer();
    sync2.fromJSON(json);
    expect(sync2.executions.getAll()).toHaveLength(1);
    expect(sync2.programs.getAll()).toHaveLength(1);
    expect(sync2.contexts.getAll()).toHaveLength(1);
  });

  it('clone() produces independent copy', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const exec = makeExecution('exec_1', 0, 0);
    sync.buildSnapshot([exec], [], []);

    const cloned = sync.clone();
    sync.clear();
    expect(sync.executions.getAll()).toHaveLength(0);
    expect(cloned.executions.getAll()).toHaveLength(1);
  });

  it('buildSnapshot replaces previous data', () => {
    const sync = new BlocklyExecutionSynchronizer();
    sync.buildSnapshot([makeExecution('exec_1', 0, 0)], [], []);
    sync.buildSnapshot([makeExecution('exec_2', 0, 0)], [], []);
    expect(sync.executions.getAll()).toHaveLength(1);
    expect(sync.executions.getAll()[0].executionId).toBe('exec_2');
  });

  it('handles multiple models in same build', () => {
    const sync = new BlocklyExecutionSynchronizer();
    const execs = Array.from({ length: 5 }, (_, i) => makeExecution(`exec_${i}`, 0, 0));
    sync.buildSnapshot(execs, [], []);
    expect(sync.executions.getAll()).toHaveLength(5);
  });

  it('fromJSON handles null gracefully', () => {
    const sync = new BlocklyExecutionSynchronizer();
    sync.buildSnapshot([makeExecution('exec_1', 0, 0)], [], []);
    sync.fromJSON(null as any);
    // After fromJSON(null), registries should be cleared
    expect(sync.executions.getAll()).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: Full Blink LED Scenario
// ═══════════════════════════════════════════════════════════════

describe('Integration: Blink LED Program', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('full lifecycle: load → setup → loop → delay → tick → resume → stop', () => {
    // Build a Blink LED program:
    // SETUP: PIN_MODE(13, OUTPUT)
    // LOOP:  DIGITAL_WRITE(13, HIGH) → DELAY(1000) → DIGITAL_WRITE(13, LOW) → DELAY(1000)
    const program = createDefaultBlocklyProgramModel('blink', {
      esp32Id: 'esp32_0',
      programName: 'Blink LED',
      setupInstructions: [
        instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' }),
      ],
      loopInstructions: [
        instr(1, 'DIGITAL_WRITE', { pin: 13, state: 'HIGH' }),
        instr(2, 'DELAY', { ms: 1000 }),
        instr(3, 'DIGITAL_WRITE', { pin: 13, state: 'LOW' }),
        instr(4, 'DELAY', { ms: 1000 }),
      ],
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_blink', {
      esp32Id: 'esp32_0',
      programId: 'blink',
    });
    let exec = createDefaultBlocklyExecutionModel('exec_blink', { program, context });

    // 1. Run setup
    exec = runSetup(exec, bridge);
    expect(exec.context.currentPhase).toBe('LOOP');
    expect(exec.context.executionState).toBe('RUNNING');
    expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 13, 'OUTPUT');

    // 2. Step into loop — DIGITAL_WRITE HIGH
    let step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(bridge.digitalWrite).toHaveBeenCalledWith('esp32_0', 13, 'HIGH');
    expect(exec.context.instructionPointer).toBe(1);

    // 3. Step — DELAY(1000) → DELAYED
    step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(exec.context.executionState).toBe('DELAYED');
    expect(exec.context.delayRemainingMs).toBe(1000);

    // 4. Tick delay partially
    exec.context = tickDelay(exec.context, 500);
    expect(exec.context.executionState).toBe('DELAYED');
    expect(exec.context.delayRemainingMs).toBe(500);

    // 5. Tick delay fully
    exec.context = tickDelay(exec.context, 500);
    expect(exec.context.executionState).toBe('RUNNING');
    expect(exec.context.delayRemainingMs).toBe(0);

    // 6. Step — DIGITAL_WRITE LOW
    step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(bridge.digitalWrite).toHaveBeenCalledWith('esp32_0', 13, 'LOW');

    // 7. Step — DELAY(1000) → DELAYED again
    step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(exec.context.executionState).toBe('DELAYED');

    // 8. Pause during delay
    exec.context = pauseExecution(exec.context);
    expect(exec.context.executionState).toBe('PAUSED');

    // 9. Resume (should go back to DELAYED since delay remains)
    exec.context = resumeExecution(exec.context);
    expect(exec.context.executionState).toBe('DELAYED');

    // 10. Stop execution
    exec.context = stopExecution(exec.context);
    expect(exec.context.executionState).toBe('COMPLETED');

    // 11. Reset execution
    exec = resetExecution(exec);
    expect(exec.context.executionState).toBe('IDLE');
    expect(exec.context.currentPhase).toBe('SETUP');
    expect(exec.context.instructionPointer).toBe(0);
    expect(exec.isActive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: PWM LED Fade
// ═══════════════════════════════════════════════════════════════

describe('Integration: PWM LED Fade', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('fades LED through multiple PWM steps', () => {
    const dutyValues = [0, 64, 128, 192, 255];
    const loopInstructions: BlocklyInstructionModel[] = [];

    for (let i = 0; i < dutyValues.length; i++) {
      loopInstructions.push(instr(i * 2, 'PWM_WRITE', { channel: 0, duty: dutyValues[i] }));
      loopInstructions.push(instr(i * 2 + 1, 'DELAY', { ms: 100 }));
    }

    const program = createDefaultBlocklyProgramModel('fade', {
      esp32Id: 'esp32_0',
      programName: 'PWM Fade',
      setupInstructions: [
        instr(100, 'PIN_MODE', { pin: 25, mode: 'OUTPUT' }),
      ],
      loopInstructions,
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_fade', {
      esp32Id: 'esp32_0',
      programId: 'fade',
    });
    let exec = createDefaultBlocklyExecutionModel('exec_fade', { program, context });

    // Run setup
    exec = runSetup(exec, bridge);
    expect(exec.context.currentPhase).toBe('LOOP');
    expect(bridge.pinMode).toHaveBeenCalledWith('esp32_0', 25, 'OUTPUT');

    // Execute first PWM_WRITE
    let step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(bridge.ledcWrite).toHaveBeenCalledWith('esp32_0', 0, 0);
    expect(exec.context.executionState).toBe('RUNNING');

    // Execute DELAY
    step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(exec.context.executionState).toBe('DELAYED');

    // Tick through delay
    exec.context = tickDelay(exec.context, 100);
    expect(exec.context.executionState).toBe('RUNNING');

    // Execute next PWM_WRITE (duty=64)
    step = stepExecution(exec, bridge);
    exec = step.execution;
    expect(bridge.ledcWrite).toHaveBeenCalledWith('esp32_0', 0, 64);
  });
});

// ═══════════════════════════════════════════════════════════════
// HIGH-LEVEL BaseRuntime APIs
// ═══════════════════════════════════════════════════════════════

describe('BaseRuntime Blockly Bridge APIs', () => {
  let rt: BaseRuntime;

  beforeEach(() => {
    rt = runtime();
  });

  describe('blocklyLoadProgram', () => {
    it('returns a valid execution ID', () => {
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'Test Program');
      expect(execId).toBe('blockly_exec_esp32_0_prog_1');
    });

    it('registers execution, program, and context models', () => {
      rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'Test');
      expect(rt.getAllBlocklyExecutionModels()).toHaveLength(1);
      expect(rt.getAllBlocklyProgramModels()).toHaveLength(1);
      expect(rt.getAllBlocklyContextModels()).toHaveLength(1);
    });

    it('stores program name correctly', () => {
      rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'My Blink');
      const programs = rt.getAllBlocklyProgramModels();
      expect(programs[0].programName).toBe('My Blink');
    });

    it('stores setup and loop instructions correctly', () => {
      const setup = [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })];
      const loop = [instr(1, 'DIGITAL_WRITE', { pin: 13, state: 'HIGH' })];
      rt.blocklyLoadProgram('esp32_0', 'prog_1', setup, loop, 'Test');
      const programs = rt.getAllBlocklyProgramModels();
      expect(programs[0].setupInstructions).toHaveLength(1);
      expect(programs[0].loopInstructions).toHaveLength(1);
    });

    it('defaults program name to "Untitled Program"', () => {
      rt.blocklyLoadProgram('esp32_0', 'prog_1', [], []);
      const programs = rt.getAllBlocklyProgramModels();
      expect(programs[0].programName).toBe('Untitled Program');
    });

    it('loads multiple programs independently', () => {
      rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'P1');
      rt.blocklyLoadProgram('esp32_0', 'prog_2', [], [], 'P2');
      expect(rt.getAllBlocklyExecutionModels()).toHaveLength(2);
      expect(rt.getAllBlocklyProgramModels()).toHaveLength(2);
    });

    it('deep-copies instructions to prevent mutation leakage', () => {
      const setup = [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })];
      rt.blocklyLoadProgram('esp32_0', 'prog_1', setup, [], 'Test');
      // Mutate the original
      setup[0].args['pin'] = 999;
      const stored = rt.getAllBlocklyProgramModels()[0];
      expect(stored.setupInstructions[0].args['pin']).toBe(13);
    });
  });

  describe('blocklyStartExecution', () => {
    it('returns true on success', () => {
      const setup = [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', setup, [], 'Test');
      const result = rt.blocklyStartExecution(execId);
      expect(result).toBe(true);
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyStartExecution('non_existent');
      expect(result).toBe(false);
    });

    it('sets execution as active after start', () => {
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [instr(0, 'NOP')], 'Test');
      rt.blocklyStartExecution(execId);
      const execs = rt.getAllBlocklyExecutionModels();
      expect(execs[0].isActive).toBe(true);
    });
  });

  describe('blocklyStepExecution', () => {
    it('steps through instructions', () => {
      const loop = [instr(0, 'NOP'), instr(1, 'NOP'), instr(2, 'NOP')];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], loop, 'Test');
      rt.blocklyStartExecution(execId);
      const result = rt.blocklyStepExecution(execId);
      expect(result).toBe(true);
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyStepExecution('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('blocklyPauseExecution', () => {
    it('pauses a running execution', () => {
      const loop = [instr(0, 'NOP'), instr(1, 'NOP')];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], loop, 'Test');
      rt.blocklyStartExecution(execId);
      const result = rt.blocklyPauseExecution(execId);
      expect(result).toBe(true);
      const exec = rt.getAllBlocklyExecutionModels()[0];
      expect(exec.context.executionState).toBe('PAUSED');
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyPauseExecution('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('blocklyResumeExecution', () => {
    it('resumes a paused execution', () => {
      const loop = [instr(0, 'NOP'), instr(1, 'NOP')];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], loop, 'Test');
      rt.blocklyStartExecution(execId);
      rt.blocklyPauseExecution(execId);
      const result = rt.blocklyResumeExecution(execId);
      expect(result).toBe(true);
      const exec = rt.getAllBlocklyExecutionModels()[0];
      expect(exec.context.executionState).toBe('RUNNING');
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyResumeExecution('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('blocklyStopExecution', () => {
    it('stops a running execution', () => {
      const loop = [instr(0, 'NOP')];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], loop, 'Test');
      rt.blocklyStartExecution(execId);
      const result = rt.blocklyStopExecution(execId);
      expect(result).toBe(true);
      const exec = rt.getAllBlocklyExecutionModels()[0];
      expect(exec.context.executionState).toBe('COMPLETED');
      expect(exec.isActive).toBe(false);
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyStopExecution('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('blocklyResetExecution', () => {
    it('resets execution to IDLE/SETUP state', () => {
      const loop = [instr(0, 'NOP')];
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], loop, 'Test');
      rt.blocklyStartExecution(execId);
      rt.blocklyStepExecution(execId);
      const result = rt.blocklyResetExecution(execId);
      expect(result).toBe(true);
      const exec = rt.getAllBlocklyExecutionModels()[0];
      expect(exec.context.executionState).toBe('IDLE');
      expect(exec.context.currentPhase).toBe('SETUP');
      expect(exec.context.instructionPointer).toBe(0);
      expect(exec.isActive).toBe(false);
    });

    it('returns false for non-existent executionId', () => {
      const result = rt.blocklyResetExecution('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('blocklyGetSnapshot', () => {
    it('returns snapshot for valid execution', () => {
      const execId = rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'Test');
      const snap = rt.blocklyGetSnapshot(execId);
      expect(snap).not.toBeNull();
      expect(snap!.executions).toHaveLength(1);
      expect(snap!.programs).toHaveLength(1);
      expect(snap!.contexts).toHaveLength(1);
    });

    it('returns null for non-existent execution', () => {
      const snap = rt.blocklyGetSnapshot('non_existent');
      expect(snap).toBeNull();
    });
  });

  // ─── CRUD Operations ──────────────────────────────────────
  describe('CRUD operations', () => {
    it('registers and retrieves execution models', () => {
      const exec = makeExecution('exec_1', 0, 0);
      rt.registerBlocklyExecutionModel(exec);
      expect(rt.getAllBlocklyExecutionModels()).toHaveLength(1);
    });

    it('registers and retrieves program models', () => {
      const prog = createDefaultBlocklyProgramModel('prog_1', { esp32Id: 'e', programName: 'n' });
      rt.registerBlocklyProgramModel(prog);
      expect(rt.getAllBlocklyProgramModels()).toHaveLength(1);
    });

    it('registers and retrieves context models', () => {
      const ctx = createDefaultBlocklyExecutionContextModel('ctx_1', { esp32Id: 'e', programId: 'p' });
      rt.registerBlocklyContextModel(ctx);
      expect(rt.getAllBlocklyContextModels()).toHaveLength(1);
    });

    it('clears all blockly models', () => {
      rt.registerBlocklyExecutionModel(makeExecution('exec_1', 0, 0));
      rt.registerBlocklyProgramModel(createDefaultBlocklyProgramModel('p1'));
      rt.registerBlocklyContextModel(createDefaultBlocklyExecutionContextModel('c1'));

      rt.clearBlocklyExecutionModels();
      rt.clearBlocklyProgramModels();
      rt.clearBlocklyContextModels();

      expect(rt.getAllBlocklyExecutionModels()).toHaveLength(0);
      expect(rt.getAllBlocklyProgramModels()).toHaveLength(0);
      expect(rt.getAllBlocklyContextModels()).toHaveLength(0);
    });

    it('supports multiple registrations', () => {
      for (let i = 0; i < 10; i++) {
        rt.registerBlocklyExecutionModel(makeExecution(`exec_${i}`, 0, 0));
      }
      expect(rt.getAllBlocklyExecutionModels()).toHaveLength(10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES & ROBUSTNESS
// ═══════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  let bridge: BlocklyRuntimeBridge;

  beforeEach(() => {
    bridge = mockBridge();
  });

  it('stepExecution handles empty program (no setup, no loop)', () => {
    const exec = makeExecution('exec_1', 0, 0);
    exec.context.executionState = 'RUNNING';
    const result = stepExecution(exec, bridge);
    // Should transition to LOOP and COMPLETED
    expect(result.execution.context.executionState).toBe('COMPLETED');
  });

  it('runSetup handles bridge error without crashing', () => {
    (bridge.pinMode as any).mockImplementation(() => { throw new Error('Fail'); });
    const program = createDefaultBlocklyProgramModel('prog_1', {
      esp32Id: 'esp32_0',
      programName: 'Test',
      setupInstructions: [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })],
      loopInstructions: [],
    });
    const context = createDefaultBlocklyExecutionContextModel('ctx_1', {
      esp32Id: 'esp32_0',
      programId: 'prog_1',
    });
    const exec = createDefaultBlocklyExecutionModel('exec_1', { program, context });

    const result = runSetup(exec, bridge);
    expect(result.context.executionState).toBe('ERROR');
    expect(result.context.errorMessage).toContain('Fail');
  });

  it('multiple sequential setups are independent', () => {
    const exec1 = makeExecution('exec_1', 3, 2);
    const exec2 = makeExecution('exec_2', 5, 1);

    const r1 = runSetup(exec1, bridge);
    const r2 = runSetup(exec2, bridge);

    expect(r1.context.totalInstructionsExecuted).toBe(3);
    expect(r2.context.totalInstructionsExecuted).toBe(5);
    expect(r1.executionId).toBe('exec_1');
    expect(r2.executionId).toBe('exec_2');
  });

  it('advanceLoop with maxSteps=0 does nothing', () => {
    const exec = makeExecution('exec_1', 0, 5);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    const result = advanceLoop(exec, bridge, 0);
    expect(result.context.totalInstructionsExecuted).toBe(0);
  });

  it('advanceLoop with maxSteps=1 executes exactly one instruction', () => {
    const exec = makeExecution('exec_1', 0, 5);
    exec.context.executionState = 'RUNNING';
    exec.context.currentPhase = 'LOOP';
    const result = advanceLoop(exec, bridge, 1);
    expect(result.context.totalInstructionsExecuted).toBe(1);
  });

  it('handles very large instruction set without overflow', () => {
    const count = 1000;
    const exec = makeExecution('exec_1', count, 0);
    exec.context.executionState = 'RUNNING';
    // runSetup can handle many instructions
    const result = runSetup(exec, bridge);
    expect(result.context.totalInstructionsExecuted).toBe(count);
    expect(result.context.currentPhase).toBe('LOOP');
  });
});

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE via BaseRuntime
// ═══════════════════════════════════════════════════════════════

describe('BaseRuntime Lifecycle', () => {
  it('reset() clears all blockly models', () => {
    const rt = runtime();
    rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'Test');
    expect(rt.getAllBlocklyExecutionModels()).toHaveLength(1);

    rt.reset();
    expect(rt.getAllBlocklyExecutionModels()).toHaveLength(0);
    expect(rt.getAllBlocklyProgramModels()).toHaveLength(0);
    expect(rt.getAllBlocklyContextModels()).toHaveLength(0);
  });

  it('destroy() clears all blockly models', () => {
    const rt = runtime();
    rt.blocklyLoadProgram('esp32_0', 'prog_1', [], [], 'Test');
    rt.destroy();
    expect(rt.getAllBlocklyExecutionModels()).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION / DESERIALIZATION
// ═══════════════════════════════════════════════════════════════

describe('Serialization & Deserialization', () => {
  it('blockly state survives export → import cycle', () => {
    const rt1 = runtime();
    const setup = [instr(0, 'PIN_MODE', { pin: 13, mode: 'OUTPUT' })];
    const loop = [instr(1, 'NOP')];
    rt1.blocklyLoadProgram('esp32_0', 'prog_1', setup, loop, 'Blink');

    // Export project
    const exported = rt1.exportProject();
    expect(exported).toBeDefined();

    // Import into fresh runtime
    const rt2 = runtime();
    rt2.importProject(exported);

    expect(rt2.getAllBlocklyExecutionModels()).toHaveLength(1);
    expect(rt2.getAllBlocklyProgramModels()).toHaveLength(1);
    expect(rt2.getAllBlocklyContextModels()).toHaveLength(1);

    const programs = rt2.getAllBlocklyProgramModels();
    expect(programs[0].programName).toBe('Blink');
    expect(programs[0].setupInstructions).toHaveLength(1);
    expect(programs[0].loopInstructions).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// BATCH FACTORY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Batch Factory Robustness', () => {
  it('creates 100 unique instruction models', () => {
    const models = Array.from({ length: 100 }, (_, i) =>
      createDefaultBlocklyInstructionModel(`instr_${i}`, { lineNumber: i, opcode: VALID_BLOCKLY_OPCODES[i % 10] })
    );
    const ids = new Set(models.map(m => m.instructionId));
    expect(ids.size).toBe(100);
    expect(models.every(m => validateBlocklyInstructionModel(m).length === 0)).toBe(true);
  });

  it('creates 50 unique program models', () => {
    const models = Array.from({ length: 50 }, (_, i) =>
      createDefaultBlocklyProgramModel(`prog_${i}`, { esp32Id: `esp32_${i}`, programName: `P${i}` })
    );
    const ids = new Set(models.map(m => m.programId));
    expect(ids.size).toBe(50);
  });

  it('creates 50 unique context models', () => {
    const models = Array.from({ length: 50 }, (_, i) =>
      createDefaultBlocklyExecutionContextModel(`ctx_${i}`, { esp32Id: `e${i}`, programId: `p${i}` })
    );
    const ids = new Set(models.map(m => m.contextId));
    expect(ids.size).toBe(50);
    expect(models.every(m => validateBlocklyExecutionContextModel(m).length === 0)).toBe(true);
  });

  it('creates 50 unique execution models', () => {
    const models = Array.from({ length: 50 }, (_, i) =>
      makeExecution(`exec_${i}`, i % 5, i % 3)
    );
    const ids = new Set(models.map(m => m.executionId));
    expect(ids.size).toBe(50);
    expect(models.every(m => validateBlocklyExecutionModel(m).length === 0)).toBe(true);
  });
});
