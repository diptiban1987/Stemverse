// ═══════════════════════════════════════════════════════════════
// Phase 21B: Blockly → Virtual ESP32 Execution Bridge
// Connects Blockly-generated programs to Virtual ESP32 Runtime.
// No physical ESP32. No serial ports. No cloud execution.
// Browser-only instruction interpretation and execution.
// ═══════════════════════════════════════════════════════════════

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
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const VALID_BLOCKLY_EXECUTION_STATES: BlocklyExecutionState[] = [
  'IDLE', 'RUNNING', 'PAUSED', 'DELAYED', 'COMPLETED', 'ERROR',
];

export const VALID_BLOCKLY_OPCODES: BlocklyInstructionOpcode[] = [
  'PIN_MODE', 'DIGITAL_WRITE', 'DIGITAL_READ', 'PWM_WRITE',
  'DELAY', 'TIMER_START', 'TIMER_STOP',
  'LOOP_START', 'LOOP_END', 'NOP',
];

export const VALID_BLOCKLY_PHASES: Array<'SETUP' | 'LOOP'> = ['SETUP', 'LOOP'];

export const MAX_LOOP_ITERATIONS = 1_000_000;
export const MAX_INSTRUCTIONS_PER_STEP = 100;
export const DEFAULT_DELAY_MS = 1000;

// ═══════════════════════════════════════════════════════════════
// BRIDGE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Interface that the BaseRuntime implements to bridge Blockly instructions
 * to the Phase 21A Virtual ESP32 Runtime.
 */
export interface BlocklyRuntimeBridge {
  pinMode(esp32Id: string, pin: number, mode: GPIOPinMode): void;
  digitalWrite(esp32Id: string, pin: number, state: GPIOPinState): void;
  digitalRead(esp32Id: string, pin: number): GPIOPinState;
  ledcWrite(esp32Id: string, channel: number, duty: number): void;
  tick(esp32Id: string, deltaMs: number): void;
}

/**
 * Result of executing a single instruction.
 */
export interface ExecutionStepResult {
  updatedContext: BlocklyExecutionContextModel;
  sideEffects: string[];
  delayMs: number;
  readResult?: GPIOPinState;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultBlocklyInstructionModel(
  id: string,
  overrides: Partial<BlocklyInstructionModel> = {},
): BlocklyInstructionModel {
  return {
    opcode: 'NOP',
    args: {},
    sourceBlockId: '',
    lineNumber: 0,
    futureInstructionHints: {},
    ...overrides,
    instructionId: id,
  };
}

export function createDefaultBlocklyProgramModel(
  id: string,
  overrides: Partial<BlocklyProgramModel> = {},
): BlocklyProgramModel {
  return {
    esp32Id: '',
    programName: '',
    setupInstructions: [],
    loopInstructions: [],
    sourceXml: '',
    createdAt: 0,
    futureBlocklyHints: {},
    ...overrides,
    programId: id,
  };
}

export function createDefaultBlocklyExecutionContextModel(
  id: string,
  overrides: Partial<BlocklyExecutionContextModel> = {},
): BlocklyExecutionContextModel {
  return {
    programId: '',
    esp32Id: '',
    executionState: 'IDLE',
    currentPhase: 'SETUP',
    instructionPointer: 0,
    loopIteration: 0,
    delayRemainingMs: 0,
    lastInstructionResult: null,
    errorMessage: '',
    executionStartMs: 0,
    totalInstructionsExecuted: 0,
    futureContextHints: {},
    ...overrides,
    contextId: id,
  };
}

export function createDefaultBlocklyExecutionModel(
  id: string,
  overrides: Partial<BlocklyExecutionModel> = {},
): BlocklyExecutionModel {
  const defaultProgram = createDefaultBlocklyProgramModel('');
  const defaultContext = createDefaultBlocklyExecutionContextModel('');
  return {
    program: defaultProgram,
    context: defaultContext,
    isActive: false,
    futureExecutionHints: {},
    ...overrides,
    executionId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS (warning-only — never throw)
// ═══════════════════════════════════════════════════════════════

export function validateBlocklyInstructionModel(
  model: BlocklyInstructionModel | null | undefined,
  warnPrefix = '[Blockly Instruction]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_BLOCKLY_INSTRUCTION', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.instructionId || model.instructionId.trim() === '') {
    console.warn(`${warnPrefix} instructionId is empty`);
    warnings.push({ code: 'EMPTY_INSTRUCTION_ID', message: `${warnPrefix} instructionId is empty` });
  }
  if (!VALID_BLOCKLY_OPCODES.includes(model.opcode)) {
    console.warn(`${warnPrefix} invalid opcode: ${model.opcode}`);
    warnings.push({ code: 'INVALID_OPCODE', message: `${warnPrefix} invalid opcode: ${model.opcode}` });
  }
  if (typeof model.args !== 'object' || model.args === null) {
    console.warn(`${warnPrefix} invalid args`);
    warnings.push({ code: 'INVALID_ARGS', message: `${warnPrefix} invalid args` });
  }
  if (typeof model.lineNumber !== 'number' || model.lineNumber < 0) {
    console.warn(`${warnPrefix} invalid lineNumber: ${model.lineNumber}`);
    warnings.push({ code: 'INVALID_LINE_NUMBER', message: `${warnPrefix} invalid lineNumber: ${model.lineNumber}` });
  }
  if (typeof model.futureInstructionHints !== 'object' || model.futureInstructionHints === null) {
    console.warn(`${warnPrefix} invalid futureInstructionHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureInstructionHints` });
  }
  return warnings;
}

export function validateBlocklyProgramModel(
  model: BlocklyProgramModel | null | undefined,
  warnPrefix = '[Blockly Program]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_BLOCKLY_PROGRAM', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.programId || model.programId.trim() === '') {
    console.warn(`${warnPrefix} programId is empty`);
    warnings.push({ code: 'EMPTY_PROGRAM_ID', message: `${warnPrefix} programId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (!model.programName || model.programName.trim() === '') {
    console.warn(`${warnPrefix} programName is empty`);
    warnings.push({ code: 'EMPTY_PROGRAM_NAME', message: `${warnPrefix} programName is empty` });
  }
  if (!Array.isArray(model.setupInstructions)) {
    console.warn(`${warnPrefix} setupInstructions is not an array`);
    warnings.push({ code: 'INVALID_SETUP_INSTRUCTIONS', message: `${warnPrefix} setupInstructions is not an array` });
  }
  if (!Array.isArray(model.loopInstructions)) {
    console.warn(`${warnPrefix} loopInstructions is not an array`);
    warnings.push({ code: 'INVALID_LOOP_INSTRUCTIONS', message: `${warnPrefix} loopInstructions is not an array` });
  }
  if (typeof model.futureBlocklyHints !== 'object' || model.futureBlocklyHints === null) {
    console.warn(`${warnPrefix} invalid futureBlocklyHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureBlocklyHints` });
  }
  return warnings;
}

export function validateBlocklyExecutionContextModel(
  model: BlocklyExecutionContextModel | null | undefined,
  warnPrefix = '[Blockly Context]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_BLOCKLY_CONTEXT', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.contextId || model.contextId.trim() === '') {
    console.warn(`${warnPrefix} contextId is empty`);
    warnings.push({ code: 'EMPTY_CONTEXT_ID', message: `${warnPrefix} contextId is empty` });
  }
  if (!model.programId || model.programId.trim() === '') {
    console.warn(`${warnPrefix} programId is empty`);
    warnings.push({ code: 'EMPTY_PROGRAM_ID', message: `${warnPrefix} programId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (!VALID_BLOCKLY_EXECUTION_STATES.includes(model.executionState)) {
    console.warn(`${warnPrefix} invalid executionState: ${model.executionState}`);
    warnings.push({ code: 'INVALID_EXECUTION_STATE', message: `${warnPrefix} invalid executionState: ${model.executionState}` });
  }
  if (!VALID_BLOCKLY_PHASES.includes(model.currentPhase)) {
    console.warn(`${warnPrefix} invalid currentPhase: ${model.currentPhase}`);
    warnings.push({ code: 'INVALID_PHASE', message: `${warnPrefix} invalid currentPhase: ${model.currentPhase}` });
  }
  if (typeof model.instructionPointer !== 'number' || model.instructionPointer < 0) {
    console.warn(`${warnPrefix} invalid instructionPointer: ${model.instructionPointer}`);
    warnings.push({ code: 'INVALID_INSTRUCTION_POINTER', message: `${warnPrefix} invalid instructionPointer: ${model.instructionPointer}` });
  }
  if (typeof model.futureContextHints !== 'object' || model.futureContextHints === null) {
    console.warn(`${warnPrefix} invalid futureContextHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureContextHints` });
  }
  return warnings;
}

export function validateBlocklyExecutionModel(
  model: BlocklyExecutionModel | null | undefined,
  warnPrefix = '[Blockly Execution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_BLOCKLY_EXECUTION', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.executionId || model.executionId.trim() === '') {
    console.warn(`${warnPrefix} executionId is empty`);
    warnings.push({ code: 'EMPTY_EXECUTION_ID', message: `${warnPrefix} executionId is empty` });
  }
  if (!model.program) {
    console.warn(`${warnPrefix} program is null or undefined`);
    warnings.push({ code: 'INVALID_PROGRAM', message: `${warnPrefix} program is null or undefined` });
  }
  if (!model.context) {
    console.warn(`${warnPrefix} context is null or undefined`);
    warnings.push({ code: 'INVALID_CONTEXT', message: `${warnPrefix} context is null or undefined` });
  }
  if (typeof model.futureExecutionHints !== 'object' || model.futureExecutionHints === null) {
    console.warn(`${warnPrefix} invalid futureExecutionHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureExecutionHints` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateInstructionIds(
  models: BlocklyInstructionModel[],
  warnPrefix = '[Blockly Instruction]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.instructionId)) {
      console.warn(`${warnPrefix} duplicate instructionId: "${m.instructionId}"`);
      warnings.push({ code: 'DUPLICATE_INSTRUCTION_ID', message: `${warnPrefix} duplicate instructionId: "${m.instructionId}"` });
    }
    seen.add(m.instructionId);
  }
  return warnings;
}

export function validateDuplicateProgramIds(
  models: BlocklyProgramModel[],
  warnPrefix = '[Blockly Program]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.programId)) {
      console.warn(`${warnPrefix} duplicate programId: "${m.programId}"`);
      warnings.push({ code: 'DUPLICATE_PROGRAM_ID', message: `${warnPrefix} duplicate programId: "${m.programId}"` });
    }
    seen.add(m.programId);
  }
  return warnings;
}

export function validateDuplicateContextIds(
  models: BlocklyExecutionContextModel[],
  warnPrefix = '[Blockly Context]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.contextId)) {
      console.warn(`${warnPrefix} duplicate contextId: "${m.contextId}"`);
      warnings.push({ code: 'DUPLICATE_CONTEXT_ID', message: `${warnPrefix} duplicate contextId: "${m.contextId}"` });
    }
    seen.add(m.contextId);
  }
  return warnings;
}

export function validateDuplicateExecutionIds(
  models: BlocklyExecutionModel[],
  warnPrefix = '[Blockly Execution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.executionId)) {
      console.warn(`${warnPrefix} duplicate executionId: "${m.executionId}"`);
      warnings.push({ code: 'DUPLICATE_EXECUTION_ID', message: `${warnPrefix} duplicate executionId: "${m.executionId}"` });
    }
    seen.add(m.executionId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// INSTRUCTION EXECUTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Execute a single Blockly instruction against the ESP32 bridge.
 * Returns an updated context and any side effects.
 * This is a pure function — it does not mutate the input context.
 */
export function executeInstruction(
  instruction: BlocklyInstructionModel,
  context: BlocklyExecutionContextModel,
  bridge: BlocklyRuntimeBridge,
): ExecutionStepResult {
  const updated = safeDeepCopy(context);
  const sideEffects: string[] = [];
  let delayMs = 0;
  let readResult: GPIOPinState | undefined;

  updated.totalInstructionsExecuted += 1;

  try {
    switch (instruction.opcode) {
      case 'PIN_MODE': {
        const pin = Number(instruction.args['pin'] ?? 0);
        const mode = String(instruction.args['mode'] ?? 'OUTPUT') as GPIOPinMode;
        bridge.pinMode(updated.esp32Id, pin, mode);
        sideEffects.push(`PIN_MODE:${pin}:${mode}`);
        break;
      }
      case 'DIGITAL_WRITE': {
        const pin = Number(instruction.args['pin'] ?? 0);
        const state = String(instruction.args['state'] ?? 'LOW') as GPIOPinState;
        bridge.digitalWrite(updated.esp32Id, pin, state);
        sideEffects.push(`DIGITAL_WRITE:${pin}:${state}`);
        break;
      }
      case 'DIGITAL_READ': {
        const pin = Number(instruction.args['pin'] ?? 0);
        readResult = bridge.digitalRead(updated.esp32Id, pin);
        updated.lastInstructionResult = readResult;
        sideEffects.push(`DIGITAL_READ:${pin}:${readResult}`);
        break;
      }
      case 'PWM_WRITE': {
        const channel = Number(instruction.args['channel'] ?? 0);
        const duty = Number(instruction.args['duty'] ?? 0);
        bridge.ledcWrite(updated.esp32Id, channel, duty);
        sideEffects.push(`PWM_WRITE:${channel}:${duty}`);
        break;
      }
      case 'DELAY': {
        const ms = Number(instruction.args['ms'] ?? DEFAULT_DELAY_MS);
        delayMs = Math.max(0, ms);
        updated.delayRemainingMs = delayMs;
        sideEffects.push(`DELAY:${delayMs}`);
        break;
      }
      case 'TIMER_START': {
        const timerId = String(instruction.args['timerId'] ?? '');
        const intervalMs = Number(instruction.args['intervalMs'] ?? 1000);
        bridge.tick(updated.esp32Id, 0); // ensure clock is active
        sideEffects.push(`TIMER_START:${timerId}:${intervalMs}`);
        break;
      }
      case 'TIMER_STOP': {
        const timerId = String(instruction.args['timerId'] ?? '');
        sideEffects.push(`TIMER_STOP:${timerId}`);
        break;
      }
      case 'LOOP_START':
      case 'LOOP_END':
      case 'NOP':
        // No-op instructions — no side effects
        break;
      default:
        console.warn(`[Blockly Executor] unknown opcode: ${instruction.opcode}`);
        sideEffects.push(`UNKNOWN:${instruction.opcode}`);
        break;
    }
  } catch (e) {
    console.warn(`[Blockly Executor] error executing ${instruction.opcode}:`, e);
    updated.executionState = 'ERROR';
    updated.errorMessage = e instanceof Error ? e.message : String(e);
  }

  return { updatedContext: updated, sideEffects, delayMs, readResult };
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════════

/**
 * Execute one instruction and advance the instruction pointer.
 * Handles phase transitions (SETUP → LOOP) and loop wrapping.
 */
export function stepExecution(
  execution: BlocklyExecutionModel,
  bridge: BlocklyRuntimeBridge,
): { execution: BlocklyExecutionModel; result: ExecutionStepResult } {
  const exec = safeDeepCopy(execution);
  const ctx = exec.context;

  // Guard: only step if RUNNING
  if (ctx.executionState !== 'RUNNING') {
    return {
      execution: exec,
      result: {
        updatedContext: ctx,
        sideEffects: [],
        delayMs: 0,
      },
    };
  }

  const instructions = ctx.currentPhase === 'SETUP'
    ? exec.program.setupInstructions
    : exec.program.loopInstructions;

  // If instruction pointer is past the end of the current phase
  if (ctx.instructionPointer >= instructions.length) {
    if (ctx.currentPhase === 'SETUP') {
      // Transition from SETUP to LOOP
      ctx.currentPhase = 'LOOP';
      ctx.instructionPointer = 0;
      ctx.loopIteration = 0;

      // If loop has no instructions, mark as completed
      if (exec.program.loopInstructions.length === 0) {
        ctx.executionState = 'COMPLETED';
      }

      return {
        execution: exec,
        result: {
          updatedContext: ctx,
          sideEffects: ['PHASE_TRANSITION:SETUP->LOOP'],
          delayMs: 0,
        },
      };
    } else {
      // End of loop iteration — wrap around
      ctx.instructionPointer = 0;
      ctx.loopIteration += 1;

      // Safety: cap loop iterations
      if (ctx.loopIteration >= MAX_LOOP_ITERATIONS) {
        ctx.executionState = 'ERROR';
        ctx.errorMessage = `Max loop iterations (${MAX_LOOP_ITERATIONS}) exceeded`;
        return {
          execution: exec,
          result: {
            updatedContext: ctx,
            sideEffects: ['MAX_LOOP_EXCEEDED'],
            delayMs: 0,
          },
        };
      }

      return {
        execution: exec,
        result: {
          updatedContext: ctx,
          sideEffects: [`LOOP_WRAP:${ctx.loopIteration}`],
          delayMs: 0,
        },
      };
    }
  }

  // Execute current instruction
  const instruction = instructions[ctx.instructionPointer];
  const result = executeInstruction(instruction, ctx, bridge);

  // Update context from result
  exec.context = result.updatedContext;
  exec.context.instructionPointer += 1;

  // Handle delay
  if (result.delayMs > 0) {
    exec.context.executionState = 'DELAYED';
  }

  return { execution: exec, result };
}

/**
 * Execute all setup instructions synchronously (no delays in setup).
 */
export function runSetup(
  execution: BlocklyExecutionModel,
  bridge: BlocklyRuntimeBridge,
): BlocklyExecutionModel {
  let exec = safeDeepCopy(execution);
  exec.context.executionState = 'RUNNING';
  exec.context.currentPhase = 'SETUP';
  exec.context.instructionPointer = 0;
  exec.context.executionStartMs = Date.now();

  const maxSteps = exec.program.setupInstructions.length + 1;
  for (let i = 0; i < maxSteps; i++) {
    if (exec.context.executionState !== 'RUNNING') break;
    if (exec.context.currentPhase !== 'SETUP') break;

    const step = stepExecution(exec, bridge);
    exec = step.execution;
  }

  return exec;
}

/**
 * Execute up to maxSteps loop instructions.
 * Stops early on delay, pause, error, or completion.
 */
export function advanceLoop(
  execution: BlocklyExecutionModel,
  bridge: BlocklyRuntimeBridge,
  maxSteps: number = MAX_INSTRUCTIONS_PER_STEP,
): BlocklyExecutionModel {
  let exec = safeDeepCopy(execution);

  // If not running, do nothing
  if (exec.context.executionState !== 'RUNNING') {
    return exec;
  }

  for (let i = 0; i < maxSteps; i++) {
    if (exec.context.executionState !== 'RUNNING') break;

    const step = stepExecution(exec, bridge);
    exec = step.execution;
  }

  return exec;
}

/**
 * Decrement delay timer. When delay expires, transition back to RUNNING.
 */
export function tickDelay(
  context: BlocklyExecutionContextModel,
  deltaMs: number,
): BlocklyExecutionContextModel {
  const updated = safeDeepCopy(context);
  if (updated.executionState !== 'DELAYED') return updated;

  updated.delayRemainingMs = Math.max(0, updated.delayRemainingMs - deltaMs);
  if (updated.delayRemainingMs <= 0) {
    updated.executionState = 'RUNNING';
    updated.delayRemainingMs = 0;
  }
  return updated;
}

/**
 * Reset execution to beginning (SETUP phase, pointer 0).
 */
export function resetExecution(
  execution: BlocklyExecutionModel,
): BlocklyExecutionModel {
  const reset = safeDeepCopy(execution);
  reset.context.executionState = 'IDLE';
  reset.context.currentPhase = 'SETUP';
  reset.context.instructionPointer = 0;
  reset.context.loopIteration = 0;
  reset.context.delayRemainingMs = 0;
  reset.context.lastInstructionResult = null;
  reset.context.errorMessage = '';
  reset.context.totalInstructionsExecuted = 0;
  reset.isActive = false;
  return reset;
}

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE HELPERS
// ═══════════════════════════════════════════════════════════════

export function pauseExecution(
  context: BlocklyExecutionContextModel,
): BlocklyExecutionContextModel {
  const updated = safeDeepCopy(context);
  if (updated.executionState === 'RUNNING' || updated.executionState === 'DELAYED') {
    updated.executionState = 'PAUSED';
  }
  return updated;
}

export function resumeExecution(
  context: BlocklyExecutionContextModel,
): BlocklyExecutionContextModel {
  const updated = safeDeepCopy(context);
  if (updated.executionState === 'PAUSED') {
    updated.executionState = updated.delayRemainingMs > 0 ? 'DELAYED' : 'RUNNING';
  }
  return updated;
}

export function stopExecution(
  context: BlocklyExecutionContextModel,
): BlocklyExecutionContextModel {
  const updated = safeDeepCopy(context);
  updated.executionState = 'COMPLETED';
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// BLOCKLY EXECUTION SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class BlocklyExecutionSynchronizer {
  private executionRegistry = new RenderRegistry<BlocklyExecutionModel>();
  private programRegistry = new RenderRegistry<BlocklyProgramModel>();
  private contextRegistry = new RenderRegistry<BlocklyExecutionContextModel>();

  public get executions(): RenderRegistry<BlocklyExecutionModel> { return this.executionRegistry; }
  public get programs(): RenderRegistry<BlocklyProgramModel> { return this.programRegistry; }
  public get contexts(): RenderRegistry<BlocklyExecutionContextModel> { return this.contextRegistry; }

  public buildSnapshot(
    executions: BlocklyExecutionModel[],
    programs: BlocklyProgramModel[],
    contexts: BlocklyExecutionContextModel[],
  ): BlocklyExecutionSnapshot {
    this.clear();

    for (const m of executions) {
      const warnings = validateBlocklyExecutionModel(m);
      if (warnings.length === 0) {
        this.executionRegistry.register(m.executionId, m);
      }
    }
    for (const m of programs) {
      const warnings = validateBlocklyProgramModel(m);
      if (warnings.length === 0) {
        this.programRegistry.register(m.programId, m);
      }
    }
    for (const m of contexts) {
      const warnings = validateBlocklyExecutionContextModel(m);
      if (warnings.length === 0) {
        this.contextRegistry.register(m.contextId, m);
      }
    }

    return {
      executions: this.executionRegistry.getAll(),
      programs: this.programRegistry.getAll(),
      contexts: this.contextRegistry.getAll(),
    };
  }

  public clear(): void {
    this.executionRegistry.clear();
    this.programRegistry.clear();
    this.contextRegistry.clear();
  }

  public clone(): BlocklyExecutionSynchronizer {
    const cloned = new BlocklyExecutionSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  public toJSON(): BlocklyExecutionSnapshot {
    return {
      executions: this.executionRegistry.getAll(),
      programs: this.programRegistry.getAll(),
      contexts: this.contextRegistry.getAll(),
    };
  }

  public fromJSON(json: BlocklyExecutionSnapshot): void {
    this.clear();
    if (json) {
      this.buildSnapshot(
        json.executions || [],
        json.programs || [],
        json.contexts || [],
      );
    }
  }
}
