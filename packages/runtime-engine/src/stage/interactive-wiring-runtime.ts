import {
  WiringSessionModel,
  WirePreviewModel,
  WireConnectionModel,
  PinConnectionModel,
  InteractiveWiringSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export const VALID_WIRE_COLORS = [
  'red',
  'black',
  'blue',
  'yellow',
  'green',
  'cyan',
  'orange',
  'purple',
];

// ─── Factories ───

export function createDefaultWiringSessionModel(
  sessionId = 'default_session',
  overrides: Partial<WiringSessionModel> = {},
): WiringSessionModel {
  return {
    sessionId,
    startPinId: overrides.startPinId || 'default_start_pin',
    currentColor: overrides.currentColor || 'red',
    currentPoints: overrides.currentPoints || [],
    isRoutingActive: overrides.isRoutingActive !== undefined ? overrides.isRoutingActive : true,
    futureSessionHints: {},
    ...overrides,
  };
}

export function createDefaultWirePreviewModel(
  previewId = 'default_preview',
  overrides: Partial<WirePreviewModel> = {},
): WirePreviewModel {
  return {
    previewId,
    points: overrides.points || [],
    color: overrides.color || 'red',
    isValidTarget: overrides.isValidTarget !== undefined ? overrides.isValidTarget : true,
    futurePreviewHints: {},
    ...overrides,
  };
}

export function createDefaultWireConnectionModel(
  connectionId = 'default_connection',
  overrides: Partial<WireConnectionModel> = {},
): WireConnectionModel {
  return {
    connectionId,
    startPinId: overrides.startPinId || 'default_start_pin',
    endPinId: overrides.endPinId || 'default_end_pin',
    color: overrides.color || 'red',
    routePoints: overrides.routePoints || [],
    futureConnectionHints: {},
    ...overrides,
  };
}

export function createDefaultPinConnectionModel(
  pinConnectionId = 'default_pin_conn',
  overrides: Partial<PinConnectionModel> = {},
): PinConnectionModel {
  return {
    pinConnectionId,
    pinId: overrides.pinId || 'default_pin',
    connectedWireIds: overrides.connectedWireIds || [],
    futurePinConnectionHints: {},
    ...overrides,
  };
}

// ─── Validators ───

export function validateWiringSessionModel(
  model: WiringSessionModel,
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SESSION', message: 'Wiring session model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.sessionId) {
    warnings.push({ code: 'INVALID_SESSION_ID', message: 'Wiring session ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.startPinId) {
    warnings.push({ code: 'INVALID_START_PIN_ID', message: `Wiring session "${model.sessionId}" has empty startPinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.currentColor && !VALID_WIRE_COLORS.includes(model.currentColor.toLowerCase())) {
    warnings.push({ code: 'INVALID_COLOR', message: `Wiring session "${model.sessionId}" has invalid color "${model.currentColor}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWirePreviewModel(
  model: WirePreviewModel,
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PREVIEW', message: 'Wire preview model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.previewId) {
    warnings.push({ code: 'INVALID_PREVIEW_ID', message: 'Wire preview ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.points)) {
    warnings.push({ code: 'INVALID_POINTS', message: `Wire preview "${model.previewId}" has invalid points list.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.color && !VALID_WIRE_COLORS.includes(model.color.toLowerCase())) {
    warnings.push({ code: 'INVALID_COLOR', message: `Wire preview "${model.previewId}" has invalid color "${model.color}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireConnectionModel(
  model: WireConnectionModel,
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CONNECTION', message: 'Wire connection model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.connectionId) {
    warnings.push({ code: 'INVALID_CONNECTION_ID', message: 'Wire connection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.startPinId) {
    warnings.push({ code: 'INVALID_START_PIN_ID', message: `Wire connection "${model.connectionId}" has empty startPinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.endPinId) {
    warnings.push({ code: 'INVALID_END_PIN_ID', message: `Wire connection "${model.connectionId}" has empty endPinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.startPinId && model.endPinId && model.startPinId === model.endPinId) {
    warnings.push({ code: 'SELF_CONNECTION', message: `Self-connection detected: pin "${model.startPinId}" connected to itself.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (model.color && !VALID_WIRE_COLORS.includes(model.color.toLowerCase())) {
    warnings.push({ code: 'INVALID_COLOR', message: `Wire connection "${model.connectionId}" has invalid color "${model.color}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePinConnectionModel(
  model: PinConnectionModel,
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PIN_CONN', message: 'Pin connection model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.pinConnectionId) {
    warnings.push({ code: 'INVALID_PIN_CONN_ID', message: 'Pin connection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.pinId) {
    warnings.push({ code: 'INVALID_PIN_ID', message: `Pin connection "${model.pinConnectionId}" has empty pinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.connectedWireIds)) {
    warnings.push({ code: 'INVALID_CONNECTED_WIRE_IDS', message: `Pin connection "${model.pinConnectionId}" has invalid connectedWireIds list.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── Duplicate ID Validators ───

export function validateDuplicateWiringSessionIds(
  models: WiringSessionModel[],
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.sessionId)) {
      warnings.push({ code: 'DUPLICATE_SESSION_ID', message: `Duplicate session ID "${m.sessionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.sessionId);
  }
  return warnings;
}

export function validateDuplicateWirePreviewIds(
  models: WirePreviewModel[],
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.previewId)) {
      warnings.push({ code: 'DUPLICATE_PREVIEW_ID', message: `Duplicate preview ID "${m.previewId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.previewId);
  }
  return warnings;
}

export function validateDuplicateWireConnectionIds(
  models: WireConnectionModel[],
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.connectionId)) {
      warnings.push({ code: 'DUPLICATE_CONNECTION_ID', message: `Duplicate connection ID "${m.connectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.connectionId);
  }
  return warnings;
}

export function validateDuplicatePinConnectionIds(
  models: PinConnectionModel[],
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.pinConnectionId)) {
      warnings.push({ code: 'DUPLICATE_PIN_CONN_ID', message: `Duplicate pin connection ID "${m.pinConnectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.pinConnectionId);
  }
  return warnings;
}

// ─── Connection validation rules (warning-only) ───

export function checkDuplicateWireConnection(
  model: WireConnectionModel,
  connections: WireConnectionModel[],
  warnPrefix = '[InteractiveWiring]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const normalizedStart = model.startPinId.toLowerCase();
  const normalizedEnd = model.endPinId.toLowerCase();

  for (const conn of connections) {
    if (conn.connectionId === model.connectionId) continue;
    const connStart = conn.startPinId.toLowerCase();
    const connEnd = conn.endPinId.toLowerCase();
    if (
      (connStart === normalizedStart && connEnd === normalizedEnd) ||
      (connStart === normalizedEnd && connEnd === normalizedStart)
    ) {
      warnings.push({
        code: 'DUPLICATE_CONNECTION',
        message: `Duplicate connection: wire already exists between "${model.startPinId}" and "${model.endPinId}".`,
      });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      break;
    }
  }
  return warnings;
}

// ─── Synchronizer ───

export class InteractiveWiringSynchronizer {
  private readonly sessionRegistry = new RenderRegistry<WiringSessionModel>();
  private readonly previewRegistry = new RenderRegistry<WirePreviewModel>();
  private readonly connectionRegistry = new RenderRegistry<WireConnectionModel>();
  private readonly pinConnRegistry = new RenderRegistry<PinConnectionModel>();

  private readonly warnPrefix = '[InteractiveWiringSynchronizer]';

  public get wiringSessions(): RenderRegistry<WiringSessionModel> {
    return this.sessionRegistry;
  }

  public get wirePreviews(): RenderRegistry<WirePreviewModel> {
    return this.previewRegistry;
  }

  public get wireConnections(): RenderRegistry<WireConnectionModel> {
    return this.connectionRegistry;
  }

  public get pinConnections(): RenderRegistry<PinConnectionModel> {
    return this.pinConnRegistry;
  }

  public buildSnapshot(
    sessions: WiringSessionModel[] = [],
    previews: WirePreviewModel[] = [],
    connections: WireConnectionModel[] = [],
    pinConns: PinConnectionModel[] = [],
  ): InteractiveWiringSnapshot {
    validateDuplicateWiringSessionIds(sessions, this.warnPrefix);
    validateDuplicateWirePreviewIds(previews, this.warnPrefix);
    validateDuplicateWireConnectionIds(connections, this.warnPrefix);
    validateDuplicatePinConnectionIds(pinConns, this.warnPrefix);

    for (const m of sessions) {
      validateWiringSessionModel(m, this.warnPrefix);
      this.sessionRegistry.register(m.sessionId, m, this.warnPrefix);
    }
    for (const m of previews) {
      validateWirePreviewModel(m, this.warnPrefix);
      this.previewRegistry.register(m.previewId, m, this.warnPrefix);
    }
    for (const m of connections) {
      validateWireConnectionModel(m, this.warnPrefix);
      checkDuplicateWireConnection(m, connections, this.warnPrefix);
      this.connectionRegistry.register(m.connectionId, m, this.warnPrefix);
    }
    for (const m of pinConns) {
      validatePinConnectionModel(m, this.warnPrefix);
      this.pinConnRegistry.register(m.pinConnectionId, m, this.warnPrefix);
    }

    return {
      wiringSessions: safeDeepCopy(sessions),
      wirePreviews: safeDeepCopy(previews),
      wireConnections: safeDeepCopy(connections),
      pinConnections: safeDeepCopy(pinConns),
    };
  }

  public clear(): void {
    this.sessionRegistry.clear();
    this.previewRegistry.clear();
    this.connectionRegistry.clear();
    this.pinConnRegistry.clear();
  }

  public clone(): InteractiveWiringSynchronizer {
    const cloned = new InteractiveWiringSynchronizer();
    cloned.sessionRegistry.fromJSON(
      this.sessionRegistry.getAll(),
      (s) => s.sessionId,
      this.warnPrefix,
    );
    cloned.previewRegistry.fromJSON(
      this.previewRegistry.getAll(),
      (p) => p.previewId,
      this.warnPrefix,
    );
    cloned.connectionRegistry.fromJSON(
      this.connectionRegistry.getAll(),
      (c) => c.connectionId,
      this.warnPrefix,
    );
    cloned.pinConnRegistry.fromJSON(
      this.pinConnRegistry.getAll(),
      (pc) => pc.pinConnectionId,
      this.warnPrefix,
    );
    return cloned;
  }

  public toJSON(): InteractiveWiringSnapshot {
    return {
      wiringSessions: safeDeepCopy(this.sessionRegistry.getAll()),
      wirePreviews: safeDeepCopy(this.previewRegistry.getAll()),
      wireConnections: safeDeepCopy(this.connectionRegistry.getAll()),
      pinConnections: safeDeepCopy(this.pinConnRegistry.getAll()),
    };
  }

  public fromJSON(json: InteractiveWiringSnapshot): void {
    this.clear();
    if (!json) return;
    this.buildSnapshot(
      json.wiringSessions || [],
      json.wirePreviews || [],
      json.wireConnections || [],
      json.pinConnections || [],
    );
  }
}
