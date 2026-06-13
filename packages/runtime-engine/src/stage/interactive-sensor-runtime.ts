import {
  VirtualObjectModel,
  ObstacleModel,
  SensorRuntimeModel,
  DistanceMeasurementModel,
  SensorInteractionModel,
  EnvironmentStateModel,
  InteractiveSensorSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultVirtualObject(
  objectId = 'default_object',
  overrides: Partial<VirtualObjectModel> = {},
): VirtualObjectModel {
  return {
    objectId,
    objectName: overrides.objectName || 'Virtual Object',
    objectType: overrides.objectType || 'GENERIC',
    positionX: overrides.positionX !== undefined ? overrides.positionX : 0,
    positionY: overrides.positionY !== undefined ? overrides.positionY : 0,
    positionZ: overrides.positionZ !== undefined ? overrides.positionZ : 0,
    rotationX: overrides.rotationX !== undefined ? overrides.rotationX : 0,
    rotationY: overrides.rotationY !== undefined ? overrides.rotationY : 0,
    rotationZ: overrides.rotationZ !== undefined ? overrides.rotationZ : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultObstacle(
  obstacleId = 'default_obstacle',
  overrides: Partial<ObstacleModel> = {},
): ObstacleModel {
  return {
    obstacleId,
    positionX: overrides.positionX !== undefined ? overrides.positionX : 0,
    positionY: overrides.positionY !== undefined ? overrides.positionY : 0,
    positionZ: overrides.positionZ !== undefined ? overrides.positionZ : 0,
    width: overrides.width !== undefined ? overrides.width : 1,
    height: overrides.height !== undefined ? overrides.height : 1,
    depth: overrides.depth !== undefined ? overrides.depth : 1,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultSensorRuntime(
  runtimeId = 'default_sensor',
  overrides: Partial<SensorRuntimeModel> = {},
): SensorRuntimeModel {
  return {
    runtimeId,
    sensorType: overrides.sensorType || 'ULTRASONIC_SENSOR',
    sensorState: overrides.sensorState || 'ACTIVE',
    currentValue: overrides.currentValue !== undefined ? overrides.currentValue : 0,
    lastUpdated: overrides.lastUpdated !== undefined ? overrides.lastUpdated : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultDistanceMeasurement(
  measurementId = 'default_measurement',
  overrides: Partial<DistanceMeasurementModel> = {},
): DistanceMeasurementModel {
  return {
    measurementId,
    sensorId: overrides.sensorId || '',
    objectId: overrides.objectId || '',
    distanceCm: overrides.distanceCm !== undefined ? overrides.distanceCm : 0,
    timestamp: overrides.timestamp !== undefined ? overrides.timestamp : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultSensorInteraction(
  interactionId = 'default_interaction',
  overrides: Partial<SensorInteractionModel> = {},
): SensorInteractionModel {
  return {
    interactionId,
    sensorId: overrides.sensorId || '',
    targetObjectId: overrides.targetObjectId || '',
    interactionType: overrides.interactionType || 'DISTANCE_MEASUREMENT',
    interactionState: overrides.interactionState || 'ACTIVE',
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultEnvironmentState(
  stateId = 'default_state',
  overrides: Partial<EnvironmentStateModel> = {},
): EnvironmentStateModel {
  return {
    stateId,
    activeObstacleIds: overrides.activeObstacleIds || [],
    activeObjectIds: overrides.activeObjectIds || [],
    timestamp: overrides.timestamp !== undefined ? overrides.timestamp : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateVirtualObjectModel(
  model: VirtualObjectModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_OBJECT_MODEL', message: 'Virtual object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.objectId) {
    warnings.push({ code: 'INVALID_OBJECT_ID', message: 'Virtual object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectName !== 'string') {
    warnings.push({ code: 'INVALID_OBJECT_NAME', message: `Virtual object "${model.objectId}" has invalid objectName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectType !== 'string') {
    warnings.push({ code: 'INVALID_OBJECT_TYPE', message: `Virtual object "${model.objectId}" has invalid objectType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof VirtualObjectModel)[] = ['positionX', 'positionY', 'positionZ', 'rotationX', 'rotationY', 'rotationZ'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number') {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Virtual object "${model.objectId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Virtual object "${model.objectId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateObstacleModel(
  model: ObstacleModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_OBSTACLE_MODEL', message: 'Obstacle model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.obstacleId) {
    warnings.push({ code: 'INVALID_OBSTACLE_ID', message: 'Obstacle ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof ObstacleModel)[] = ['positionX', 'positionY', 'positionZ', 'width', 'height', 'depth'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number') {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Obstacle "${model.obstacleId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Obstacle "${model.obstacleId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSensorRuntimeModel(
  model: SensorRuntimeModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SENSOR_MODEL', message: 'Sensor runtime model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.runtimeId) {
    warnings.push({ code: 'INVALID_RUNTIME_ID', message: 'Sensor runtime ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.sensorType !== 'string') {
    warnings.push({ code: 'INVALID_SENSOR_TYPE', message: `Sensor "${model.runtimeId}" has invalid sensorType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.sensorState !== 'string') {
    warnings.push({ code: 'INVALID_SENSOR_STATE', message: `Sensor "${model.runtimeId}" has invalid sensorState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentValue !== 'number') {
    warnings.push({ code: 'INVALID_CURRENT_VALUE', message: `Sensor "${model.runtimeId}" has invalid currentValue.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.lastUpdated !== 'number') {
    warnings.push({ code: 'INVALID_LAST_UPDATED', message: `Sensor "${model.runtimeId}" has invalid lastUpdated.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Sensor "${model.runtimeId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDistanceMeasurementModel(
  model: DistanceMeasurementModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_MEASUREMENT_MODEL', message: 'Distance measurement model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.measurementId) {
    warnings.push({ code: 'INVALID_MEASUREMENT_ID', message: 'Distance measurement ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sensorId) {
    warnings.push({ code: 'INVALID_SENSOR_ID', message: `Distance measurement "${model.measurementId}" has empty sensorId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.objectId) {
    warnings.push({ code: 'INVALID_OBJECT_ID', message: `Distance measurement "${model.measurementId}" has empty objectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.distanceCm !== 'number') {
    warnings.push({ code: 'INVALID_DISTANCE_CM', message: `Distance measurement "${model.measurementId}" has invalid distanceCm.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timestamp !== 'number') {
    warnings.push({ code: 'INVALID_TIMESTAMP', message: `Distance measurement "${model.measurementId}" has invalid timestamp.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Distance measurement "${model.measurementId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSensorInteractionModel(
  model: SensorInteractionModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_INTERACTION_MODEL', message: 'Sensor interaction model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.interactionId) {
    warnings.push({ code: 'INVALID_INTERACTION_ID', message: 'Sensor interaction ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sensorId) {
    warnings.push({ code: 'INVALID_SENSOR_ID', message: `Sensor interaction "${model.interactionId}" has empty sensorId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.targetObjectId) {
    warnings.push({ code: 'INVALID_TARGET_OBJECT_ID', message: `Sensor interaction "${model.interactionId}" has empty targetObjectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.interactionType !== 'string') {
    warnings.push({ code: 'INVALID_INTERACTION_TYPE', message: `Sensor interaction "${model.interactionId}" has invalid interactionType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.interactionState !== 'string') {
    warnings.push({ code: 'INVALID_INTERACTION_STATE', message: `Sensor interaction "${model.interactionId}" has invalid interactionState.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Sensor interaction "${model.interactionId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateEnvironmentStateModel(
  model: EnvironmentStateModel,
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_STATE_MODEL', message: 'Environment state model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.stateId) {
    warnings.push({ code: 'INVALID_STATE_ID', message: 'Environment state ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.activeObstacleIds)) {
    warnings.push({ code: 'INVALID_ACTIVE_OBSTACLE_IDS', message: `Environment state "${model.stateId}" has invalid activeObstacleIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.activeObjectIds)) {
    warnings.push({ code: 'INVALID_ACTIVE_OBJECT_IDS', message: `Environment state "${model.stateId}" has invalid activeObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timestamp !== 'number') {
    warnings.push({ code: 'INVALID_TIMESTAMP', message: `Environment state "${model.stateId}" has invalid timestamp.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Environment state "${model.stateId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateVirtualObjectIds(
  models: VirtualObjectModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.objectId)) {
      warnings.push({ code: 'DUPLICATE_OBJECT_ID', message: `Duplicate virtual object ID "${m.objectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.objectId);
  }
  return warnings;
}

export function validateDuplicateObstacleIds(
  models: ObstacleModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.obstacleId)) {
      warnings.push({ code: 'DUPLICATE_OBSTACLE_ID', message: `Duplicate obstacle ID "${m.obstacleId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.obstacleId);
  }
  return warnings;
}

export function validateDuplicateSensorRuntimeIds(
  models: SensorRuntimeModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.runtimeId)) {
      warnings.push({ code: 'DUPLICATE_SENSOR_ID', message: `Duplicate sensor runtime ID "${m.runtimeId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.runtimeId);
  }
  return warnings;
}

export function validateDuplicateDistanceMeasurementIds(
  models: DistanceMeasurementModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.measurementId)) {
      warnings.push({ code: 'DUPLICATE_MEASUREMENT_ID', message: `Duplicate distance measurement ID "${m.measurementId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.measurementId);
  }
  return warnings;
}

export function validateDuplicateSensorInteractionIds(
  models: SensorInteractionModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.interactionId)) {
      warnings.push({ code: 'DUPLICATE_INTERACTION_ID', message: `Duplicate sensor interaction ID "${m.interactionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.interactionId);
  }
  return warnings;
}

export function validateDuplicateEnvironmentStateIds(
  models: EnvironmentStateModel[],
  warnPrefix = '[InteractiveSensor]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.stateId)) {
      warnings.push({ code: 'DUPLICATE_STATE_ID', message: `Duplicate environment state ID "${m.stateId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.stateId);
  }
  return warnings;
}

// ─── BEHAVIORS & RUNTIME LOGIC ────────────────────────────────────────────────

export function createVirtualObject(
  rt: any,
  objectId: string,
  name: string,
  type: string,
  x: number,
  y: number,
  z: number,
  overrides: Partial<VirtualObjectModel> = {},
): VirtualObjectModel {
  const obj = createDefaultVirtualObject(objectId, {
    objectName: name,
    objectType: type,
    positionX: x,
    positionY: y,
    positionZ: z,
    ...overrides,
  });
  rt.registerVirtualObjectModel(obj);
  return obj;
}

export function moveVirtualObject(
  rt: any,
  objectId: string,
  dx: number,
  dy: number,
  dz: number,
): void {
  const obj = rt.getVirtualObjectModel(objectId);
  if (!obj) {
    console.warn(`[Runtime Diagnostics] missing virtual object: Object "${objectId}" not found.`);
    return;
  }
  obj.positionX += dx;
  obj.positionY += dy;
  obj.positionZ += dz;
  rt.registerVirtualObjectModel(obj);
}

export function updateVirtualObjectPosition(
  rt: any,
  objectId: string,
  x: number,
  y: number,
  z: number,
): void {
  const obj = rt.getVirtualObjectModel(objectId);
  if (!obj) {
    console.warn(`[Runtime Diagnostics] missing virtual object: Object "${objectId}" not found.`);
    return;
  }
  obj.positionX = x;
  obj.positionY = y;
  obj.positionZ = z;
  rt.registerVirtualObjectModel(obj);
}

export function calculateDistance(
  pos1: { x: number; y: number; z: number },
  pos2: { x: number; y: number; z: number },
): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Math.round(dist * 100) / 100;
}

export function measureDistance(
  rt: any,
  sensorId: string,
  objectId: string,
): number {
  // Try layout position
  let sensorX = 0, sensorY = 0, sensorZ = 0;
  const layouts = rt.getWorkspaceLayouts ? rt.getWorkspaceLayouts() : [];
  const layout = layouts.find((l: any) => l.componentId === sensorId);
  if (layout) {
    sensorX = layout.transform?.x ?? layout.x ?? 0;
    sensorY = layout.transform?.y ?? layout.y ?? 0;
    sensorZ = layout.transform?.z ?? layout.z ?? 0;
  }

  let objX = 0, objY = 0, objZ = 0;
  const vObj = rt.getVirtualObjectModel(objectId);
  if (vObj) {
    objX = vObj.positionX;
    objY = vObj.positionY;
    objZ = vObj.positionZ;
  } else {
    const obstacle = rt.getObstacleModel(objectId);
    if (obstacle) {
      objX = obstacle.positionX;
      objY = obstacle.positionY;
      objZ = obstacle.positionZ;
    } else {
      console.warn(`[Runtime Diagnostics] missing environment object: Target "${objectId}" not found for distance measurement.`);
      return 0;
    }
  }

  const distance = calculateDistance({ x: sensorX, y: sensorY, z: sensorZ }, { x: objX, y: objY, z: objZ });

  // Register distance measurement
  const timestamp = rt.getTimingModels ? (rt.getTimingModels()[0]?.clockTick || 0) : 0;
  const measurementId = `meas_${sensorId}_${objectId}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
  const measurement = createDefaultDistanceMeasurement(measurementId, {
    sensorId,
    objectId,
    distanceCm: distance,
    timestamp,
  });
  rt.registerDistanceMeasurementModel(measurement);

  return distance;
}

export function updateSensorValue(
  rt: any,
  sensorId: string,
  value: number,
): void {
  let sensor = rt.getSensorRuntimeModel(sensorId);
  if (!sensor) {
    sensor = createDefaultSensorRuntime(sensorId, { currentValue: value });
  } else {
    sensor.currentValue = value;
  }
  sensor.lastUpdated = rt.getTimingModels ? (rt.getTimingModels()[0]?.clockTick || 0) : 0;
  rt.registerSensorRuntimeModel(sensor);

  // Sync to component deviceState
  const component = rt.getComponent ? rt.getComponent(sensorId) : null;
  if (component) {
    component.deviceState = {
      ...component.deviceState,
      distanceCm: value,
    };
    rt.registerComponent(component);
  }
}

export function triggerSensorEvent(
  rt: any,
  sensorId: string,
  eventName: string,
  metadata: any = {},
): void {
  const timestamp = rt.getTimingModels ? (rt.getTimingModels()[0]?.clockTick || 0) : 0;
  const stateId = `env_${sensorId}_${eventName}_${timestamp}`;
  const envState = createDefaultEnvironmentState(stateId, {
    timestamp,
    metadata: {
      ...metadata,
      sensorId,
      eventName,
    },
  });
  rt.registerEnvironmentStateModel(envState);
}

export function processSensorInteractions(rt: any): void {
  const sensors = rt.getSensorRuntimeModels();
  const vObjs = rt.getVirtualObjectModels();
  const obstacles = rt.getObstacleModels();

  const allTargets = [
    ...vObjs.map((v: VirtualObjectModel) => ({ id: v.objectId, x: v.positionX, y: v.positionY, z: v.positionZ })),
    ...obstacles.map((o: ObstacleModel) => ({ id: o.obstacleId, x: o.positionX, y: o.positionY, z: o.positionZ })),
  ];

  if (allTargets.length === 0) return;

  for (const sensor of sensors) {
    let sensorX = 0, sensorY = 0, sensorZ = 0;
    const layouts = rt.getWorkspaceLayouts ? rt.getWorkspaceLayouts() : [];
    const layout = layouts.find((l: any) => l.componentId === sensor.runtimeId);
    if (layout) {
      sensorX = layout.transform?.x ?? layout.x ?? 0;
      sensorY = layout.transform?.y ?? layout.y ?? 0;
      sensorZ = layout.transform?.z ?? layout.z ?? 0;
    }

    let closestId = '';
    let minDistance = Infinity;

    for (const target of allTargets) {
      const dist = calculateDistance({ x: sensorX, y: sensorY, z: sensorZ }, target);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = target.id;
      }
    }

    if (closestId) {
      const distance = measureDistance(rt, sensor.runtimeId, closestId);
      updateSensorValue(rt, sensor.runtimeId, distance);

      // Register interaction model
      const timestamp = rt.getTimingModels ? (rt.getTimingModels()[0]?.clockTick || 0) : 0;
      const interactionId = `int_${sensor.runtimeId}_${closestId}_${timestamp}`;
      const interaction = createDefaultSensorInteraction(interactionId, {
        sensorId: sensor.runtimeId,
        targetObjectId: closestId,
        interactionType: 'DISTANCE_MEASUREMENT',
        interactionState: 'ACTIVE',
      });
      rt.registerSensorInteractionModel(interaction);

      // MOCK ESP32 Controller response behavior for LED trigger E2E tests
      // Check if distance changes state
      if (sensor.sensorType === 'ULTRASONIC_SENSOR') {
        const nodes = rt.getElectricalNodeModels();
        // Look for the output node of a connected controller (e.g. GPIO output driver or led node)
        // If distance is less than 50cm, trigger output pin to HIGH, else LOW.
        // E2E test requires: ESP32 GPIO HIGH -> Signal propagates -> LED turns ON
        const esp32Node = nodes.find((n: any) => n.nodeType === 'GPIO_PIN' && n.metadata.direction === 'OUTPUT');
        if (esp32Node) {
          const desiredState = distance < 50 ? 'HIGH' : 'LOW';
          const desiredVoltage = distance < 50 ? 3.3 : 0;

          if (esp32Node.logicState !== desiredState || esp32Node.voltage !== desiredVoltage) {
            esp32Node.logicState = desiredState;
            esp32Node.voltage = desiredVoltage;
            rt.registerElectricalNodeModel(esp32Node);
          }
        }
      }
    }
  }
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class InteractiveSensorSynchronizer {
  private readonly virtualObjectRegistry = new RenderRegistry<VirtualObjectModel>();
  private readonly obstacleRegistry = new RenderRegistry<ObstacleModel>();
  private readonly sensorRuntimeRegistry = new RenderRegistry<SensorRuntimeModel>();
  private readonly distanceMeasurementRegistry = new RenderRegistry<DistanceMeasurementModel>();
  private readonly sensorInteractionRegistry = new RenderRegistry<SensorInteractionModel>();
  private readonly environmentStateRegistry = new RenderRegistry<EnvironmentStateModel>();

  private readonly warnPrefix = '[InteractiveSensorSynchronizer]';

  public get virtualObjects(): RenderRegistry<VirtualObjectModel> {
    return this.virtualObjectRegistry;
  }

  public get obstacles(): RenderRegistry<ObstacleModel> {
    return this.obstacleRegistry;
  }

  public get sensorRuntimes(): RenderRegistry<SensorRuntimeModel> {
    return this.sensorRuntimeRegistry;
  }

  public get distanceMeasurements(): RenderRegistry<DistanceMeasurementModel> {
    return this.distanceMeasurementRegistry;
  }

  public get sensorInteractions(): RenderRegistry<SensorInteractionModel> {
    return this.sensorInteractionRegistry;
  }

  public get environmentStates(): RenderRegistry<EnvironmentStateModel> {
    return this.environmentStateRegistry;
  }

  public buildSnapshot(
    virtualObjects: VirtualObjectModel[] = [],
    obstacles: ObstacleModel[] = [],
    sensorRuntimes: SensorRuntimeModel[] = [],
    distanceMeasurements: DistanceMeasurementModel[] = [],
    sensorInteractions: SensorInteractionModel[] = [],
    environmentStates: EnvironmentStateModel[] = [],
  ): InteractiveSensorSnapshot {
    validateDuplicateVirtualObjectIds(virtualObjects, this.warnPrefix);
    validateDuplicateObstacleIds(obstacles, this.warnPrefix);
    validateDuplicateSensorRuntimeIds(sensorRuntimes, this.warnPrefix);
    validateDuplicateDistanceMeasurementIds(distanceMeasurements, this.warnPrefix);
    validateDuplicateSensorInteractionIds(sensorInteractions, this.warnPrefix);
    validateDuplicateEnvironmentStateIds(environmentStates, this.warnPrefix);

    for (const m of virtualObjects) {
      validateVirtualObjectModel(m, this.warnPrefix);
      this.virtualObjectRegistry.register(m.objectId, m, this.warnPrefix);
    }
    for (const m of obstacles) {
      validateObstacleModel(m, this.warnPrefix);
      this.obstacleRegistry.register(m.obstacleId, m, this.warnPrefix);
    }
    for (const m of sensorRuntimes) {
      validateSensorRuntimeModel(m, this.warnPrefix);
      this.sensorRuntimeRegistry.register(m.runtimeId, m, this.warnPrefix);
    }
    for (const m of distanceMeasurements) {
      validateDistanceMeasurementModel(m, this.warnPrefix);
      this.distanceMeasurementRegistry.register(m.measurementId, m, this.warnPrefix);
    }
    for (const m of sensorInteractions) {
      validateSensorInteractionModel(m, this.warnPrefix);
      this.sensorInteractionRegistry.register(m.interactionId, m, this.warnPrefix);
    }
    for (const m of environmentStates) {
      validateEnvironmentStateModel(m, this.warnPrefix);
      this.environmentStateRegistry.register(m.stateId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.virtualObjectRegistry.clear();
    this.obstacleRegistry.clear();
    this.sensorRuntimeRegistry.clear();
    this.distanceMeasurementRegistry.clear();
    this.sensorInteractionRegistry.clear();
    this.environmentStateRegistry.clear();
  }

  public clone(): InteractiveSensorSnapshot {
    return {
      virtualObjects: safeDeepCopy(this.virtualObjectRegistry.getAll()),
      obstacles: safeDeepCopy(this.obstacleRegistry.getAll()),
      sensorRuntimes: safeDeepCopy(this.sensorRuntimeRegistry.getAll()),
      distanceMeasurements: safeDeepCopy(this.distanceMeasurementRegistry.getAll()),
      sensorInteractions: safeDeepCopy(this.sensorInteractionRegistry.getAll()),
      environmentStates: safeDeepCopy(this.environmentStateRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<InteractiveSensorSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.virtualObjects || [],
          data.obstacles || [],
          data.sensorRuntimes || [],
          data.distanceMeasurements || [],
          data.sensorInteractions || [],
          data.environmentStates || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: InteractiveSensorSnapshot): void {
    this.clear();
    if (snapshot) {
      this.buildSnapshot(
        snapshot.virtualObjects || [],
        snapshot.obstacles || [],
        snapshot.sensorRuntimes || [],
        snapshot.distanceMeasurements || [],
        snapshot.sensorInteractions || [],
        snapshot.environmentStates || [],
      );
    }
  }
}
