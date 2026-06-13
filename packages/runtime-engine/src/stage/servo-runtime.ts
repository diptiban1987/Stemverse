/**
 * Phase 22B: SG90 Servo Motor Full Virtual Simulation Runtime
 *
 * Provides a complete SG90 micro servo simulation for the STEMVerse platform.
 * Students can place a virtual servo, connect its signal pin to an ESP32 PWM
 * channel, set angles via servoWrite(), and observe smooth angular motion —
 * entirely in-browser, no hardware required.
 *
 * Architecture follows Phase 22A (HC-SR04) patterns exactly:
 *   - Warning-only validation (console.warn, never throw)
 *   - Deep-copy safety via JSON.parse(JSON.stringify())
 *   - RenderRegistry-based synchronizer
 *   - Pure functions for all physics/simulation
 */

import type {
  ServoMotorModel,
  ServoPositionModel,
  ServoMotionModel,
  ServoConstraintModel,
  ServoAnimationModel,
  ServoSimulationSnapshot,
  ServoState,
  ServoDirection,
  VirtualPWMChannelModel,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** SG90 minimum pulse width in microseconds */
export const SG90_MIN_PULSE_US = 500;

/** SG90 maximum pulse width in microseconds */
export const SG90_MAX_PULSE_US = 2400;

/** SG90 minimum angle in degrees */
export const SG90_MIN_ANGLE_DEG = 0;

/** SG90 maximum angle in degrees */
export const SG90_MAX_ANGLE_DEG = 180;

/** Standard servo PWM frequency in Hz */
export const SG90_DEFAULT_FREQUENCY_HZ = 50;

/** SG90 typical rotation speed: 60° per 0.1s = 600°/s */
export const SG90_MAX_SPEED_DEG_PER_SEC = 600;

/** SG90 stall torque in kg·cm */
export const SG90_STALL_TORQUE_KG_CM = 1.8;

/** SG90 operating voltage */
export const SG90_OPERATING_VOLTAGE_V = 5.0;

/** SG90 deadband in microseconds */
export const SG90_DEADBAND_US = 5;

/** PWM period for 50 Hz in microseconds */
export const SG90_PWM_PERIOD_US = 20000;

/** Valid servo states */
export const VALID_SERVO_STATES: ServoState[] = [
  'DETACHED', 'IDLE', 'MOVING', 'HOLDING', 'STALLED', 'ERROR',
];

/** Valid servo directions */
export const VALID_SERVO_DIRECTIONS: ServoDirection[] = ['CW', 'CCW', 'NONE'];

// ═══════════════════════════════════════════════════════════════
// VALIDATION WARNING
// ═══════════════════════════════════════════════════════════════

/** Local validation warning type (compatible with scene-model's ValidationWarning). */
interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultServoMotorModel(
  id: string,
  overrides?: Partial<ServoMotorModel>,
): ServoMotorModel {
  const defaults: ServoMotorModel = {
    servoId: id,
    esp32Id: '',
    signalPin: -1,
    pwmChannelId: '',
    positionX: 0,
    positionY: 0,
    rotationOffsetDeg: 0,
    servoState: 'DETACHED',
    currentAngleDeg: 90,
    targetAngleDeg: 90,
    minAngleDeg: SG90_MIN_ANGLE_DEG,
    maxAngleDeg: SG90_MAX_ANGLE_DEG,
    minPulseWidthUs: SG90_MIN_PULSE_US,
    maxPulseWidthUs: SG90_MAX_PULSE_US,
    frequencyHz: SG90_DEFAULT_FREQUENCY_HZ,
    lastPWMDutyCycle: 0,
    isAttached: false,
    measurementCount: 0,
    lastUpdateTimestamp: 0,
    futureServoHints: {},
  };
  return Object.assign(defaults, overrides, { servoId: id });
}

export function createDefaultServoPositionModel(
  id: string,
  overrides?: Partial<ServoPositionModel>,
): ServoPositionModel {
  const defaults: ServoPositionModel = {
    positionId: id,
    servoId: '',
    angleDeg: 90,
    pulseWidthUs: 1450,
    pwmDutyCycle: 0,
    timestamp: 0,
    isValid: false,
    futurePositionHints: {},
  };
  return Object.assign(defaults, overrides, { positionId: id });
}

export function createDefaultServoMotionModel(
  id: string,
  overrides?: Partial<ServoMotionModel>,
): ServoMotionModel {
  const defaults: ServoMotionModel = {
    motionId: id,
    servoId: '',
    startAngleDeg: 90,
    endAngleDeg: 90,
    currentAngleDeg: 90,
    speedDegPerSec: SG90_MAX_SPEED_DEG_PER_SEC,
    direction: 'NONE',
    isComplete: true,
    startTimestamp: 0,
    estimatedDurationMs: 0,
    elapsedMs: 0,
    futureMotionHints: {},
  };
  return Object.assign(defaults, overrides, { motionId: id });
}

export function createDefaultServoConstraintModel(
  id: string,
  overrides?: Partial<ServoConstraintModel>,
): ServoConstraintModel {
  const defaults: ServoConstraintModel = {
    constraintId: id,
    servoId: '',
    minAngleDeg: SG90_MIN_ANGLE_DEG,
    maxAngleDeg: SG90_MAX_ANGLE_DEG,
    maxSpeedDegPerSec: SG90_MAX_SPEED_DEG_PER_SEC,
    stallTorqueKgCm: SG90_STALL_TORQUE_KG_CM,
    operatingVoltageV: SG90_OPERATING_VOLTAGE_V,
    deadbandUs: SG90_DEADBAND_US,
    isActive: true,
    futureConstraintHints: {},
  };
  return Object.assign(defaults, overrides, { constraintId: id });
}

export function createDefaultServoAnimationModel(
  id: string,
  overrides?: Partial<ServoAnimationModel>,
): ServoAnimationModel {
  const defaults: ServoAnimationModel = {
    animationId: id,
    servoId: '',
    displayAngleDeg: 90,
    hornLengthPx: 24,
    hornWidthPx: 6,
    bodyWidthPx: 32,
    bodyHeightPx: 36,
    showTargetIndicator: true,
    showAngleLabel: true,
    animationSpeedMultiplier: 1.0,
    isAnimating: false,
    futureAnimationHints: {},
  };
  return Object.assign(defaults, overrides, { animationId: id });
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateServoMotorModel(model: ServoMotorModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_SERVO', message: 'ServoMotorModel is null or not an object.' });
    return w;
  }
  if (!model.servoId || model.servoId.trim() === '') {
    w.push({ code: 'EMPTY_SERVO_ID', message: 'servoId must be a non-empty string.', field: 'servoId' });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'esp32Id must be a non-empty string.', field: 'esp32Id' });
  }
  if (typeof model.signalPin !== 'number' || model.signalPin < 0) {
    w.push({ code: 'INVALID_SIGNAL_PIN', message: 'signalPin must be a non-negative number.', field: 'signalPin' });
  }
  if (!VALID_SERVO_STATES.includes(model.servoState)) {
    w.push({ code: 'INVALID_SERVO_STATE', message: `servoState "${model.servoState}" is not valid.`, field: 'servoState' });
  }
  if (typeof model.currentAngleDeg !== 'number') {
    w.push({ code: 'INVALID_CURRENT_ANGLE', message: 'currentAngleDeg must be a number.', field: 'currentAngleDeg' });
  }
  if (typeof model.minAngleDeg !== 'number' || typeof model.maxAngleDeg !== 'number') {
    w.push({ code: 'INVALID_ANGLE_RANGE', message: 'minAngleDeg and maxAngleDeg must be numbers.', field: 'minAngleDeg' });
  } else if (model.minAngleDeg >= model.maxAngleDeg) {
    w.push({ code: 'INVALID_ANGLE_RANGE', message: 'minAngleDeg must be less than maxAngleDeg.', field: 'minAngleDeg' });
  }
  if (typeof model.minPulseWidthUs !== 'number' || model.minPulseWidthUs <= 0) {
    w.push({ code: 'INVALID_MIN_PULSE', message: 'minPulseWidthUs must be positive.', field: 'minPulseWidthUs' });
  }
  if (typeof model.maxPulseWidthUs !== 'number' || model.maxPulseWidthUs <= 0) {
    w.push({ code: 'INVALID_MAX_PULSE', message: 'maxPulseWidthUs must be positive.', field: 'maxPulseWidthUs' });
  }
  if (typeof model.frequencyHz !== 'number' || model.frequencyHz <= 0) {
    w.push({ code: 'INVALID_FREQUENCY', message: 'frequencyHz must be positive.', field: 'frequencyHz' });
  }
  return w;
}

export function validateServoPositionModel(model: ServoPositionModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_POSITION', message: 'ServoPositionModel is null or not an object.' });
    return w;
  }
  if (!model.positionId || model.positionId.trim() === '') {
    w.push({ code: 'EMPTY_POSITION_ID', message: 'positionId must be a non-empty string.', field: 'positionId' });
  }
  if (typeof model.angleDeg !== 'number') {
    w.push({ code: 'INVALID_ANGLE', message: 'angleDeg must be a number.', field: 'angleDeg' });
  }
  if (typeof model.pulseWidthUs !== 'number' || model.pulseWidthUs < 0) {
    w.push({ code: 'INVALID_PULSE_WIDTH', message: 'pulseWidthUs must be non-negative.', field: 'pulseWidthUs' });
  }
  return w;
}

export function validateServoMotionModel(model: ServoMotionModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_MOTION', message: 'ServoMotionModel is null or not an object.' });
    return w;
  }
  if (!model.motionId || model.motionId.trim() === '') {
    w.push({ code: 'EMPTY_MOTION_ID', message: 'motionId must be a non-empty string.', field: 'motionId' });
  }
  if (typeof model.speedDegPerSec !== 'number' || model.speedDegPerSec < 0) {
    w.push({ code: 'INVALID_SPEED', message: 'speedDegPerSec must be non-negative.', field: 'speedDegPerSec' });
  }
  if (!VALID_SERVO_DIRECTIONS.includes(model.direction)) {
    w.push({ code: 'INVALID_DIRECTION', message: `direction "${model.direction}" is not valid.`, field: 'direction' });
  }
  return w;
}

export function validateServoConstraintModel(model: ServoConstraintModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_CONSTRAINT', message: 'ServoConstraintModel is null or not an object.' });
    return w;
  }
  if (!model.constraintId || model.constraintId.trim() === '') {
    w.push({ code: 'EMPTY_CONSTRAINT_ID', message: 'constraintId must be a non-empty string.', field: 'constraintId' });
  }
  if (typeof model.minAngleDeg !== 'number' || typeof model.maxAngleDeg !== 'number') {
    w.push({ code: 'INVALID_ANGLE_RANGE', message: 'minAngleDeg and maxAngleDeg must be numbers.', field: 'minAngleDeg' });
  } else if (model.minAngleDeg >= model.maxAngleDeg) {
    w.push({ code: 'INVALID_ANGLE_RANGE', message: 'minAngleDeg must be less than maxAngleDeg.', field: 'minAngleDeg' });
  }
  if (typeof model.maxSpeedDegPerSec !== 'number' || model.maxSpeedDegPerSec <= 0) {
    w.push({ code: 'INVALID_MAX_SPEED', message: 'maxSpeedDegPerSec must be positive.', field: 'maxSpeedDegPerSec' });
  }
  if (typeof model.stallTorqueKgCm !== 'number' || model.stallTorqueKgCm < 0) {
    w.push({ code: 'INVALID_TORQUE', message: 'stallTorqueKgCm must be non-negative.', field: 'stallTorqueKgCm' });
  }
  if (typeof model.deadbandUs !== 'number' || model.deadbandUs < 0) {
    w.push({ code: 'INVALID_DEADBAND', message: 'deadbandUs must be non-negative.', field: 'deadbandUs' });
  }
  return w;
}

export function validateServoAnimationModel(model: ServoAnimationModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_ANIMATION', message: 'ServoAnimationModel is null or not an object.' });
    return w;
  }
  if (!model.animationId || model.animationId.trim() === '') {
    w.push({ code: 'EMPTY_ANIMATION_ID', message: 'animationId must be a non-empty string.', field: 'animationId' });
  }
  if (typeof model.hornLengthPx !== 'number' || model.hornLengthPx <= 0) {
    w.push({ code: 'INVALID_HORN_LENGTH', message: 'hornLengthPx must be positive.', field: 'hornLengthPx' });
  }
  if (typeof model.animationSpeedMultiplier !== 'number' || model.animationSpeedMultiplier <= 0) {
    w.push({ code: 'INVALID_SPEED_MULT', message: 'animationSpeedMultiplier must be positive.', field: 'animationSpeedMultiplier' });
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateServoIds(models: ServoMotorModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.servoId)) {
      w.push({ code: 'DUPLICATE_SERVO_ID', message: `Duplicate servoId: "${m.servoId}"` });
    }
    seen.add(m.servoId);
  }
  return w;
}

export function validateDuplicatePositionIds(models: ServoPositionModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.positionId)) {
      w.push({ code: 'DUPLICATE_POSITION_ID', message: `Duplicate positionId: "${m.positionId}"` });
    }
    seen.add(m.positionId);
  }
  return w;
}

export function validateDuplicateMotionIds(models: ServoMotionModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.motionId)) {
      w.push({ code: 'DUPLICATE_MOTION_ID', message: `Duplicate motionId: "${m.motionId}"` });
    }
    seen.add(m.motionId);
  }
  return w;
}

export function validateDuplicateConstraintIds(models: ServoConstraintModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.constraintId)) {
      w.push({ code: 'DUPLICATE_CONSTRAINT_ID', message: `Duplicate constraintId: "${m.constraintId}"` });
    }
    seen.add(m.constraintId);
  }
  return w;
}

export function validateDuplicateAnimationIds(models: ServoAnimationModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.animationId)) {
      w.push({ code: 'DUPLICATE_ANIMATION_ID', message: `Duplicate animationId: "${m.animationId}"` });
    }
    seen.add(m.animationId);
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// PWM → ANGLE MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Convert a PWM duty cycle value to pulse width in microseconds.
 *
 * For a 50 Hz signal (20,000 μs period) with 16-bit resolution (65536 values):
 *   pulseWidthUs = (dutyCycle / maxDutyValue) × periodUs
 */
export function dutyCycleToPulseWidthUs(
  dutyCycle: number,
  frequencyHz: number,
  resolution: number,
): number {
  if (frequencyHz <= 0 || resolution <= 0) return 0;
  const maxDutyValue = Math.pow(2, resolution);
  const periodUs = (1_000_000 / frequencyHz);
  return (dutyCycle / maxDutyValue) * periodUs;
}

/**
 * Convert pulse width in microseconds to servo angle.
 *
 * Linear mapping: pulseWidthUs → angle
 *   500 μs → 0°
 *   2400 μs → 180°
 */
export function pulseWidthToAngle(
  pulseWidthUs: number,
  minPulseUs: number = SG90_MIN_PULSE_US,
  maxPulseUs: number = SG90_MAX_PULSE_US,
  minAngle: number = SG90_MIN_ANGLE_DEG,
  maxAngle: number = SG90_MAX_ANGLE_DEG,
): number {
  if (maxPulseUs <= minPulseUs) return minAngle;
  const clamped = Math.max(minPulseUs, Math.min(maxPulseUs, pulseWidthUs));
  const ratio = (clamped - minPulseUs) / (maxPulseUs - minPulseUs);
  return minAngle + ratio * (maxAngle - minAngle);
}

/**
 * Convert servo angle to pulse width in microseconds.
 */
export function angleToPulseWidthUs(
  angleDeg: number,
  minAngle: number = SG90_MIN_ANGLE_DEG,
  maxAngle: number = SG90_MAX_ANGLE_DEG,
  minPulseUs: number = SG90_MIN_PULSE_US,
  maxPulseUs: number = SG90_MAX_PULSE_US,
): number {
  if (maxAngle <= minAngle) return minPulseUs;
  const clamped = Math.max(minAngle, Math.min(maxAngle, angleDeg));
  const ratio = (clamped - minAngle) / (maxAngle - minAngle);
  return minPulseUs + ratio * (maxPulseUs - minPulseUs);
}

/**
 * Convert PWM duty cycle directly to angle via pulse width.
 */
export function pwmDutyCycleToAngle(
  dutyCycle: number,
  frequencyHz: number,
  resolution: number,
  minPulseUs: number = SG90_MIN_PULSE_US,
  maxPulseUs: number = SG90_MAX_PULSE_US,
  minAngle: number = SG90_MIN_ANGLE_DEG,
  maxAngle: number = SG90_MAX_ANGLE_DEG,
): number {
  const pulseUs = dutyCycleToPulseWidthUs(dutyCycle, frequencyHz, resolution);
  return pulseWidthToAngle(pulseUs, minPulseUs, maxPulseUs, minAngle, maxAngle);
}

/**
 * Clamp an angle within the servo's min/max range.
 */
export function clampAngle(angleDeg: number, minAngle: number, maxAngle: number): number {
  return Math.max(minAngle, Math.min(maxAngle, angleDeg));
}

// ═══════════════════════════════════════════════════════════════
// MOTION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the direction from start to end angle.
 */
export function computeDirection(startAngle: number, endAngle: number): ServoDirection {
  if (Math.abs(endAngle - startAngle) < 0.01) return 'NONE';
  return endAngle > startAngle ? 'CW' : 'CCW';
}

/**
 * Create a new motion from the current state to a target angle.
 */
export function computeMotion(
  servo: ServoMotorModel,
  targetAngle: number,
  timestamp: number,
  speedDegPerSec: number = SG90_MAX_SPEED_DEG_PER_SEC,
): ServoMotionModel {
  const clamped = clampAngle(targetAngle, servo.minAngleDeg, servo.maxAngleDeg);
  const delta = Math.abs(clamped - servo.currentAngleDeg);
  const direction = computeDirection(servo.currentAngleDeg, clamped);
  const duration = speedDegPerSec > 0 ? (delta / speedDegPerSec) * 1000 : 0;

  return {
    motionId: `motion_${servo.servoId}_${timestamp}`,
    servoId: servo.servoId,
    startAngleDeg: servo.currentAngleDeg,
    endAngleDeg: clamped,
    currentAngleDeg: servo.currentAngleDeg,
    speedDegPerSec,
    direction,
    isComplete: delta < 0.01,
    startTimestamp: timestamp,
    estimatedDurationMs: duration,
    elapsedMs: 0,
    futureMotionHints: {},
  };
}

/**
 * Advance a motion by deltaMs milliseconds.
 * Returns a new motion with updated position. Pure function — does not mutate input.
 */
export function stepMotion(motion: ServoMotionModel, deltaMs: number): ServoMotionModel {
  if (motion.isComplete || deltaMs <= 0) {
    return { ...motion };
  }

  const newElapsed = motion.elapsedMs + deltaMs;
  const totalDelta = Math.abs(motion.endAngleDeg - motion.startAngleDeg);

  if (totalDelta < 0.01) {
    return { ...motion, isComplete: true, currentAngleDeg: motion.endAngleDeg };
  }

  const progress = Math.min(1.0, (motion.speedDegPerSec * newElapsed) / (totalDelta * 1000));
  const newAngle = motion.startAngleDeg + progress * (motion.endAngleDeg - motion.startAngleDeg);

  return {
    ...motion,
    currentAngleDeg: newAngle,
    elapsedMs: newElapsed,
    isComplete: progress >= 1.0,
  };
}

/**
 * Check if a motion has completed.
 */
export function isMotionComplete(motion: ServoMotionModel): boolean {
  return motion.isComplete;
}

// ═══════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════

/**
 * Attach servo — transitions from DETACHED to IDLE.
 * Pure function — returns new copy.
 */
export function attachServo(servo: ServoMotorModel, pwmChannelId?: string): ServoMotorModel {
  const result = { ...servo };
  if (result.servoState !== 'DETACHED' && result.servoState !== 'ERROR') {
    return result; // Already attached
  }
  result.servoState = 'IDLE';
  result.isAttached = true;
  if (pwmChannelId) {
    result.pwmChannelId = pwmChannelId;
  }
  return result;
}

/**
 * Detach servo — transitions any state to DETACHED.
 * Pure function.
 */
export function detachServo(servo: ServoMotorModel): ServoMotorModel {
  return {
    ...servo,
    servoState: 'DETACHED',
    isAttached: false,
  };
}

/**
 * Write a target angle to the servo.
 * Transitions IDLE/HOLDING → MOVING.
 * Pure function.
 */
export function writeAngle(
  servo: ServoMotorModel,
  angleDeg: number,
  timestamp: number = Date.now(),
): ServoMotorModel {
  if (servo.servoState === 'DETACHED') {
    return { ...servo }; // Cannot write to detached servo
  }

  const clamped = clampAngle(angleDeg, servo.minAngleDeg, servo.maxAngleDeg);
  const isAlreadyAtTarget = Math.abs(clamped - servo.currentAngleDeg) < 0.01;

  return {
    ...servo,
    targetAngleDeg: clamped,
    servoState: isAlreadyAtTarget ? 'HOLDING' : 'MOVING',
    lastUpdateTimestamp: timestamp,
    measurementCount: servo.measurementCount + 1,
  };
}

/**
 * Update servo state from motion progress.
 * Pure function.
 */
export function updateServoFromMotion(servo: ServoMotorModel, motion: ServoMotionModel): ServoMotorModel {
  if (!motion) return { ...servo };
  return {
    ...servo,
    currentAngleDeg: motion.currentAngleDeg,
    servoState: motion.isComplete ? 'HOLDING' : 'MOVING',
  };
}

/**
 * Read the current angle from a servo.
 */
export function readAngle(servo: ServoMotorModel): number {
  return servo.currentAngleDeg;
}

/**
 * Reset servo to DETACHED state with default angle.
 * Pure function.
 */
export function resetServo(servo: ServoMotorModel): ServoMotorModel {
  return {
    ...servo,
    servoState: 'DETACHED',
    isAttached: false,
    currentAngleDeg: 90,
    targetAngleDeg: 90,
    lastPWMDutyCycle: 0,
    measurementCount: 0,
    lastUpdateTimestamp: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Full simulation: given a servo and a PWM channel state, compute the
 * new servo state including target angle from PWM duty cycle.
 *
 * Returns updated servo, a position snapshot, and a motion model.
 * Pure function — does not mutate inputs.
 */
export function simulateServoFromPWM(
  servo: ServoMotorModel,
  pwmChannel: VirtualPWMChannelModel | null,
  constraint: ServoConstraintModel | null,
  timestamp: number,
): {
  servo: ServoMotorModel;
  position: ServoPositionModel;
  motion: ServoMotionModel;
} {
  let updated = JSON.parse(JSON.stringify(servo)) as ServoMotorModel;

  // If no PWM channel, return as-is
  if (!pwmChannel || !pwmChannel.isActive) {
    const pos = createDefaultServoPositionModel(`pos_${servo.servoId}_${timestamp}`, {
      servoId: servo.servoId,
      angleDeg: servo.currentAngleDeg,
      pulseWidthUs: angleToPulseWidthUs(servo.currentAngleDeg, servo.minAngleDeg, servo.maxAngleDeg, servo.minPulseWidthUs, servo.maxPulseWidthUs),
      timestamp,
      isValid: false,
    });
    const mot = computeMotion(updated, updated.currentAngleDeg, timestamp);
    return { servo: updated, position: pos, motion: mot };
  }

  // Compute target angle from PWM
  const pulseUs = dutyCycleToPulseWidthUs(
    pwmChannel.dutyCycle,
    pwmChannel.frequency > 0 ? pwmChannel.frequency : servo.frequencyHz,
    pwmChannel.resolution,
  );

  const minPulse = servo.minPulseWidthUs;
  const maxPulse = servo.maxPulseWidthUs;
  const minAngle = constraint?.isActive ? constraint.minAngleDeg : servo.minAngleDeg;
  const maxAngle = constraint?.isActive ? constraint.maxAngleDeg : servo.maxAngleDeg;

  const targetAngle = pulseWidthToAngle(pulseUs, minPulse, maxPulse, minAngle, maxAngle);
  const speed = constraint?.isActive && constraint.maxSpeedDegPerSec > 0
    ? constraint.maxSpeedDegPerSec
    : SG90_MAX_SPEED_DEG_PER_SEC;

  // Write angle
  updated = writeAngle(updated, targetAngle, timestamp);
  updated.lastPWMDutyCycle = pwmChannel.dutyCycle;

  // Compute motion
  const motion = computeMotion(
    { ...updated, currentAngleDeg: servo.currentAngleDeg },
    targetAngle,
    timestamp,
    speed,
  );

  // Position snapshot
  const position = createDefaultServoPositionModel(`pos_${servo.servoId}_${timestamp}`, {
    servoId: servo.servoId,
    angleDeg: targetAngle,
    pulseWidthUs: pulseUs,
    pwmDutyCycle: pwmChannel.dutyCycle,
    timestamp,
    isValid: true,
  });

  return { servo: updated, position, motion };
}

/**
 * Step the servo simulation by deltaMs.
 * Advances motion, updates servo state.
 * Pure function.
 */
export function simulateServoStep(
  servo: ServoMotorModel,
  motion: ServoMotionModel,
  deltaMs: number,
): { servo: ServoMotorModel; motion: ServoMotionModel } {
  const newMotion = stepMotion(motion, deltaMs);
  const newServo = updateServoFromMotion(servo, newMotion);
  return { servo: newServo, motion: newMotion };
}

// ═══════════════════════════════════════════════════════════════
// SERVO SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Internal RenderRegistry — Map-based storage with deterministic ordering.
 */
class RenderRegistry<T> {
  private data = new Map<string, T>();
  private order: string[] = [];

  get size(): number { return this.data.size; }

  register(id: string, model: T): void {
    this.data.set(id, JSON.parse(JSON.stringify(model)));
    if (!this.order.includes(id)) {
      this.order.push(id);
    }
  }

  lookup(id: string): T | undefined {
    const m = this.data.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : undefined;
  }

  getAll(): T[] {
    return this.order
      .map(id => this.data.get(id))
      .filter((m): m is T => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this.data.get(id);
    if (!existing) return;
    const merged = { ...existing, ...partial };
    this.data.set(id, JSON.parse(JSON.stringify(merged)));
  }

  remove(id: string): void {
    this.data.delete(id);
    this.order = this.order.filter(e => e !== id);
  }

  clear(): void {
    this.data.clear();
    this.order = [];
  }

  has(id: string): boolean { return this.data.has(id); }

  keys(): string[] { return [...this.order]; }
}

/**
 * ServoSynchronizer — manages all 5 servo registries with
 * buildSnapshot, clear, clone, toJSON, fromJSON.
 */
export class ServoSynchronizer {
  public servos = new RenderRegistry<ServoMotorModel>();
  public positions = new RenderRegistry<ServoPositionModel>();
  public motions = new RenderRegistry<ServoMotionModel>();
  public constraints = new RenderRegistry<ServoConstraintModel>();
  public animations = new RenderRegistry<ServoAnimationModel>();

  buildSnapshot(
    servos: ServoMotorModel[],
    positions: ServoPositionModel[],
    motions: ServoMotionModel[],
    constraints: ServoConstraintModel[],
    animations: ServoAnimationModel[],
  ): ServoSimulationSnapshot {
    this.clear();

    for (const s of servos) {
      const w = validateServoMotorModel(s);
      if (w.length === 0) {
        this.servos.register(s.servoId, s);
      }
    }
    for (const p of positions) {
      const w = validateServoPositionModel(p);
      if (w.length === 0) {
        this.positions.register(p.positionId, p);
      }
    }
    for (const m of motions) {
      const w = validateServoMotionModel(m);
      if (w.length === 0) {
        this.motions.register(m.motionId, m);
      }
    }
    for (const c of constraints) {
      const w = validateServoConstraintModel(c);
      if (w.length === 0) {
        this.constraints.register(c.constraintId, c);
      }
    }
    for (const a of animations) {
      const w = validateServoAnimationModel(a);
      if (w.length === 0) {
        this.animations.register(a.animationId, a);
      }
    }

    return {
      servos: this.servos.getAll(),
      positions: this.positions.getAll(),
      motions: this.motions.getAll(),
      constraints: this.constraints.getAll(),
      animations: this.animations.getAll(),
    };
  }

  clear(): void {
    this.servos.clear();
    this.positions.clear();
    this.motions.clear();
    this.constraints.clear();
    this.animations.clear();
  }

  clone(): ServoSynchronizer {
    const c = new ServoSynchronizer();
    c.buildSnapshot(
      this.servos.getAll(),
      this.positions.getAll(),
      this.motions.getAll(),
      this.constraints.getAll(),
      this.animations.getAll(),
    );
    return c;
  }

  toJSON(): ServoSimulationSnapshot {
    return {
      servos: this.servos.getAll(),
      positions: this.positions.getAll(),
      motions: this.motions.getAll(),
      constraints: this.constraints.getAll(),
      animations: this.animations.getAll(),
    };
  }

  fromJSON(json: ServoSimulationSnapshot | null | undefined): void {
    this.clear();
    if (!json || typeof json !== 'object') return;
    if (Array.isArray(json.servos)) {
      for (const s of json.servos) this.servos.register(s.servoId, s);
    }
    if (Array.isArray(json.positions)) {
      for (const p of json.positions) this.positions.register(p.positionId, p);
    }
    if (Array.isArray(json.motions)) {
      for (const m of json.motions) this.motions.register(m.motionId, m);
    }
    if (Array.isArray(json.constraints)) {
      for (const c of json.constraints) this.constraints.register(c.constraintId, c);
    }
    if (Array.isArray(json.animations)) {
      for (const a of json.animations) this.animations.register(a.animationId, a);
    }
  }
}
