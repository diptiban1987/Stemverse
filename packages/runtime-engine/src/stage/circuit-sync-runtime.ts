// ═══════════════════════════════════════════════════════════════
// Phase 28B: Circuit Sync Runtime
// Orchestrates the simulation synchronization pipeline:
// Circuit Graph → Electrical Connectivity → Signal Propagation
// → Virtual ESP32 → Visual Feedback → Blockly Status
// Also provides Serial Monitor and Logic Analyzer linking.
// ═══════════════════════════════════════════════════════════════

import type {
  CircuitSyncModel, CircuitSyncState, CircuitSyncSnapshot,
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

export const VALID_CIRCUIT_SYNC_STATES: CircuitSyncState[] = [
  'IDLE', 'SYNCING', 'SYNCHRONIZED', 'DIRTY', 'ERROR',
];

export const MAX_SYNC_ERROR_LOG_SIZE = 100;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultCircuitSyncModel(
  id: string,
  overrides: Partial<CircuitSyncModel> = {},
): CircuitSyncModel {
  return {
    syncState: 'IDLE',
    graphVersion: 0,
    lastSyncTick: 0,
    isDirty: false,
    lastGraphId: '',
    lastProgramId: '',
    errorLog: [],
    futureCircuitSyncHints: {},
    ...overrides,
    syncId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateCircuitSyncModel(
  model: CircuitSyncModel,
  warnPrefix = '[CircuitSync]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SYNC_MODEL', message: 'Circuit sync model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.syncId) {
    warnings.push({ code: 'EMPTY_SYNC_ID', message: 'Circuit sync ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_CIRCUIT_SYNC_STATES.includes(model.syncState)) {
    warnings.push({ code: 'INVALID_SYNC_STATE', message: `Circuit sync "${model.syncId}" has invalid syncState "${model.syncState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.graphVersion !== 'number') {
    warnings.push({ code: 'INVALID_GRAPH_VERSION', message: `Circuit sync "${model.syncId}" has invalid graphVersion.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.lastSyncTick !== 'number') {
    warnings.push({ code: 'INVALID_LAST_SYNC_TICK', message: `Circuit sync "${model.syncId}" has invalid lastSyncTick.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isDirty !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_DIRTY', message: `Circuit sync "${model.syncId}" has invalid isDirty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.errorLog)) {
    warnings.push({ code: 'INVALID_ERROR_LOG', message: `Circuit sync "${model.syncId}" has invalid errorLog.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SERIAL MONITOR LINKING
// ═══════════════════════════════════════════════════════════════

export interface SerialOutputLink {
  text: string;
  componentId: string;
}

/**
 * Given a Blockly instruction and component context,
 * determines if this produces serial output.
 * Returns null if the instruction does not produce serial output.
 */
export function linkSerialOutput(
  instruction: { opcode: string; args: Record<string, unknown> },
  componentId: string,
): SerialOutputLink | null {
  if (!instruction || !instruction.opcode) return null;

  const opcode = instruction.opcode.toUpperCase();
  if (opcode === 'NOP' && instruction.args) {
    const desc = String(instruction.args.description || '');
    if (desc.includes('PRINT') || desc.includes('SERIAL')) {
      const text = String(instruction.args.text || instruction.args.value || desc);
      return { text, componentId };
    }
  }

  // Future: support explicit SERIAL_PRINT opcode
  if (opcode === 'SERIAL_PRINT' || opcode === 'SERIAL_PRINTLN') {
    const text = String(instruction.args?.text || instruction.args?.value || '');
    return { text, componentId };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// LOGIC ANALYZER LINKING
// ═══════════════════════════════════════════════════════════════

export interface LogicAnalyzerSample {
  pinNumber: number;
  level: string;
  timestamp: number;
}

/**
 * Given a GPIO state change, produces a logic analyzer sample.
 * Returns null if the state did not change.
 */
export function linkLogicAnalyzerSample(
  gpioNumber: number,
  previousState: string,
  currentState: string,
  tick: number,
): LogicAnalyzerSample | null {
  if (previousState === currentState) return null;
  if (typeof gpioNumber !== 'number' || gpioNumber < 0) return null;

  let level = 'UNKNOWN';
  const upper = currentState.toUpperCase();
  if (upper === 'HIGH' || upper === '1') {
    level = 'HIGH';
  } else if (upper === 'LOW' || upper === '0') {
    level = 'LOW';
  } else if (upper === 'FLOATING' || upper === 'Z') {
    level = 'Z';
  }

  return {
    pinNumber: gpioNumber,
    level,
    timestamp: tick,
  };
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class CircuitSyncSynchronizer {
  private readonly syncRegistry = new RenderRegistry<CircuitSyncModel>();

  // ─── CRUD ───────────────────────────────────────────────────

  public registerSync(model: CircuitSyncModel): void {
    this.syncRegistry.register(model.syncId, safeDeepCopy(model), '[CircuitSync]');
  }
  public getSync(id: string): CircuitSyncModel | undefined {
    return this.syncRegistry.lookup(id);
  }
  public getAllSyncs(): CircuitSyncModel[] {
    return this.syncRegistry.getAll();
  }
  public updateSync(id: string, updates: Partial<CircuitSyncModel>): void {
    this.syncRegistry.update(id, updates, '[CircuitSync]');
  }
  public removeSync(id: string): void {
    this.syncRegistry.remove(id);
  }
  public clearSyncs(): void {
    this.syncRegistry.clear();
  }
  public getSyncKeys(): string[] {
    return this.syncRegistry.keys();
  }
  public hasSync(id: string): boolean {
    return this.syncRegistry.has(id);
  }

  // ─── ORCHESTRATION ──────────────────────────────────────────

  public markDirty(syncId: string): void {
    const existing = this.getSync(syncId);
    if (!existing) {
      console.warn(`[CircuitSync] Cannot mark dirty: sync "${syncId}" not found.`);
      return;
    }
    this.updateSync(syncId, {
      syncState: 'DIRTY',
      isDirty: true,
    });
  }

  public markSyncing(syncId: string): void {
    const existing = this.getSync(syncId);
    if (!existing) {
      console.warn(`[CircuitSync] Cannot mark syncing: sync "${syncId}" not found.`);
      return;
    }
    this.updateSync(syncId, {
      syncState: 'SYNCING',
    });
  }

  public markSynchronized(syncId: string, graphVersion: number, tick: number): void {
    const existing = this.getSync(syncId);
    if (!existing) {
      console.warn(`[CircuitSync] Cannot mark synchronized: sync "${syncId}" not found.`);
      return;
    }
    this.updateSync(syncId, {
      syncState: 'SYNCHRONIZED',
      graphVersion,
      lastSyncTick: tick,
      isDirty: false,
    });
  }

  public markError(syncId: string, error: string): void {
    const existing = this.getSync(syncId);
    if (!existing) {
      console.warn(`[CircuitSync] Cannot mark error: sync "${syncId}" not found.`);
      return;
    }
    const errorLog = [...(existing.errorLog || [])];
    errorLog.push(error);
    // Cap error log size
    while (errorLog.length > MAX_SYNC_ERROR_LOG_SIZE) {
      errorLog.shift();
    }
    this.updateSync(syncId, {
      syncState: 'ERROR',
      isDirty: true,
      errorLog,
    });
  }

  public setLastGraphId(syncId: string, graphId: string): void {
    this.updateSync(syncId, { lastGraphId: graphId });
  }

  public setLastProgramId(syncId: string, programId: string): void {
    this.updateSync(syncId, { lastProgramId: programId });
  }

  public getDirtySyncs(): CircuitSyncModel[] {
    return this.getAllSyncs().filter(s => s.isDirty || s.syncState === 'DIRTY');
  }

  public getErrorSyncs(): CircuitSyncModel[] {
    return this.getAllSyncs().filter(s => s.syncState === 'ERROR');
  }

  // ─── SNAPSHOT & LIFECYCLE ───────────────────────────────────

  public getSnapshot(): CircuitSyncSnapshot {
    return {
      syncModels: this.getAllSyncs(),
    };
  }

  public clearAll(): void {
    this.clearSyncs();
  }
}
