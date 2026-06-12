import {
  RenderExecutionModel,
  RenderInstructionModel,
  RenderScheduleModel,
  RenderExecutionSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultRenderExecutionModel(
  executionId = 'default_execution',
  overrides: Partial<RenderExecutionModel> = {},
): RenderExecutionModel {
  return {
    executionId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    executionName: overrides.executionName || `Execution ${executionId}`,
    executionState: overrides.executionState || 'PENDING',
    executionOrder: overrides.executionOrder !== undefined ? overrides.executionOrder : 0,
    futureRendererHints: overrides.futureRendererHints || {},
    ...overrides,
  };
}

export function createDefaultRenderInstructionModel(
  instructionId = 'default_instruction',
  overrides: Partial<RenderInstructionModel> = {},
): RenderInstructionModel {
  return {
    instructionId,
    executionId: overrides.executionId || 'default_execution',
    instructionName: overrides.instructionName || `Instruction ${instructionId}`,
    instructionType: overrides.instructionType || 'LAYER',
    instructionOrder: overrides.instructionOrder !== undefined ? overrides.instructionOrder : 0,
    instructionState: overrides.instructionState || 'PENDING',
    futureExecutionHints: overrides.futureExecutionHints || {},
    ...overrides,
  };
}

export function createDefaultRenderScheduleModel(
  scheduleId = 'default_schedule',
  overrides: Partial<RenderScheduleModel> = {},
): RenderScheduleModel {
  return {
    scheduleId,
    runtimeId: overrides.runtimeId || 'default_runtime',
    scheduleName: overrides.scheduleName || `Schedule ${scheduleId}`,
    scheduleType: overrides.scheduleType || 'FRAME',
    scheduleOrder: overrides.scheduleOrder !== undefined ? overrides.scheduleOrder : 0,
    scheduleState: overrides.scheduleState || 'IDLE',
    futureExecutionHints: overrides.futureExecutionHints || {},
    ...overrides,
  };
}

// ─── VALIDATION ENUMS ─────────────────────────────────────────────────────────

const VALID_EXECUTION_STATES = [
  'PENDING',
  'READY',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
];

const VALID_INSTRUCTION_TYPES = [
  'LAYER',
  'COMPONENT',
  'WIRE',
  'BOARD',
  'SIGNAL',
  'ANIMATION',
  'THEME',
  'FRAME',
];

const VALID_INSTRUCTION_STATES = [
  'PENDING',
  'QUEUED',
  'EXECUTING',
  'COMPLETE',
  'SKIPPED',
];

const VALID_SCHEDULE_TYPES = [
  'FRAME',
  'CONTINUOUS',
  'MANUAL',
  'EVENT',
];

const VALID_SCHEDULE_STATES = [
  'IDLE',
  'ACTIVE',
  'PAUSED',
  'STOPPED',
];

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateRenderExecutionModel(
  model: RenderExecutionModel,
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({
      code: 'INVALID_RENDER_EXECUTION',
      message: 'Render execution model is null, undefined, or not an object.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.executionId) {
    warnings.push({
      code: 'INVALID_EXECUTION_ID',
      message: 'Render execution ID is empty.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({
      code: 'INVALID_RUNTIME_ID',
      message: `Render execution "${model.executionId}" has empty runtimeId.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.executionName) {
    warnings.push({
      code: 'INVALID_EXECUTION_NAME',
      message: `Render execution "${model.executionId}" has empty executionName.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_EXECUTION_STATES.includes(model.executionState)) {
    warnings.push({
      code: 'INVALID_EXECUTION_STATE',
      message: `Render execution "${model.executionId}" has invalid executionState "${model.executionState}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.executionOrder !== 'number') {
    warnings.push({
      code: 'INVALID_EXECUTION_ORDER',
      message: `Render execution "${model.executionId}" has invalid executionOrder.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (
    typeof model.futureRendererHints !== 'object' ||
    model.futureRendererHints === null ||
    Array.isArray(model.futureRendererHints)
  ) {
    warnings.push({
      code: 'INVALID_FUTURE_HINTS',
      message: `Render execution "${model.executionId}" has invalid futureRendererHints.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderInstructionModel(
  model: RenderInstructionModel,
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({
      code: 'INVALID_RENDER_INSTRUCTION',
      message: 'Render instruction model is null, undefined, or not an object.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.instructionId) {
    warnings.push({
      code: 'INVALID_INSTRUCTION_ID',
      message: 'Render instruction ID is empty.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.executionId) {
    warnings.push({
      code: 'INVALID_EXECUTION_ID',
      message: `Render instruction "${model.instructionId}" has empty executionId.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.instructionName) {
    warnings.push({
      code: 'INVALID_INSTRUCTION_NAME',
      message: `Render instruction "${model.instructionId}" has empty instructionName.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_INSTRUCTION_TYPES.includes(model.instructionType)) {
    warnings.push({
      code: 'INVALID_INSTRUCTION_TYPE',
      message: `Render instruction "${model.instructionId}" has invalid instructionType "${model.instructionType}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.instructionOrder !== 'number') {
    warnings.push({
      code: 'INVALID_INSTRUCTION_ORDER',
      message: `Render instruction "${model.instructionId}" has invalid instructionOrder.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_INSTRUCTION_STATES.includes(model.instructionState)) {
    warnings.push({
      code: 'INVALID_INSTRUCTION_STATE',
      message: `Render instruction "${model.instructionId}" has invalid instructionState "${model.instructionState}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (
    typeof model.futureExecutionHints !== 'object' ||
    model.futureExecutionHints === null ||
    Array.isArray(model.futureExecutionHints)
  ) {
    warnings.push({
      code: 'INVALID_FUTURE_HINTS',
      message: `Render instruction "${model.instructionId}" has invalid futureExecutionHints.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateRenderScheduleModel(
  model: RenderScheduleModel,
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({
      code: 'INVALID_RENDER_SCHEDULE',
      message: 'Render schedule model is null, undefined, or not an object.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.scheduleId) {
    warnings.push({
      code: 'INVALID_SCHEDULE_ID',
      message: 'Render schedule ID is empty.',
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.runtimeId) {
    warnings.push({
      code: 'INVALID_RUNTIME_ID',
      message: `Render schedule "${model.scheduleId}" has empty runtimeId.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.scheduleName) {
    warnings.push({
      code: 'INVALID_SCHEDULE_NAME',
      message: `Render schedule "${model.scheduleId}" has empty scheduleName.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_SCHEDULE_TYPES.includes(model.scheduleType)) {
    warnings.push({
      code: 'INVALID_SCHEDULE_TYPE',
      message: `Render schedule "${model.scheduleId}" has invalid scheduleType "${model.scheduleType}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.scheduleOrder !== 'number') {
    warnings.push({
      code: 'INVALID_SCHEDULE_ORDER',
      message: `Render schedule "${model.scheduleId}" has invalid scheduleOrder.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_SCHEDULE_STATES.includes(model.scheduleState)) {
    warnings.push({
      code: 'INVALID_SCHEDULE_STATE',
      message: `Render schedule "${model.scheduleId}" has invalid scheduleState "${model.scheduleState}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (
    typeof model.futureExecutionHints !== 'object' ||
    model.futureExecutionHints === null ||
    Array.isArray(model.futureExecutionHints)
  ) {
    warnings.push({
      code: 'INVALID_FUTURE_HINTS',
      message: `Render schedule "${model.scheduleId}" has invalid futureExecutionHints.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateRenderExecutionIds(
  models: RenderExecutionModel[],
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.executionId)) {
      warnings.push({
        code: 'DUPLICATE_EXECUTION_ID',
        message: `Duplicate render execution ID "${model.executionId}".`,
      });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.executionId);
  }
  return warnings;
}

export function validateDuplicateRenderInstructionIds(
  models: RenderInstructionModel[],
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.instructionId)) {
      warnings.push({
        code: 'DUPLICATE_INSTRUCTION_ID',
        message: `Duplicate render instruction ID "${model.instructionId}".`,
      });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.instructionId);
  }
  return warnings;
}

export function validateDuplicateRenderScheduleIds(
  models: RenderScheduleModel[],
  warnPrefix = '[RenderExecution]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.scheduleId)) {
      warnings.push({
        code: 'DUPLICATE_SCHEDULE_ID',
        message: `Duplicate render schedule ID "${model.scheduleId}".`,
      });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.scheduleId);
  }
  return warnings;
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class RenderExecutionSynchronizer {
  private readonly renderExecutionRegistry = new RenderRegistry<RenderExecutionModel>();
  private readonly renderInstructionRegistry = new RenderRegistry<RenderInstructionModel>();
  private readonly renderScheduleRegistry = new RenderRegistry<RenderScheduleModel>();

  private readonly warnPrefix = '[RenderExecutionSynchronizer]';

  public get renderExecutions(): RenderRegistry<RenderExecutionModel> {
    return this.renderExecutionRegistry;
  }

  public get renderInstructions(): RenderRegistry<RenderInstructionModel> {
    return this.renderInstructionRegistry;
  }

  public get renderSchedules(): RenderRegistry<RenderScheduleModel> {
    return this.renderScheduleRegistry;
  }

  public buildSnapshot(
    executionModels: RenderExecutionModel[] = [],
    instructionModels: RenderInstructionModel[] = [],
    scheduleModels: RenderScheduleModel[] = [],
  ): RenderExecutionSnapshot {
    validateDuplicateRenderExecutionIds(executionModels, this.warnPrefix);
    validateDuplicateRenderInstructionIds(instructionModels, this.warnPrefix);
    validateDuplicateRenderScheduleIds(scheduleModels, this.warnPrefix);

    for (const m of executionModels) {
      validateRenderExecutionModel(m, this.warnPrefix);
      this.renderExecutionRegistry.register(m.executionId, m, this.warnPrefix);
    }
    for (const m of instructionModels) {
      validateRenderInstructionModel(m, this.warnPrefix);
      this.renderInstructionRegistry.register(m.instructionId, m, this.warnPrefix);
    }
    for (const m of scheduleModels) {
      validateRenderScheduleModel(m, this.warnPrefix);
      this.renderScheduleRegistry.register(m.scheduleId, m, this.warnPrefix);
    }

    return {
      renderExecutions: safeDeepCopy(executionModels),
      renderInstructions: safeDeepCopy(instructionModels),
      renderSchedules: safeDeepCopy(scheduleModels),
    };
  }

  public clear(): void {
    this.renderExecutionRegistry.clear();
    this.renderInstructionRegistry.clear();
    this.renderScheduleRegistry.clear();
  }

  public clone(): RenderExecutionSynchronizer {
    const cloned = new RenderExecutionSynchronizer();
    cloned.renderExecutionRegistry.fromJSON(
      this.renderExecutionRegistry.getAll(),
      r => r.executionId,
      this.warnPrefix,
    );
    cloned.renderInstructionRegistry.fromJSON(
      this.renderInstructionRegistry.getAll(),
      i => i.instructionId,
      this.warnPrefix,
    );
    cloned.renderScheduleRegistry.fromJSON(
      this.renderScheduleRegistry.getAll(),
      s => s.scheduleId,
      this.warnPrefix,
    );
    return cloned;
  }

  public toJSON(): {
    renderExecutions: RenderExecutionModel[];
    renderInstructions: RenderInstructionModel[];
    renderSchedules: RenderScheduleModel[];
  } {
    return {
      renderExecutions: this.renderExecutionRegistry.getAll(),
      renderInstructions: this.renderInstructionRegistry.getAll(),
      renderSchedules: this.renderScheduleRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    renderExecutions?: RenderExecutionModel[];
    renderInstructions?: RenderInstructionModel[];
    renderSchedules?: RenderScheduleModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.renderExecutions)) {
      for (const m of data.renderExecutions) {
        this.renderExecutionRegistry.register(m.executionId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderInstructions)) {
      for (const m of data.renderInstructions) {
        this.renderInstructionRegistry.register(m.instructionId, m, this.warnPrefix);
      }
    }
    if (Array.isArray(data.renderSchedules)) {
      for (const m of data.renderSchedules) {
        this.renderScheduleRegistry.register(m.scheduleId, m, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    renderExecutions?: RenderExecutionModel[];
    renderInstructions?: RenderInstructionModel[];
    renderSchedules?: RenderScheduleModel[];
  }): void {
    this.fromJSON(data);
  }
}
