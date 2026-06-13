import {
  VoltageVisualizationModel,
  CurrentVisualizationModel,
  LogicStateVisualizationModel,
  ActivityVisualizationModel,
  SignalFlowModel,
  LiveElectricalVisualizationSnapshot,
  LogicStateType,
  VisualizationStateType,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── Logic State Color Mapping ───────────────────────────────────────────────

export const LOGIC_STATE_GLOW_COLORS: Record<LogicStateType, number> = {
  HIGH: 0x22c55e,    // Green
  LOW: 0x6b7280,     // Gray
  PWM: 0x3b82f6,     // Blue
  FLOATING: 0xf59e0b, // Yellow
};

export function resolveGlowColor(logicState: LogicStateType): number {
  return LOGIC_STATE_GLOW_COLORS[logicState] ?? 0x6b7280;
}

export const VALID_VISUALIZATION_STATES: VisualizationStateType[] = [
  'ACTIVE', 'INACTIVE', 'TRANSITIONING'
];

export const VALID_LOGIC_STATES: LogicStateType[] = [
  'HIGH', 'LOW', 'PWM', 'FLOATING'
];

// ─── Factory Functions ────────────────────────────────────────────────────────

export function createDefaultVoltageVisualizationModel(
  voltageVizId = 'default_voltage_viz',
  overrides: Partial<VoltageVisualizationModel> = {},
): VoltageVisualizationModel {
  return {
    voltageVizId,
    nodeId: overrides.nodeId || '',
    voltageV: overrides.voltageV !== undefined ? overrides.voltageV : 0,
    normalizedLevel: overrides.normalizedLevel !== undefined ? overrides.normalizedLevel : 0,
    visualColor: overrides.visualColor !== undefined ? overrides.visualColor : 0x6b7280,
    visualState: overrides.visualState || 'INACTIVE',
    futureVoltageHints: {},
    ...overrides,
  };
}

export function createDefaultCurrentVisualizationModel(
  currentVizId = 'default_current_viz',
  overrides: Partial<CurrentVisualizationModel> = {},
): CurrentVisualizationModel {
  return {
    currentVizId,
    connectionId: overrides.connectionId || '',
    currentMa: overrides.currentMa !== undefined ? overrides.currentMa : 0,
    normalizedFlow: overrides.normalizedFlow !== undefined ? overrides.normalizedFlow : 0,
    flowDirection: overrides.flowDirection || 'NONE',
    visualState: overrides.visualState || 'INACTIVE',
    futureCurrentHints: {},
    ...overrides,
  };
}

export function createDefaultLogicStateVisualizationModel(
  logicVizId = 'default_logic_viz',
  overrides: Partial<LogicStateVisualizationModel> = {},
): LogicStateVisualizationModel {
  const logicState: LogicStateType = overrides.logicState || 'FLOATING';
  return {
    logicVizId,
    nodeId: overrides.nodeId || '',
    logicState,
    dutyCycle: overrides.dutyCycle !== undefined ? overrides.dutyCycle : 0,
    glowColor: overrides.glowColor !== undefined ? overrides.glowColor : resolveGlowColor(logicState),
    glowAlpha: overrides.glowAlpha !== undefined ? overrides.glowAlpha : 0.5,
    pulsePhase: overrides.pulsePhase !== undefined ? overrides.pulsePhase : 0,
    futureLogicHints: {},
    ...overrides,
  };
}

export function createDefaultActivityVisualizationModel(
  activityVizId = 'default_activity_viz',
  overrides: Partial<ActivityVisualizationModel> = {},
): ActivityVisualizationModel {
  return {
    activityVizId,
    componentId: overrides.componentId || '',
    componentType: overrides.componentType || 'GENERIC',
    isActive: overrides.isActive !== undefined ? overrides.isActive : false,
    brightness: overrides.brightness !== undefined ? overrides.brightness : 0,
    triggerActive: overrides.triggerActive !== undefined ? overrides.triggerActive : false,
    echoActive: overrides.echoActive !== undefined ? overrides.echoActive : false,
    measuredDistanceCm: overrides.measuredDistanceCm !== undefined ? overrides.measuredDistanceCm : 0,
    futureActivityHints: {},
    ...overrides,
  };
}

export function createDefaultSignalFlowModel(
  flowId = 'default_flow',
  overrides: Partial<SignalFlowModel> = {},
): SignalFlowModel {
  return {
    flowId,
    wireConnectionId: overrides.wireConnectionId || '',
    packetId: overrides.packetId || '',
    flowProgress: overrides.flowProgress !== undefined ? overrides.flowProgress : 0,
    flowColor: overrides.flowColor !== undefined ? overrides.flowColor : 0x22c55e,
    isActive: overrides.isActive !== undefined ? overrides.isActive : false,
    futureFlowHints: {},
    ...overrides,
  };
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateVoltageVisualizationModel(
  model: VoltageVisualizationModel,
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_VOLTAGE_VIZ', message: 'Voltage visualization model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.voltageVizId) {
    warnings.push({ code: 'INVALID_VOLTAGE_VIZ_ID', message: 'Voltage visualization ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.nodeId) {
    warnings.push({ code: 'INVALID_NODE_ID', message: `Voltage viz "${model.voltageVizId}" has empty nodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.voltageV !== 'number') {
    warnings.push({ code: 'INVALID_VOLTAGE', message: `Voltage viz "${model.voltageVizId}" has invalid voltageV.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.normalizedLevel !== 'number' || model.normalizedLevel < 0 || model.normalizedLevel > 1) {
    warnings.push({ code: 'INVALID_NORMALIZED_LEVEL', message: `Voltage viz "${model.voltageVizId}" has normalizedLevel out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISUALIZATION_STATES.includes(model.visualState as VisualizationStateType)) {
    warnings.push({ code: 'INVALID_VISUAL_STATE', message: `Voltage viz "${model.voltageVizId}" has invalid visualState "${model.visualState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateCurrentVisualizationModel(
  model: CurrentVisualizationModel,
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CURRENT_VIZ', message: 'Current visualization model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.currentVizId) {
    warnings.push({ code: 'INVALID_CURRENT_VIZ_ID', message: 'Current visualization ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.connectionId) {
    warnings.push({ code: 'INVALID_CONNECTION_ID', message: `Current viz "${model.currentVizId}" has empty connectionId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.normalizedFlow !== 'number' || model.normalizedFlow < 0 || model.normalizedFlow > 1) {
    warnings.push({ code: 'INVALID_NORMALIZED_FLOW', message: `Current viz "${model.currentVizId}" has normalizedFlow out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!['FORWARD', 'REVERSE', 'NONE'].includes(model.flowDirection)) {
    warnings.push({ code: 'INVALID_FLOW_DIRECTION', message: `Current viz "${model.currentVizId}" has invalid flowDirection "${model.flowDirection}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateLogicStateVisualizationModel(
  model: LogicStateVisualizationModel,
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_LOGIC_VIZ', message: 'Logic state visualization model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.logicVizId) {
    warnings.push({ code: 'INVALID_LOGIC_VIZ_ID', message: 'Logic state visualization ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.nodeId) {
    warnings.push({ code: 'INVALID_NODE_ID', message: `Logic viz "${model.logicVizId}" has empty nodeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_LOGIC_STATES.includes(model.logicState as LogicStateType)) {
    warnings.push({ code: 'INVALID_LOGIC_STATE', message: `Logic viz "${model.logicVizId}" has invalid logicState "${model.logicState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.dutyCycle !== 'number' || model.dutyCycle < 0 || model.dutyCycle > 1) {
    warnings.push({ code: 'INVALID_DUTY_CYCLE', message: `Logic viz "${model.logicVizId}" has dutyCycle out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.glowAlpha !== 'number' || model.glowAlpha < 0 || model.glowAlpha > 1) {
    warnings.push({ code: 'INVALID_GLOW_ALPHA', message: `Logic viz "${model.logicVizId}" has glowAlpha out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateActivityVisualizationModel(
  model: ActivityVisualizationModel,
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ACTIVITY_VIZ', message: 'Activity visualization model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.activityVizId) {
    warnings.push({ code: 'INVALID_ACTIVITY_VIZ_ID', message: 'Activity visualization ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'INVALID_COMPONENT_ID', message: `Activity viz "${model.activityVizId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.brightness !== 'number' || model.brightness < 0 || model.brightness > 1) {
    warnings.push({ code: 'INVALID_BRIGHTNESS', message: `Activity viz "${model.activityVizId}" has brightness out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.measuredDistanceCm !== 'number' || model.measuredDistanceCm < 0) {
    warnings.push({ code: 'INVALID_DISTANCE', message: `Activity viz "${model.activityVizId}" has invalid measuredDistanceCm.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSignalFlowModel(
  model: SignalFlowModel,
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_FLOW', message: 'Signal flow model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.flowId) {
    warnings.push({ code: 'INVALID_FLOW_ID', message: 'Signal flow ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.wireConnectionId) {
    warnings.push({ code: 'INVALID_WIRE_CONNECTION_ID', message: `Signal flow "${model.flowId}" has empty wireConnectionId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.flowProgress !== 'number' || model.flowProgress < 0 || model.flowProgress > 1) {
    warnings.push({ code: 'INVALID_FLOW_PROGRESS', message: `Signal flow "${model.flowId}" has flowProgress out of [0,1].` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── Duplicate ID Validators ──────────────────────────────────────────────────

export function validateDuplicateVoltageVizIds(
  models: VoltageVisualizationModel[],
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.voltageVizId)) {
      warnings.push({ code: 'DUPLICATE_VOLTAGE_VIZ_ID', message: `Duplicate voltage viz ID "${m.voltageVizId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.voltageVizId);
  }
  return warnings;
}

export function validateDuplicateCurrentVizIds(
  models: CurrentVisualizationModel[],
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.currentVizId)) {
      warnings.push({ code: 'DUPLICATE_CURRENT_VIZ_ID', message: `Duplicate current viz ID "${m.currentVizId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.currentVizId);
  }
  return warnings;
}

export function validateDuplicateLogicVizIds(
  models: LogicStateVisualizationModel[],
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.logicVizId)) {
      warnings.push({ code: 'DUPLICATE_LOGIC_VIZ_ID', message: `Duplicate logic viz ID "${m.logicVizId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.logicVizId);
  }
  return warnings;
}

export function validateDuplicateActivityVizIds(
  models: ActivityVisualizationModel[],
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.activityVizId)) {
      warnings.push({ code: 'DUPLICATE_ACTIVITY_VIZ_ID', message: `Duplicate activity viz ID "${m.activityVizId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.activityVizId);
  }
  return warnings;
}

export function validateDuplicateSignalFlowIds(
  models: SignalFlowModel[],
  warnPrefix = '[LiveElectricalViz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.flowId)) {
      warnings.push({ code: 'DUPLICATE_FLOW_ID', message: `Duplicate signal flow ID "${m.flowId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.flowId);
  }
  return warnings;
}

// ─── Synchronizer ─────────────────────────────────────────────────────────────

export class LiveElectricalVisualizationSynchronizer {
  private readonly voltageRegistry = new RenderRegistry<VoltageVisualizationModel>();
  private readonly currentRegistry = new RenderRegistry<CurrentVisualizationModel>();
  private readonly logicRegistry = new RenderRegistry<LogicStateVisualizationModel>();
  private readonly activityRegistry = new RenderRegistry<ActivityVisualizationModel>();
  private readonly flowRegistry = new RenderRegistry<SignalFlowModel>();

  private readonly warnPrefix = '[LiveElectricalVizSync]';

  public get voltageVisualizations(): RenderRegistry<VoltageVisualizationModel> {
    return this.voltageRegistry;
  }
  public get currentVisualizations(): RenderRegistry<CurrentVisualizationModel> {
    return this.currentRegistry;
  }
  public get logicStateVisualizations(): RenderRegistry<LogicStateVisualizationModel> {
    return this.logicRegistry;
  }
  public get activityVisualizations(): RenderRegistry<ActivityVisualizationModel> {
    return this.activityRegistry;
  }
  public get signalFlows(): RenderRegistry<SignalFlowModel> {
    return this.flowRegistry;
  }

  public buildSnapshot(
    voltages: VoltageVisualizationModel[] = [],
    currents: CurrentVisualizationModel[] = [],
    logics: LogicStateVisualizationModel[] = [],
    activities: ActivityVisualizationModel[] = [],
    flows: SignalFlowModel[] = [],
  ): LiveElectricalVisualizationSnapshot {
    validateDuplicateVoltageVizIds(voltages, this.warnPrefix);
    validateDuplicateCurrentVizIds(currents, this.warnPrefix);
    validateDuplicateLogicVizIds(logics, this.warnPrefix);
    validateDuplicateActivityVizIds(activities, this.warnPrefix);
    validateDuplicateSignalFlowIds(flows, this.warnPrefix);

    for (const m of voltages) {
      validateVoltageVisualizationModel(m, this.warnPrefix);
      this.voltageRegistry.register(m.voltageVizId, m, this.warnPrefix);
    }
    for (const m of currents) {
      validateCurrentVisualizationModel(m, this.warnPrefix);
      this.currentRegistry.register(m.currentVizId, m, this.warnPrefix);
    }
    for (const m of logics) {
      validateLogicStateVisualizationModel(m, this.warnPrefix);
      this.logicRegistry.register(m.logicVizId, m, this.warnPrefix);
    }
    for (const m of activities) {
      validateActivityVisualizationModel(m, this.warnPrefix);
      this.activityRegistry.register(m.activityVizId, m, this.warnPrefix);
    }
    for (const m of flows) {
      validateSignalFlowModel(m, this.warnPrefix);
      this.flowRegistry.register(m.flowId, m, this.warnPrefix);
    }

    return {
      voltageVisualizations: safeDeepCopy(voltages),
      currentVisualizations: safeDeepCopy(currents),
      logicStateVisualizations: safeDeepCopy(logics),
      activityVisualizations: safeDeepCopy(activities),
      signalFlows: safeDeepCopy(flows),
    };
  }

  public clear(): void {
    this.voltageRegistry.clear();
    this.currentRegistry.clear();
    this.logicRegistry.clear();
    this.activityRegistry.clear();
    this.flowRegistry.clear();
  }

  public clone(): LiveElectricalVisualizationSynchronizer {
    const cloned = new LiveElectricalVisualizationSynchronizer();
    cloned.voltageRegistry.fromJSON(this.voltageRegistry.getAll(), (m) => m.voltageVizId, this.warnPrefix);
    cloned.currentRegistry.fromJSON(this.currentRegistry.getAll(), (m) => m.currentVizId, this.warnPrefix);
    cloned.logicRegistry.fromJSON(this.logicRegistry.getAll(), (m) => m.logicVizId, this.warnPrefix);
    cloned.activityRegistry.fromJSON(this.activityRegistry.getAll(), (m) => m.activityVizId, this.warnPrefix);
    cloned.flowRegistry.fromJSON(this.flowRegistry.getAll(), (m) => m.flowId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): LiveElectricalVisualizationSnapshot {
    return {
      voltageVisualizations: safeDeepCopy(this.voltageRegistry.getAll()),
      currentVisualizations: safeDeepCopy(this.currentRegistry.getAll()),
      logicStateVisualizations: safeDeepCopy(this.logicRegistry.getAll()),
      activityVisualizations: safeDeepCopy(this.activityRegistry.getAll()),
      signalFlows: safeDeepCopy(this.flowRegistry.getAll()),
    };
  }

  public fromJSON(json: LiveElectricalVisualizationSnapshot): void {
    this.clear();
    if (!json) return;
    this.buildSnapshot(
      json.voltageVisualizations || [],
      json.currentVisualizations || [],
      json.logicStateVisualizations || [],
      json.activityVisualizations || [],
      json.signalFlows || [],
    );
  }
}
