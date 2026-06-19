// ═══════════════════════════════════════════════════════════════
// Phase 28B: GPIO Ownership System
// Tracks which component owns each GPIO pin and detects conflicts.
// ═══════════════════════════════════════════════════════════════

import type {
  GpioOwnershipModel, GpioDirection,
  GpioConflictModel, GpioConflictType, GpioConflictSeverity,
  GpioOwnershipSnapshot,
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

export const VALID_GPIO_DIRECTIONS: GpioDirection[] = [
  'INPUT', 'OUTPUT', 'BIDIRECTIONAL', 'POWER', 'GROUND', 'UNASSIGNED',
];

export const VALID_GPIO_CONFLICT_TYPES: GpioConflictType[] = [
  'DUPLICATE_OUTPUT', 'INVALID_WIRING', 'SHORT_CIRCUIT', 'MULTIPLE_DRIVERS', 'INPUT_ONLY_AS_OUTPUT', 'RESERVED_PIN',
];

export const VALID_GPIO_CONFLICT_SEVERITIES: GpioConflictSeverity[] = [
  'WARNING', 'ERROR', 'CRITICAL',
];

/** ESP32 pins that are input-only (no output capability) */
export const ESP32_INPUT_ONLY_PINS: number[] = [34, 35, 36, 39];

/** ESP32 pins reserved for flash / boot / UART0 — should warn if used */
export const ESP32_RESERVED_PINS: number[] = [0, 1, 3, 6, 7, 8, 9, 10, 11];

/** Total GPIO pin count on ESP32 */
export const ESP32_TOTAL_GPIO_COUNT = 40;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultGpioOwnershipModel(
  id: string,
  overrides: Partial<GpioOwnershipModel> = {},
): GpioOwnershipModel {
  return {
    gpioNumber: -1,
    componentId: '',
    componentType: '',
    pinName: '',
    direction: 'UNASSIGNED',
    claimedAt: 0,
    futureGpioOwnershipHints: {},
    ...overrides,
    ownershipId: id,
  };
}

export function createDefaultGpioConflictModel(
  id: string,
  overrides: Partial<GpioConflictModel> = {},
): GpioConflictModel {
  return {
    gpioNumber: -1,
    conflictType: 'DUPLICATE_OUTPUT',
    severity: 'ERROR',
    ownershipIds: [],
    description: '',
    futureGpioConflictHints: {},
    ...overrides,
    conflictId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateGpioOwnershipModel(
  model: GpioOwnershipModel,
  warnPrefix = '[GpioOwnership]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_OWNERSHIP', message: 'GPIO ownership model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.ownershipId) {
    warnings.push({ code: 'EMPTY_OWNERSHIP_ID', message: 'GPIO ownership ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.gpioNumber < 0 || model.gpioNumber >= ESP32_TOTAL_GPIO_COUNT) {
    warnings.push({ code: 'INVALID_GPIO_NUMBER', message: `GPIO ownership "${model.ownershipId}" has invalid gpioNumber ${model.gpioNumber}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'EMPTY_COMPONENT_ID', message: `GPIO ownership "${model.ownershipId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_GPIO_DIRECTIONS.includes(model.direction)) {
    warnings.push({ code: 'INVALID_DIRECTION', message: `GPIO ownership "${model.ownershipId}" has invalid direction "${model.direction}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateGpioConflictModel(
  model: GpioConflictModel,
  warnPrefix = '[GpioOwnership]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CONFLICT', message: 'GPIO conflict model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.conflictId) {
    warnings.push({ code: 'EMPTY_CONFLICT_ID', message: 'GPIO conflict ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_GPIO_CONFLICT_TYPES.includes(model.conflictType)) {
    warnings.push({ code: 'INVALID_CONFLICT_TYPE', message: `GPIO conflict "${model.conflictId}" has invalid conflictType "${model.conflictType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_GPIO_CONFLICT_SEVERITIES.includes(model.severity)) {
    warnings.push({ code: 'INVALID_SEVERITY', message: `GPIO conflict "${model.conflictId}" has invalid severity "${model.severity}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class GpioOwnershipSynchronizer {
  private readonly ownershipRegistry = new RenderRegistry<GpioOwnershipModel>();
  private readonly conflictRegistry = new RenderRegistry<GpioConflictModel>();
  private conflictCounter = 0;

  // ─── Ownership CRUD ─────────────────────────────────────────

  public registerOwnership(model: GpioOwnershipModel): void {
    this.ownershipRegistry.register(model.ownershipId, safeDeepCopy(model), '[GpioOwnership]');
  }
  public getOwnership(id: string): GpioOwnershipModel | undefined {
    return this.ownershipRegistry.lookup(id);
  }
  public getAllOwnerships(): GpioOwnershipModel[] {
    return this.ownershipRegistry.getAll();
  }
  public updateOwnership(id: string, updates: Partial<GpioOwnershipModel>): void {
    this.ownershipRegistry.update(id, updates, '[GpioOwnership]');
  }
  public removeOwnership(id: string): void {
    this.ownershipRegistry.remove(id);
  }
  public clearOwnerships(): void {
    this.ownershipRegistry.clear();
  }
  public getOwnershipKeys(): string[] {
    return this.ownershipRegistry.keys();
  }
  public hasOwnership(id: string): boolean {
    return this.ownershipRegistry.has(id);
  }

  // ─── Conflict CRUD ──────────────────────────────────────────

  public registerConflict(model: GpioConflictModel): void {
    this.conflictRegistry.register(model.conflictId, safeDeepCopy(model), '[GpioOwnership]');
  }
  public getConflict(id: string): GpioConflictModel | undefined {
    return this.conflictRegistry.lookup(id);
  }
  public getAllConflicts(): GpioConflictModel[] {
    return this.conflictRegistry.getAll();
  }
  public updateConflict(id: string, updates: Partial<GpioConflictModel>): void {
    this.conflictRegistry.update(id, updates, '[GpioOwnership]');
  }
  public removeConflict(id: string): void {
    this.conflictRegistry.remove(id);
  }
  public clearConflicts(): void {
    this.conflictRegistry.clear();
  }
  public getConflictKeys(): string[] {
    return this.conflictRegistry.keys();
  }
  public hasConflict(id: string): boolean {
    return this.conflictRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  public claimGpio(
    ownershipId: string,
    gpioNumber: number,
    componentId: string,
    componentType: string,
    pinName: string,
    direction: GpioDirection,
  ): { success: boolean; conflicts: GpioConflictModel[] } {
    const conflicts: GpioConflictModel[] = [];

    // Check for existing owners of this GPIO
    const existingOwnerships = this.getOwnershipsForGpio(gpioNumber);
    const sameComponentOwnership = existingOwnerships.find(o => o.componentId === componentId);

    if (sameComponentOwnership) {
      // Same component re-claiming — update
      this.updateOwnership(sameComponentOwnership.ownershipId, {
        direction,
        pinName,
        claimedAt: Date.now(),
      });
      return { success: true, conflicts: [] };
    }

    // Register the new ownership
    const ownership = createDefaultGpioOwnershipModel(ownershipId, {
      gpioNumber,
      componentId,
      componentType,
      pinName,
      direction,
      claimedAt: Date.now(),
    });
    this.registerOwnership(ownership);

    // Check for INPUT_ONLY_AS_OUTPUT
    if (ESP32_INPUT_ONLY_PINS.includes(gpioNumber) && (direction === 'OUTPUT' || direction === 'BIDIRECTIONAL')) {
      const conflictId = `conflict_${++this.conflictCounter}`;
      const conflict = createDefaultGpioConflictModel(conflictId, {
        gpioNumber,
        conflictType: 'INPUT_ONLY_AS_OUTPUT',
        severity: 'ERROR',
        ownershipIds: [ownershipId],
        description: `GPIO ${gpioNumber} is input-only but used as ${direction} by ${componentId}.`,
      });
      this.registerConflict(conflict);
      conflicts.push(conflict);
    }

    // Check for RESERVED_PIN
    if (ESP32_RESERVED_PINS.includes(gpioNumber)) {
      const conflictId = `conflict_${++this.conflictCounter}`;
      const conflict = createDefaultGpioConflictModel(conflictId, {
        gpioNumber,
        conflictType: 'RESERVED_PIN',
        severity: 'WARNING',
        ownershipIds: [ownershipId],
        description: `GPIO ${gpioNumber} is a reserved pin (flash/boot/UART0) used by ${componentId}.`,
      });
      this.registerConflict(conflict);
      conflicts.push(conflict);
    }

    // Check for DUPLICATE_OUTPUT or MULTIPLE_DRIVERS
    if (existingOwnerships.length > 0) {
      const outputOwnerships = existingOwnerships.filter(o => o.direction === 'OUTPUT' || o.direction === 'BIDIRECTIONAL');
      if (direction === 'OUTPUT' || direction === 'BIDIRECTIONAL') {
        if (outputOwnerships.length > 0) {
          const conflictId = `conflict_${++this.conflictCounter}`;
          const conflict = createDefaultGpioConflictModel(conflictId, {
            gpioNumber,
            conflictType: 'DUPLICATE_OUTPUT',
            severity: 'ERROR',
            ownershipIds: [ownershipId, ...outputOwnerships.map(o => o.ownershipId)],
            description: `GPIO ${gpioNumber} has multiple output drivers: ${componentId} and ${outputOwnerships.map(o => o.componentId).join(', ')}.`,
          });
          this.registerConflict(conflict);
          conflicts.push(conflict);
        }
      }

      // MULTIPLE_DRIVERS — more than 2 components on same GPIO
      if (existingOwnerships.length >= 2) {
        const conflictId = `conflict_${++this.conflictCounter}`;
        const allOwnershipIds = [ownershipId, ...existingOwnerships.map(o => o.ownershipId)];
        const conflict = createDefaultGpioConflictModel(conflictId, {
          gpioNumber,
          conflictType: 'MULTIPLE_DRIVERS',
          severity: 'WARNING',
          ownershipIds: allOwnershipIds,
          description: `GPIO ${gpioNumber} is used by ${allOwnershipIds.length} components.`,
        });
        this.registerConflict(conflict);
        conflicts.push(conflict);
      }
    }

    return { success: conflicts.filter(c => c.severity === 'ERROR' || c.severity === 'CRITICAL').length === 0, conflicts };
  }

  public releaseGpio(gpioNumber: number, componentId: string): void {
    const keys = this.getOwnershipKeys();
    for (const key of keys) {
      const ownership = this.getOwnership(key);
      if (ownership && ownership.gpioNumber === gpioNumber && ownership.componentId === componentId) {
        this.removeOwnership(key);

        // Remove related conflicts
        const conflictKeys = this.getConflictKeys();
        for (const ck of conflictKeys) {
          const conflict = this.getConflict(ck);
          if (conflict && conflict.gpioNumber === gpioNumber && conflict.ownershipIds.includes(key)) {
            this.removeConflict(ck);
          }
        }
      }
    }
  }

  public getGpioOwner(gpioNumber: number): GpioOwnershipModel | undefined {
    const all = this.getAllOwnerships();
    return all.find(o => o.gpioNumber === gpioNumber);
  }

  public getOwnershipsForGpio(gpioNumber: number): GpioOwnershipModel[] {
    return this.getAllOwnerships().filter(o => o.gpioNumber === gpioNumber);
  }

  public getComponentGpios(componentId: string): GpioOwnershipModel[] {
    return this.getAllOwnerships().filter(o => o.componentId === componentId);
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFLICT DETECTION
  // ═══════════════════════════════════════════════════════════════

  public detectConflicts(): GpioConflictModel[] {
    this.clearConflicts();
    this.conflictCounter = 0;
    const conflicts: GpioConflictModel[] = [];
    const allOwnerships = this.getAllOwnerships();

    // Group ownerships by GPIO number
    const byGpio = new Map<number, GpioOwnershipModel[]>();
    for (const o of allOwnerships) {
      if (!byGpio.has(o.gpioNumber)) {
        byGpio.set(o.gpioNumber, []);
      }
      byGpio.get(o.gpioNumber)!.push(o);
    }

    for (const [gpio, ownerships] of byGpio) {
      // DUPLICATE_OUTPUT
      const outputs = ownerships.filter(o => o.direction === 'OUTPUT' || o.direction === 'BIDIRECTIONAL');
      if (outputs.length > 1) {
        const conflictId = `conflict_${++this.conflictCounter}`;
        const conflict = createDefaultGpioConflictModel(conflictId, {
          gpioNumber: gpio,
          conflictType: 'DUPLICATE_OUTPUT',
          severity: 'ERROR',
          ownershipIds: outputs.map(o => o.ownershipId),
          description: `GPIO ${gpio} has ${outputs.length} output drivers.`,
        });
        this.registerConflict(conflict);
        conflicts.push(conflict);
      }

      // MULTIPLE_DRIVERS
      if (ownerships.length > 1) {
        const conflictId = `conflict_${++this.conflictCounter}`;
        const conflict = createDefaultGpioConflictModel(conflictId, {
          gpioNumber: gpio,
          conflictType: 'MULTIPLE_DRIVERS',
          severity: 'WARNING',
          ownershipIds: ownerships.map(o => o.ownershipId),
          description: `GPIO ${gpio} is shared by ${ownerships.length} components.`,
        });
        this.registerConflict(conflict);
        conflicts.push(conflict);
      }

      // INPUT_ONLY_AS_OUTPUT
      if (ESP32_INPUT_ONLY_PINS.includes(gpio)) {
        for (const o of ownerships) {
          if (o.direction === 'OUTPUT' || o.direction === 'BIDIRECTIONAL') {
            const conflictId = `conflict_${++this.conflictCounter}`;
            const conflict = createDefaultGpioConflictModel(conflictId, {
              gpioNumber: gpio,
              conflictType: 'INPUT_ONLY_AS_OUTPUT',
              severity: 'ERROR',
              ownershipIds: [o.ownershipId],
              description: `GPIO ${gpio} is input-only but used as ${o.direction}.`,
            });
            this.registerConflict(conflict);
            conflicts.push(conflict);
          }
        }
      }

      // RESERVED_PIN
      if (ESP32_RESERVED_PINS.includes(gpio)) {
        const conflictId = `conflict_${++this.conflictCounter}`;
        const conflict = createDefaultGpioConflictModel(conflictId, {
          gpioNumber: gpio,
          conflictType: 'RESERVED_PIN',
          severity: 'WARNING',
          ownershipIds: ownerships.map(o => o.ownershipId),
          description: `GPIO ${gpio} is a reserved pin.`,
        });
        this.registerConflict(conflict);
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  public detectShortCircuits(
    powerGpios: number[],
    groundGpios: number[],
    netConnections: Map<number, number[]>,
  ): GpioConflictModel[] {
    const conflicts: GpioConflictModel[] = [];

    for (const [gpio, connected] of netConnections) {
      const isPower = powerGpios.includes(gpio);
      const isGround = groundGpios.includes(gpio);

      if (isPower) {
        for (const connGpio of connected) {
          if (groundGpios.includes(connGpio)) {
            const conflictId = `conflict_${++this.conflictCounter}`;
            const conflict = createDefaultGpioConflictModel(conflictId, {
              gpioNumber: gpio,
              conflictType: 'SHORT_CIRCUIT',
              severity: 'CRITICAL',
              ownershipIds: [],
              description: `Short circuit: power GPIO ${gpio} connected to ground GPIO ${connGpio}.`,
            });
            this.registerConflict(conflict);
            conflicts.push(conflict);
          }
        }
      }
      if (isGround) {
        for (const connGpio of connected) {
          if (powerGpios.includes(connGpio)) {
            const conflictId = `conflict_${++this.conflictCounter}`;
            const conflict = createDefaultGpioConflictModel(conflictId, {
              gpioNumber: gpio,
              conflictType: 'SHORT_CIRCUIT',
              severity: 'CRITICAL',
              ownershipIds: [],
              description: `Short circuit: ground GPIO ${gpio} connected to power GPIO ${connGpio}.`,
            });
            this.registerConflict(conflict);
            conflicts.push(conflict);
          }
        }
      }
    }

    return conflicts;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  public getSnapshot(): GpioOwnershipSnapshot {
    return {
      ownerships: this.getAllOwnerships(),
      conflicts: this.getAllConflicts(),
    };
  }

  public clearAll(): void {
    this.clearOwnerships();
    this.clearConflicts();
    this.conflictCounter = 0;
  }
}
