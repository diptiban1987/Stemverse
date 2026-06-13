// ═══════════════════════════════════════════════════════════════
// Phase 22A: HC-SR04 Full Virtual Ultrasonic Sensor Simulation
// Implements virtual beam propagation, obstacle detection,
// echo pulse generation, and ESP32 GPIO integration.
// Browser-only — no hardware required.
// ═══════════════════════════════════════════════════════════════

import {
  HCSR04Model,
  HCSR04State,
  UltrasonicBeamModel,
  BeamState,
  EchoPulseModel,
  DistanceTargetModel,
  UltrasonicEnvironmentModel,
  UltrasonicSimulationSnapshot,
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

/** Speed of sound at 20°C in cm/μs */
export const SPEED_OF_SOUND_CM_PER_US = 0.0343;

/** HC-SR04 maximum detection range in cm */
export const HC_SR04_MAX_RANGE_CM = 400;

/** HC-SR04 minimum detection range in cm */
export const HC_SR04_MIN_RANGE_CM = 2;

/** HC-SR04 beam cone half-angle in degrees */
export const HC_SR04_BEAM_ANGLE_DEG = 15;

/** Required trigger pulse width in μs */
export const HC_SR04_TRIGGER_PULSE_US = 10;

/** Maximum echo pulse duration in μs (400cm round-trip) */
export const HC_SR04_MAX_ECHO_DURATION_US = 23324;

/** Echo timeout in μs — no obstacle detected */
export const HC_SR04_TIMEOUT_US = 38000;

/** Default environment temperature in Celsius */
export const HC_SR04_DEFAULT_TEMPERATURE_C = 20;

/** All valid HC-SR04 sensor states */
export const VALID_HCSR04_STATES: HCSR04State[] = [
  'IDLE', 'TRIGGERING', 'EMITTING', 'WAITING_ECHO', 'ECHO_HIGH', 'COMPLETE', 'ERROR',
];

/** All valid beam states */
export const VALID_BEAM_STATES: BeamState[] = [
  'IDLE', 'EMITTING', 'REFLECTED', 'TIMED_OUT', 'ABSORBED',
];

/** Valid distance target types */
export const VALID_TARGET_TYPES: DistanceTargetModel['targetType'][] = [
  'WALL', 'BOX', 'CYLINDER', 'ROBOT', 'CUSTOM',
];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultHCSR04Model(
  id: string,
  overrides: Partial<HCSR04Model> = {},
): HCSR04Model {
  return {
    esp32Id: '',
    trigPin: 0,
    echoPin: 0,
    positionX: 0,
    positionY: 0,
    rotationDeg: 0,
    sensorState: 'IDLE',
    lastMeasuredDistanceCm: 0,
    lastEchoDurationUs: 0,
    maxRangeCm: HC_SR04_MAX_RANGE_CM,
    minRangeCm: HC_SR04_MIN_RANGE_CM,
    beamAngleDeg: HC_SR04_BEAM_ANGLE_DEG,
    speedOfSoundCmPerUs: SPEED_OF_SOUND_CM_PER_US,
    triggerPulseUs: HC_SR04_TRIGGER_PULSE_US,
    measurementCount: 0,
    lastMeasurementTimestamp: 0,
    futureHCSR04Hints: {},
    ...overrides,
    sensorId: id,
  };
}

export function createDefaultUltrasonicBeamModel(
  id: string,
  overrides: Partial<UltrasonicBeamModel> = {},
): UltrasonicBeamModel {
  return {
    sensorId: '',
    originX: 0,
    originY: 0,
    directionDeg: 0,
    beamAngleDeg: HC_SR04_BEAM_ANGLE_DEG,
    maxRangeCm: HC_SR04_MAX_RANGE_CM,
    currentDistanceCm: 0,
    beamState: 'IDLE',
    emitTimestamp: 0,
    reflectTimestamp: 0,
    targetObstacleId: '',
    futureBeamHints: {},
    ...overrides,
    beamId: id,
  };
}

export function createDefaultEchoPulseModel(
  id: string,
  overrides: Partial<EchoPulseModel> = {},
): EchoPulseModel {
  return {
    sensorId: '',
    beamId: '',
    distanceCm: 0,
    durationUs: 0,
    echoStartTimestamp: 0,
    echoEndTimestamp: 0,
    isValid: false,
    futureEchoHints: {},
    ...overrides,
    pulseId: id,
  };
}

export function createDefaultDistanceTargetModel(
  id: string,
  overrides: Partial<DistanceTargetModel> = {},
): DistanceTargetModel {
  return {
    targetType: 'BOX',
    positionX: 0,
    positionY: 0,
    width: 10,
    height: 10,
    reflectivity: 1.0,
    isActive: true,
    futureTargetHints: {},
    ...overrides,
    targetId: id,
  };
}

export function createDefaultUltrasonicEnvironmentModel(
  id: string,
  overrides: Partial<UltrasonicEnvironmentModel> = {},
): UltrasonicEnvironmentModel {
  return {
    temperatureCelsius: HC_SR04_DEFAULT_TEMPERATURE_C,
    humidityPercent: 50,
    activeTargetIds: [],
    activeSensorIds: [],
    simulationTickMs: 0,
    futureEnvironmentHints: {},
    ...overrides,
    environmentId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS (warning-only — never throw)
// ═══════════════════════════════════════════════════════════════

export function validateHCSR04Model(
  model: HCSR04Model | null | undefined,
  warnPrefix = '[HC-SR04]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_HCSR04', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.sensorId || model.sensorId.trim() === '') {
    console.warn(`${warnPrefix} sensorId is empty`);
    warnings.push({ code: 'EMPTY_SENSOR_ID', message: `${warnPrefix} sensorId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (typeof model.trigPin !== 'number' || model.trigPin < 0) {
    console.warn(`${warnPrefix} invalid trigPin: ${model.trigPin}`);
    warnings.push({ code: 'INVALID_TRIG_PIN', message: `${warnPrefix} invalid trigPin: ${model.trigPin}` });
  }
  if (typeof model.echoPin !== 'number' || model.echoPin < 0) {
    console.warn(`${warnPrefix} invalid echoPin: ${model.echoPin}`);
    warnings.push({ code: 'INVALID_ECHO_PIN', message: `${warnPrefix} invalid echoPin: ${model.echoPin}` });
  }
  if (!VALID_HCSR04_STATES.includes(model.sensorState)) {
    console.warn(`${warnPrefix} invalid sensorState: ${model.sensorState}`);
    warnings.push({ code: 'INVALID_SENSOR_STATE', message: `${warnPrefix} invalid sensorState: ${model.sensorState}` });
  }
  if (typeof model.maxRangeCm !== 'number' || model.maxRangeCm <= 0) {
    console.warn(`${warnPrefix} invalid maxRangeCm: ${model.maxRangeCm}`);
    warnings.push({ code: 'INVALID_MAX_RANGE', message: `${warnPrefix} invalid maxRangeCm: ${model.maxRangeCm}` });
  }
  if (typeof model.futureHCSR04Hints !== 'object' || model.futureHCSR04Hints === null) {
    console.warn(`${warnPrefix} invalid futureHCSR04Hints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureHCSR04Hints` });
  }
  return warnings;
}

export function validateUltrasonicBeamModel(
  model: UltrasonicBeamModel | null | undefined,
  warnPrefix = '[Ultrasonic Beam]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_BEAM', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.beamId || model.beamId.trim() === '') {
    console.warn(`${warnPrefix} beamId is empty`);
    warnings.push({ code: 'EMPTY_BEAM_ID', message: `${warnPrefix} beamId is empty` });
  }
  if (!model.sensorId || model.sensorId.trim() === '') {
    console.warn(`${warnPrefix} sensorId is empty`);
    warnings.push({ code: 'EMPTY_SENSOR_ID', message: `${warnPrefix} sensorId is empty` });
  }
  if (!VALID_BEAM_STATES.includes(model.beamState)) {
    console.warn(`${warnPrefix} invalid beamState: ${model.beamState}`);
    warnings.push({ code: 'INVALID_BEAM_STATE', message: `${warnPrefix} invalid beamState: ${model.beamState}` });
  }
  if (typeof model.maxRangeCm !== 'number' || model.maxRangeCm <= 0) {
    console.warn(`${warnPrefix} invalid maxRangeCm: ${model.maxRangeCm}`);
    warnings.push({ code: 'INVALID_MAX_RANGE', message: `${warnPrefix} invalid maxRangeCm: ${model.maxRangeCm}` });
  }
  if (typeof model.futureBeamHints !== 'object' || model.futureBeamHints === null) {
    console.warn(`${warnPrefix} invalid futureBeamHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureBeamHints` });
  }
  return warnings;
}

export function validateEchoPulseModel(
  model: EchoPulseModel | null | undefined,
  warnPrefix = '[Echo Pulse]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_ECHO_PULSE', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.pulseId || model.pulseId.trim() === '') {
    console.warn(`${warnPrefix} pulseId is empty`);
    warnings.push({ code: 'EMPTY_PULSE_ID', message: `${warnPrefix} pulseId is empty` });
  }
  if (!model.sensorId || model.sensorId.trim() === '') {
    console.warn(`${warnPrefix} sensorId is empty`);
    warnings.push({ code: 'EMPTY_SENSOR_ID', message: `${warnPrefix} sensorId is empty` });
  }
  if (typeof model.durationUs !== 'number' || model.durationUs < 0) {
    console.warn(`${warnPrefix} invalid durationUs: ${model.durationUs}`);
    warnings.push({ code: 'INVALID_DURATION', message: `${warnPrefix} invalid durationUs: ${model.durationUs}` });
  }
  if (typeof model.futureEchoHints !== 'object' || model.futureEchoHints === null) {
    console.warn(`${warnPrefix} invalid futureEchoHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureEchoHints` });
  }
  return warnings;
}

export function validateDistanceTargetModel(
  model: DistanceTargetModel | null | undefined,
  warnPrefix = '[Distance Target]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_TARGET', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.targetId || model.targetId.trim() === '') {
    console.warn(`${warnPrefix} targetId is empty`);
    warnings.push({ code: 'EMPTY_TARGET_ID', message: `${warnPrefix} targetId is empty` });
  }
  if (!VALID_TARGET_TYPES.includes(model.targetType)) {
    console.warn(`${warnPrefix} invalid targetType: ${model.targetType}`);
    warnings.push({ code: 'INVALID_TARGET_TYPE', message: `${warnPrefix} invalid targetType: ${model.targetType}` });
  }
  if (typeof model.width !== 'number' || model.width <= 0) {
    console.warn(`${warnPrefix} invalid width: ${model.width}`);
    warnings.push({ code: 'INVALID_WIDTH', message: `${warnPrefix} invalid width: ${model.width}` });
  }
  if (typeof model.height !== 'number' || model.height <= 0) {
    console.warn(`${warnPrefix} invalid height: ${model.height}`);
    warnings.push({ code: 'INVALID_HEIGHT', message: `${warnPrefix} invalid height: ${model.height}` });
  }
  if (typeof model.reflectivity !== 'number' || model.reflectivity < 0 || model.reflectivity > 1) {
    console.warn(`${warnPrefix} invalid reflectivity: ${model.reflectivity}`);
    warnings.push({ code: 'INVALID_REFLECTIVITY', message: `${warnPrefix} invalid reflectivity: ${model.reflectivity}` });
  }
  if (typeof model.futureTargetHints !== 'object' || model.futureTargetHints === null) {
    console.warn(`${warnPrefix} invalid futureTargetHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureTargetHints` });
  }
  return warnings;
}

export function validateUltrasonicEnvironmentModel(
  model: UltrasonicEnvironmentModel | null | undefined,
  warnPrefix = '[Ultrasonic Env]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_ENVIRONMENT', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.environmentId || model.environmentId.trim() === '') {
    console.warn(`${warnPrefix} environmentId is empty`);
    warnings.push({ code: 'EMPTY_ENVIRONMENT_ID', message: `${warnPrefix} environmentId is empty` });
  }
  if (typeof model.temperatureCelsius !== 'number') {
    console.warn(`${warnPrefix} invalid temperatureCelsius`);
    warnings.push({ code: 'INVALID_TEMPERATURE', message: `${warnPrefix} invalid temperatureCelsius` });
  }
  if (typeof model.humidityPercent !== 'number' || model.humidityPercent < 0 || model.humidityPercent > 100) {
    console.warn(`${warnPrefix} invalid humidityPercent: ${model.humidityPercent}`);
    warnings.push({ code: 'INVALID_HUMIDITY', message: `${warnPrefix} invalid humidityPercent: ${model.humidityPercent}` });
  }
  if (!Array.isArray(model.activeTargetIds)) {
    console.warn(`${warnPrefix} activeTargetIds is not an array`);
    warnings.push({ code: 'INVALID_TARGET_IDS', message: `${warnPrefix} activeTargetIds is not an array` });
  }
  if (!Array.isArray(model.activeSensorIds)) {
    console.warn(`${warnPrefix} activeSensorIds is not an array`);
    warnings.push({ code: 'INVALID_SENSOR_IDS', message: `${warnPrefix} activeSensorIds is not an array` });
  }
  if (typeof model.futureEnvironmentHints !== 'object' || model.futureEnvironmentHints === null) {
    console.warn(`${warnPrefix} invalid futureEnvironmentHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureEnvironmentHints` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateHCSR04Ids(
  models: HCSR04Model[],
  warnPrefix = '[HC-SR04]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.sensorId)) {
      console.warn(`${warnPrefix} duplicate sensorId: ${m.sensorId}`);
      warnings.push({ code: 'DUPLICATE_SENSOR_ID', message: `${warnPrefix} duplicate sensorId: ${m.sensorId}` });
    }
    seen.add(m.sensorId);
  }
  return warnings;
}

export function validateDuplicateBeamIds(
  models: UltrasonicBeamModel[],
  warnPrefix = '[Ultrasonic Beam]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.beamId)) {
      console.warn(`${warnPrefix} duplicate beamId: ${m.beamId}`);
      warnings.push({ code: 'DUPLICATE_BEAM_ID', message: `${warnPrefix} duplicate beamId: ${m.beamId}` });
    }
    seen.add(m.beamId);
  }
  return warnings;
}

export function validateDuplicateEchoPulseIds(
  models: EchoPulseModel[],
  warnPrefix = '[Echo Pulse]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.pulseId)) {
      console.warn(`${warnPrefix} duplicate pulseId: ${m.pulseId}`);
      warnings.push({ code: 'DUPLICATE_PULSE_ID', message: `${warnPrefix} duplicate pulseId: ${m.pulseId}` });
    }
    seen.add(m.pulseId);
  }
  return warnings;
}

export function validateDuplicateTargetIds(
  models: DistanceTargetModel[],
  warnPrefix = '[Distance Target]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.targetId)) {
      console.warn(`${warnPrefix} duplicate targetId: ${m.targetId}`);
      warnings.push({ code: 'DUPLICATE_TARGET_ID', message: `${warnPrefix} duplicate targetId: ${m.targetId}` });
    }
    seen.add(m.targetId);
  }
  return warnings;
}

export function validateDuplicateEnvironmentIds(
  models: UltrasonicEnvironmentModel[],
  warnPrefix = '[Ultrasonic Env]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.environmentId)) {
      console.warn(`${warnPrefix} duplicate environmentId: ${m.environmentId}`);
      warnings.push({ code: 'DUPLICATE_ENVIRONMENT_ID', message: `${warnPrefix} duplicate environmentId: ${m.environmentId}` });
    }
    seen.add(m.environmentId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// PHYSICS / BEAM ENGINE (pure functions)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate speed of sound adjusted for temperature.
 * Formula: v = 331.3 + 0.606 × T (m/s) → convert to cm/μs
 */
export function calculateSpeedOfSound(temperatureCelsius: number): number {
  const speedMs = 331.3 + 0.606 * temperatureCelsius; // m/s
  return speedMs / 10000; // convert to cm/μs
}

/**
 * Compute echo pulse duration from distance in cm.
 * Sound travels to target and back (round-trip).
 */
export function computeEchoDurationUs(distanceCm: number, speedOfSoundCmPerUs: number): number {
  if (distanceCm <= 0 || speedOfSoundCmPerUs <= 0) return 0;
  return (2 * distanceCm) / speedOfSoundCmPerUs;
}

/**
 * Compute distance in cm from echo pulse duration in μs.
 */
export function computeDistanceCm(echoDurationUs: number, speedOfSoundCmPerUs: number): number {
  if (echoDurationUs <= 0 || speedOfSoundCmPerUs <= 0) return 0;
  return (echoDurationUs * speedOfSoundCmPerUs) / 2;
}

/**
 * Check if a target point is within the sensor's beam cone.
 * Uses 2D angle comparison.
 */
export function isInBeamCone(
  sensorX: number,
  sensorY: number,
  directionDeg: number,
  beamAngleDeg: number,
  targetX: number,
  targetY: number,
): boolean {
  const dx = targetX - sensorX;
  const dy = targetY - sensorY;
  if (dx === 0 && dy === 0) return true; // target at sensor position

  const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);
  let angleDiff = angleToTarget - directionDeg;

  // Normalize to [-180, 180]
  while (angleDiff > 180) angleDiff -= 360;
  while (angleDiff < -180) angleDiff += 360;

  return Math.abs(angleDiff) <= beamAngleDeg / 2;
}

/**
 * Calculate the distance from sensor to the nearest edge of a rectangular target.
 * Returns the distance in cm, or -1 if the target is not in the beam cone.
 */
export function calculateDistanceToTarget(
  sensorX: number,
  sensorY: number,
  directionDeg: number,
  beamAngleDeg: number,
  target: DistanceTargetModel,
): number {
  if (!target.isActive) return -1;

  // Target center
  const cx = target.positionX;
  const cy = target.positionY;
  const hw = target.width / 2;
  const hh = target.height / 2;

  // Find closest point on rectangle to sensor beam line
  const clampedX = Math.max(cx - hw, Math.min(cx + hw, sensorX));
  const clampedY = Math.max(cy - hh, Math.min(cy + hh, sensorY));

  // Check if center is in beam cone (simplified — use center point)
  if (!isInBeamCone(sensorX, sensorY, directionDeg, beamAngleDeg, cx, cy)) {
    return -1;
  }

  // Calculate distance from sensor to target center
  const dx = cx - sensorX;
  const dy = cy - sensorY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Subtract half the target dimension in the beam direction for nearest edge
  const dirRad = directionDeg * (Math.PI / 180);
  const dotX = Math.cos(dirRad);
  const dotY = Math.sin(dirRad);
  const projectedHalfSize = Math.abs(dotX * hw) + Math.abs(dotY * hh);

  return Math.max(0, dist - projectedHalfSize);
}

/**
 * Find the nearest target hit by the beam.
 * Returns { targetId, distanceCm } or null if no target in range.
 */
export function calculateBeamIntersection(
  sensor: HCSR04Model,
  targets: DistanceTargetModel[],
): { targetId: string; distanceCm: number } | null {
  let nearest: { targetId: string; distanceCm: number } | null = null;

  for (const target of targets) {
    if (!target.isActive) continue;

    const dist = calculateDistanceToTarget(
      sensor.positionX,
      sensor.positionY,
      sensor.rotationDeg,
      sensor.beamAngleDeg,
      target,
    );

    if (dist < 0) continue;
    if (dist > sensor.maxRangeCm) continue;
    if (dist < sensor.minRangeCm) continue;

    if (!nearest || dist < nearest.distanceCm) {
      nearest = { targetId: target.targetId, distanceCm: dist };
    }
  }

  return nearest;
}

/**
 * Emit a beam from the sensor.
 */
export function emitBeam(sensor: HCSR04Model, timestamp = 0): UltrasonicBeamModel {
  return createDefaultUltrasonicBeamModel(`beam_${sensor.sensorId}_${timestamp}`, {
    sensorId: sensor.sensorId,
    originX: sensor.positionX,
    originY: sensor.positionY,
    directionDeg: sensor.rotationDeg,
    beamAngleDeg: sensor.beamAngleDeg,
    maxRangeCm: sensor.maxRangeCm,
    beamState: 'EMITTING',
    emitTimestamp: timestamp,
  });
}

/**
 * Generate an echo pulse from a beam reflection.
 */
export function generateEchoPulse(
  sensor: HCSR04Model,
  beam: UltrasonicBeamModel,
  distanceCm: number,
  timestamp = 0,
): EchoPulseModel {
  const durationUs = computeEchoDurationUs(distanceCm, sensor.speedOfSoundCmPerUs);
  const isValid = distanceCm >= sensor.minRangeCm && distanceCm <= sensor.maxRangeCm;

  return createDefaultEchoPulseModel(`pulse_${sensor.sensorId}_${timestamp}`, {
    sensorId: sensor.sensorId,
    beamId: beam.beamId,
    distanceCm,
    durationUs,
    echoStartTimestamp: timestamp,
    echoEndTimestamp: timestamp + durationUs,
    isValid,
  });
}

// ═══════════════════════════════════════════════════════════════
// SENSOR STATE MACHINE
// ═══════════════════════════════════════════════════════════════

/**
 * Trigger sensor from IDLE → TRIGGERING state.
 */
export function triggerSensor(sensor: HCSR04Model, timestamp = 0): HCSR04Model {
  const updated = safeDeepCopy(sensor);
  if (updated.sensorState !== 'IDLE' && updated.sensorState !== 'COMPLETE') {
    return updated; // Can only trigger from IDLE or COMPLETE
  }
  updated.sensorState = 'TRIGGERING';
  updated.lastMeasurementTimestamp = timestamp;
  return updated;
}

/**
 * Advance sensor through state machine based on trigger pin state.
 * IDLE → (TRIG HIGH) → TRIGGERING → EMITTING → WAITING_ECHO → ECHO_HIGH → COMPLETE
 */
export function triggerFromGPIO(
  sensor: HCSR04Model,
  trigPinState: GPIOPinState,
  timestamp = 0,
): HCSR04Model {
  const updated = safeDeepCopy(sensor);

  if (trigPinState === 'HIGH' && (updated.sensorState === 'IDLE' || updated.sensorState === 'COMPLETE')) {
    updated.sensorState = 'TRIGGERING';
    updated.lastMeasurementTimestamp = timestamp;
  }

  return updated;
}

/**
 * Drive ECHO pin based on current sensor state and echo pulse.
 * Returns the GPIO state to set on the ECHO pin and the remaining duration.
 */
export function driveEchoPin(
  sensor: HCSR04Model,
  echoPulse: EchoPulseModel | null,
): { echoState: GPIOPinState; durationUs: number } {
  if (sensor.sensorState === 'ECHO_HIGH' && echoPulse) {
    return { echoState: 'HIGH', durationUs: echoPulse.durationUs };
  }
  return { echoState: 'LOW', durationUs: 0 };
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Run a complete measurement cycle:
 * 1. Emit beam
 * 2. Calculate intersection with targets
 * 3. Generate echo pulse
 * 4. Update sensor state
 *
 * Returns the updated sensor, beam, and echo pulse.
 * Pure function — does not mutate inputs.
 */
export function simulateMeasurement(
  sensor: HCSR04Model,
  targets: DistanceTargetModel[],
  environment: UltrasonicEnvironmentModel | null = null,
  timestamp = 0,
): { sensor: HCSR04Model; beam: UltrasonicBeamModel; echoPulse: EchoPulseModel } {
  // Adjust speed of sound for temperature
  let sensorCopy = safeDeepCopy(sensor);
  if (environment) {
    sensorCopy.speedOfSoundCmPerUs = calculateSpeedOfSound(environment.temperatureCelsius);
  }

  // 1. Emit beam
  const beam = emitBeam(sensorCopy, timestamp);

  // 2. Find nearest target
  const intersection = calculateBeamIntersection(sensorCopy, targets);

  let updatedBeam: UltrasonicBeamModel;
  let echoPulse: EchoPulseModel;

  if (intersection) {
    // 3. Beam hit a target
    updatedBeam = safeDeepCopy(beam);
    updatedBeam.currentDistanceCm = intersection.distanceCm;
    updatedBeam.beamState = 'REFLECTED';
    updatedBeam.targetObstacleId = intersection.targetId;
    updatedBeam.reflectTimestamp = timestamp;

    // 4. Generate echo pulse
    echoPulse = generateEchoPulse(sensorCopy, updatedBeam, intersection.distanceCm, timestamp);

    // 5. Update sensor
    sensorCopy.sensorState = 'COMPLETE';
    sensorCopy.lastMeasuredDistanceCm = intersection.distanceCm;
    sensorCopy.lastEchoDurationUs = echoPulse.durationUs;
    sensorCopy.measurementCount += 1;
  } else {
    // No target — timeout
    updatedBeam = safeDeepCopy(beam);
    updatedBeam.beamState = 'TIMED_OUT';
    updatedBeam.currentDistanceCm = sensorCopy.maxRangeCm;

    echoPulse = createDefaultEchoPulseModel(`pulse_${sensorCopy.sensorId}_timeout`, {
      sensorId: sensorCopy.sensorId,
      beamId: updatedBeam.beamId,
      distanceCm: 0,
      durationUs: HC_SR04_TIMEOUT_US,
      echoStartTimestamp: timestamp,
      echoEndTimestamp: timestamp + HC_SR04_TIMEOUT_US,
      isValid: false,
    });

    sensorCopy.sensorState = 'COMPLETE';
    sensorCopy.lastMeasuredDistanceCm = 0;
    sensorCopy.lastEchoDurationUs = HC_SR04_TIMEOUT_US;
    sensorCopy.measurementCount += 1;
  }

  sensorCopy.lastMeasurementTimestamp = timestamp;

  return { sensor: sensorCopy, beam: updatedBeam, echoPulse };
}

/**
 * Simulate pulseIn() — the Blockly/Arduino function that measures
 * echo pulse duration in microseconds.
 * Returns the duration in μs (0 on timeout/no target).
 */
export function simulatePulseIn(
  sensor: HCSR04Model,
  targets: DistanceTargetModel[],
  environment: UltrasonicEnvironmentModel | null = null,
  timestamp = 0,
): number {
  const result = simulateMeasurement(sensor, targets, environment, timestamp);
  return result.echoPulse.isValid ? result.echoPulse.durationUs : 0;
}

/**
 * Reset a sensor back to IDLE state.
 */
export function resetSensor(sensor: HCSR04Model): HCSR04Model {
  const reset = safeDeepCopy(sensor);
  reset.sensorState = 'IDLE';
  reset.lastMeasuredDistanceCm = 0;
  reset.lastEchoDurationUs = 0;
  reset.measurementCount = 0;
  reset.lastMeasurementTimestamp = 0;
  return reset;
}

// ═══════════════════════════════════════════════════════════════
// HCSR04 SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class HCSR04Synchronizer {
  private sensorRegistry = new RenderRegistry<HCSR04Model>();
  private beamRegistry = new RenderRegistry<UltrasonicBeamModel>();
  private echoPulseRegistry = new RenderRegistry<EchoPulseModel>();
  private targetRegistry = new RenderRegistry<DistanceTargetModel>();
  private environmentRegistry = new RenderRegistry<UltrasonicEnvironmentModel>();

  public get sensors(): RenderRegistry<HCSR04Model> { return this.sensorRegistry; }
  public get beams(): RenderRegistry<UltrasonicBeamModel> { return this.beamRegistry; }
  public get echoPulses(): RenderRegistry<EchoPulseModel> { return this.echoPulseRegistry; }
  public get targets(): RenderRegistry<DistanceTargetModel> { return this.targetRegistry; }
  public get environments(): RenderRegistry<UltrasonicEnvironmentModel> { return this.environmentRegistry; }

  public buildSnapshot(
    sensors: HCSR04Model[],
    beams: UltrasonicBeamModel[],
    echoPulses: EchoPulseModel[],
    targets: DistanceTargetModel[],
    environments: UltrasonicEnvironmentModel[],
  ): UltrasonicSimulationSnapshot {
    this.clear();

    for (const m of sensors) {
      const warnings = validateHCSR04Model(m);
      if (warnings.length === 0) {
        this.sensorRegistry.register(m.sensorId, m);
      }
    }
    for (const m of beams) {
      const warnings = validateUltrasonicBeamModel(m);
      if (warnings.length === 0) {
        this.beamRegistry.register(m.beamId, m);
      }
    }
    for (const m of echoPulses) {
      const warnings = validateEchoPulseModel(m);
      if (warnings.length === 0) {
        this.echoPulseRegistry.register(m.pulseId, m);
      }
    }
    for (const m of targets) {
      const warnings = validateDistanceTargetModel(m);
      if (warnings.length === 0) {
        this.targetRegistry.register(m.targetId, m);
      }
    }
    for (const m of environments) {
      const warnings = validateUltrasonicEnvironmentModel(m);
      if (warnings.length === 0) {
        this.environmentRegistry.register(m.environmentId, m);
      }
    }

    return {
      sensors: this.sensorRegistry.getAll(),
      beams: this.beamRegistry.getAll(),
      echoPulses: this.echoPulseRegistry.getAll(),
      targets: this.targetRegistry.getAll(),
      environments: this.environmentRegistry.getAll(),
    };
  }

  public clear(): void {
    this.sensorRegistry.clear();
    this.beamRegistry.clear();
    this.echoPulseRegistry.clear();
    this.targetRegistry.clear();
    this.environmentRegistry.clear();
  }

  public clone(): HCSR04Synchronizer {
    const cloned = new HCSR04Synchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  public toJSON(): UltrasonicSimulationSnapshot {
    return {
      sensors: this.sensorRegistry.getAll(),
      beams: this.beamRegistry.getAll(),
      echoPulses: this.echoPulseRegistry.getAll(),
      targets: this.targetRegistry.getAll(),
      environments: this.environmentRegistry.getAll(),
    };
  }

  public fromJSON(json: UltrasonicSimulationSnapshot): void {
    this.clear();
    if (json) {
      this.buildSnapshot(
        json.sensors || [],
        json.beams || [],
        json.echoPulses || [],
        json.targets || [],
        json.environments || [],
      );
    }
  }
}
