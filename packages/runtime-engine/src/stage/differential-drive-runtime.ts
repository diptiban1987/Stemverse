// ═══════════════════════════════════════════════════════════════
// Phase 24B: Differential Drive Robot Simulator
// Deterministic metadata-only differential drive simulation.
// Supports L298N motor driver, wheel encoders, differential
// drive kinematics, command queues, path recording, telemetry,
// and ESP32 virtual pin integration.
// No Canvas, no WebGL, no Pixi. Simulation data only.
// ═══════════════════════════════════════════════════════════════

import {
  DifferentialDriveRobotModel,
  WheelEncoderModel,
  MotorDriverModel,
  RobotCommandQueueModel,
  RobotPathModel,
  RobotTelemetryModel,
  DifferentialDriveSnapshot,
  MotorDirection,
  RobotDriveState,
  EncoderState,
} from '../types';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default encoder ticks per wheel revolution */
export const DEFAULT_ENCODER_TICKS_PER_REV = 20;

/** Default wheel diameter in cm */
export const DEFAULT_WHEEL_DIAMETER_CM = 6.6;

/** Default wheel base in cm (distance between left/right wheel centers) */
export const DEFAULT_DRIVE_WHEEL_BASE_CM = 14;

/** Default max drive speed in cm/s */
export const DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC = 25;

/** Default motor PWM maximum value (8-bit) */
export const DEFAULT_MOTOR_PWM_MAX = 255;

/** Default battery voltage */
export const DEFAULT_BATTERY_VOLTAGE = 7.4;

/** Default maximum stored waypoints */
export const DEFAULT_MAX_WAYPOINTS = 1000;

/** Default telemetry update interval in ms */
export const DEFAULT_TELEMETRY_INTERVAL_MS = 100;

/** Valid motor directions for L298N */
export const VALID_MOTOR_DIRECTIONS: MotorDirection[] = ['FORWARD', 'BACKWARD', 'BRAKE', 'COAST'];

/** Valid drive states */
export const VALID_DRIVE_STATES: RobotDriveState[] = ['IDLE', 'DRIVING', 'TURNING', 'QUEUED', 'COMPLETED', 'ERROR'];

/** Valid encoder states */
export const VALID_ENCODER_STATES: EncoderState[] = ['IDLE', 'COUNTING', 'OVERFLOW', 'RESET'];

/** Valid drive command types */
export const VALID_DRIVE_COMMAND_TYPES = ['MOVE_FORWARD', 'MOVE_BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'STOP', 'WAIT'];

/** Valid encoder sides */
export const VALID_ENCODER_SIDES: WheelEncoderModel['side'][] = ['LEFT', 'RIGHT'];

// ═══════════════════════════════════════════════════════════════
// VALIDATION WARNING TYPE
// ═══════════════════════════════════════════════════════════════

export interface DriveValidationWarning {
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultDifferentialDriveRobotModel(
  driveId: string,
  overrides: Partial<DifferentialDriveRobotModel> = {},
): DifferentialDriveRobotModel {
  return {
    esp32Id: '',
    motorDriverId: '',
    leftEncoderId: '',
    rightEncoderId: '',
    wheelBaseCm: DEFAULT_DRIVE_WHEEL_BASE_CM,
    wheelDiameterCm: DEFAULT_WHEEL_DIAMETER_CM,
    maxSpeedCmPerSec: DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC,
    driveState: 'IDLE',
    enablePinA: 5,
    enablePinB: 6,
    in1Pin: 7,
    in2Pin: 8,
    in3Pin: 9,
    in4Pin: 10,
    leftEncoderPin: 2,
    rightEncoderPin: 3,
    timestamp: 0,
    futureDriveRobotHints: {},
    ...overrides,
    driveId,
  };
}

export function createDefaultWheelEncoderModel(
  encoderId: string,
  overrides: Partial<WheelEncoderModel> = {},
): WheelEncoderModel {
  return {
    driveId: '',
    side: 'LEFT',
    tickCount: 0,
    ticksPerRevolution: DEFAULT_ENCODER_TICKS_PER_REV,
    distanceCm: 0,
    rpm: 0,
    lastTickTimestamp: 0,
    encoderState: 'IDLE',
    futureEncoderHints: {},
    ...overrides,
    encoderId,
  };
}

export function createDefaultMotorDriverModel(
  driverId: string,
  overrides: Partial<MotorDriverModel> = {},
): MotorDriverModel {
  return {
    driveId: '',
    enableAPWM: 0,
    enableBPWM: 0,
    in1High: false,
    in2High: false,
    in3High: false,
    in4High: false,
    leftMotorDirection: 'COAST',
    rightMotorDirection: 'COAST',
    leftSpeedPercent: 0,
    rightSpeedPercent: 0,
    futureMotorDriverHints: {},
    ...overrides,
    driverId,
  };
}

export function createDefaultRobotCommandQueueModel(
  queueId: string,
  overrides: Partial<RobotCommandQueueModel> = {},
): RobotCommandQueueModel {
  return {
    driveId: '',
    commands: [],
    currentIndex: 0,
    isExecuting: false,
    futureCommandQueueHints: {},
    ...overrides,
    queueId,
  };
}

export function createDefaultRobotPathModel(
  pathId: string,
  overrides: Partial<RobotPathModel> = {},
): RobotPathModel {
  return {
    driveId: '',
    waypoints: [],
    totalDistanceCm: 0,
    futurePathHints: {},
    ...overrides,
    pathId,
  };
}

export function createDefaultRobotTelemetryModel(
  telemetryId: string,
  overrides: Partial<RobotTelemetryModel> = {},
): RobotTelemetryModel {
  return {
    driveId: '',
    positionX: 0,
    positionY: 0,
    headingDeg: 0,
    velocityCmPerSec: 0,
    angularVelocityDegPerSec: 0,
    leftEncoderTicks: 0,
    rightEncoderTicks: 0,
    leftWheelRPM: 0,
    rightWheelRPM: 0,
    batteryVoltage: DEFAULT_BATTERY_VOLTAGE,
    timestamp: 0,
    futureTelemetryHints: {},
    ...overrides,
    telemetryId,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDifferentialDriveRobotModel(
  model: DifferentialDriveRobotModel | null | undefined,
  warnPrefix = '[DifferentialDrive]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.driveId) {
    warnings.push({ code: 'EMPTY_DRIVE_ID', message: `${warnPrefix} driveId is empty.` });
  }
  if (model.wheelBaseCm <= 0) {
    warnings.push({ code: 'INVALID_WHEEL_BASE', message: `${warnPrefix} wheelBaseCm must be > 0, got ${model.wheelBaseCm}.` });
  }
  if (model.wheelDiameterCm <= 0) {
    warnings.push({ code: 'INVALID_WHEEL_DIAMETER', message: `${warnPrefix} wheelDiameterCm must be > 0, got ${model.wheelDiameterCm}.` });
  }
  if (model.maxSpeedCmPerSec <= 0) {
    warnings.push({ code: 'INVALID_MAX_SPEED', message: `${warnPrefix} maxSpeedCmPerSec must be > 0, got ${model.maxSpeedCmPerSec}.` });
  }
  if (!VALID_DRIVE_STATES.includes(model.driveState)) {
    warnings.push({ code: 'INVALID_DRIVE_STATE', message: `${warnPrefix} Invalid driveState: "${model.driveState}".` });
  }
  return warnings;
}

export function validateWheelEncoderModel(
  model: WheelEncoderModel | null | undefined,
  warnPrefix = '[WheelEncoder]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.encoderId) {
    warnings.push({ code: 'EMPTY_ENCODER_ID', message: `${warnPrefix} encoderId is empty.` });
  }
  if (!VALID_ENCODER_SIDES.includes(model.side)) {
    warnings.push({ code: 'INVALID_ENCODER_SIDE', message: `${warnPrefix} Invalid side: "${model.side}".` });
  }
  if (model.ticksPerRevolution <= 0) {
    warnings.push({ code: 'INVALID_TICKS_PER_REV', message: `${warnPrefix} ticksPerRevolution must be > 0, got ${model.ticksPerRevolution}.` });
  }
  if (!VALID_ENCODER_STATES.includes(model.encoderState)) {
    warnings.push({ code: 'INVALID_ENCODER_STATE', message: `${warnPrefix} Invalid encoderState: "${model.encoderState}".` });
  }
  if (model.tickCount < 0) {
    warnings.push({ code: 'NEGATIVE_TICK_COUNT', message: `${warnPrefix} tickCount must be >= 0, got ${model.tickCount}.` });
  }
  return warnings;
}

export function validateMotorDriverModel(
  model: MotorDriverModel | null | undefined,
  warnPrefix = '[MotorDriver]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.driverId) {
    warnings.push({ code: 'EMPTY_DRIVER_ID', message: `${warnPrefix} driverId is empty.` });
  }
  if (model.enableAPWM < 0 || model.enableAPWM > DEFAULT_MOTOR_PWM_MAX) {
    warnings.push({ code: 'INVALID_ENABLE_A_PWM', message: `${warnPrefix} enableAPWM must be 0–${DEFAULT_MOTOR_PWM_MAX}, got ${model.enableAPWM}.` });
  }
  if (model.enableBPWM < 0 || model.enableBPWM > DEFAULT_MOTOR_PWM_MAX) {
    warnings.push({ code: 'INVALID_ENABLE_B_PWM', message: `${warnPrefix} enableBPWM must be 0–${DEFAULT_MOTOR_PWM_MAX}, got ${model.enableBPWM}.` });
  }
  if (!VALID_MOTOR_DIRECTIONS.includes(model.leftMotorDirection)) {
    warnings.push({ code: 'INVALID_LEFT_MOTOR_DIR', message: `${warnPrefix} Invalid leftMotorDirection: "${model.leftMotorDirection}".` });
  }
  if (!VALID_MOTOR_DIRECTIONS.includes(model.rightMotorDirection)) {
    warnings.push({ code: 'INVALID_RIGHT_MOTOR_DIR', message: `${warnPrefix} Invalid rightMotorDirection: "${model.rightMotorDirection}".` });
  }
  if (model.leftSpeedPercent < 0 || model.leftSpeedPercent > 100) {
    warnings.push({ code: 'INVALID_LEFT_SPEED_PCT', message: `${warnPrefix} leftSpeedPercent must be 0–100, got ${model.leftSpeedPercent}.` });
  }
  if (model.rightSpeedPercent < 0 || model.rightSpeedPercent > 100) {
    warnings.push({ code: 'INVALID_RIGHT_SPEED_PCT', message: `${warnPrefix} rightSpeedPercent must be 0–100, got ${model.rightSpeedPercent}.` });
  }
  return warnings;
}

export function validateRobotCommandQueueModel(
  model: RobotCommandQueueModel | null | undefined,
  warnPrefix = '[CommandQueue]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.queueId) {
    warnings.push({ code: 'EMPTY_QUEUE_ID', message: `${warnPrefix} queueId is empty.` });
  }
  if (model.currentIndex < 0) {
    warnings.push({ code: 'INVALID_CURRENT_INDEX', message: `${warnPrefix} currentIndex must be >= 0, got ${model.currentIndex}.` });
  }
  if (model.currentIndex > model.commands.length) {
    warnings.push({ code: 'INDEX_OUT_OF_BOUNDS', message: `${warnPrefix} currentIndex ${model.currentIndex} exceeds commands length ${model.commands.length}.` });
  }
  for (let i = 0; i < model.commands.length; i++) {
    const cmd = model.commands[i];
    if (!VALID_DRIVE_COMMAND_TYPES.includes(cmd.commandType)) {
      warnings.push({ code: 'INVALID_COMMAND_TYPE', message: `${warnPrefix} commands[${i}] has invalid commandType: "${cmd.commandType}".` });
    }
    if (cmd.speedCmPerSec < 0) {
      warnings.push({ code: 'INVALID_COMMAND_SPEED', message: `${warnPrefix} commands[${i}].speedCmPerSec must be >= 0, got ${cmd.speedCmPerSec}.` });
    }
  }
  return warnings;
}

export function validateRobotPathModel(
  model: RobotPathModel | null | undefined,
  warnPrefix = '[RobotPath]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.pathId) {
    warnings.push({ code: 'EMPTY_PATH_ID', message: `${warnPrefix} pathId is empty.` });
  }
  if (model.totalDistanceCm < 0) {
    warnings.push({ code: 'NEGATIVE_TOTAL_DISTANCE', message: `${warnPrefix} totalDistanceCm must be >= 0, got ${model.totalDistanceCm}.` });
  }
  if (model.waypoints.length > DEFAULT_MAX_WAYPOINTS) {
    warnings.push({ code: 'TOO_MANY_WAYPOINTS', message: `${warnPrefix} waypoints count ${model.waypoints.length} exceeds max ${DEFAULT_MAX_WAYPOINTS}.` });
  }
  return warnings;
}

export function validateRobotTelemetryModel(
  model: RobotTelemetryModel | null | undefined,
  warnPrefix = '[RobotTelemetry]',
): DriveValidationWarning[] {
  const warnings: DriveValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.telemetryId) {
    warnings.push({ code: 'EMPTY_TELEMETRY_ID', message: `${warnPrefix} telemetryId is empty.` });
  }
  if (model.batteryVoltage < 0) {
    warnings.push({ code: 'NEGATIVE_BATTERY_VOLTAGE', message: `${warnPrefix} batteryVoltage must be >= 0, got ${model.batteryVoltage}.` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateDriveIds(
  models: DifferentialDriveRobotModel[],
  warnPrefix = '[DifferentialDrive]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.driveId)) {
      warnings.push({ code: 'DUPLICATE_DRIVE_ID', message: `${warnPrefix} Duplicate driveId: "${m.driveId}".` });
    }
    seen.add(m.driveId);
  }
  return warnings;
}

export function validateDuplicateEncoderIds(
  models: WheelEncoderModel[],
  warnPrefix = '[WheelEncoder]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.encoderId)) {
      warnings.push({ code: 'DUPLICATE_ENCODER_ID', message: `${warnPrefix} Duplicate encoderId: "${m.encoderId}".` });
    }
    seen.add(m.encoderId);
  }
  return warnings;
}

export function validateDuplicateDriverIds(
  models: MotorDriverModel[],
  warnPrefix = '[MotorDriver]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.driverId)) {
      warnings.push({ code: 'DUPLICATE_DRIVER_ID', message: `${warnPrefix} Duplicate driverId: "${m.driverId}".` });
    }
    seen.add(m.driverId);
  }
  return warnings;
}

export function validateDuplicateQueueIds(
  models: RobotCommandQueueModel[],
  warnPrefix = '[CommandQueue]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.queueId)) {
      warnings.push({ code: 'DUPLICATE_QUEUE_ID', message: `${warnPrefix} Duplicate queueId: "${m.queueId}".` });
    }
    seen.add(m.queueId);
  }
  return warnings;
}

export function validateDuplicateRobotPathIds(
  models: RobotPathModel[],
  warnPrefix = '[RobotPath]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.pathId)) {
      warnings.push({ code: 'DUPLICATE_PATH_ID', message: `${warnPrefix} Duplicate pathId: "${m.pathId}".` });
    }
    seen.add(m.pathId);
  }
  return warnings;
}

export function validateDuplicateTelemetryIds(
  models: RobotTelemetryModel[],
  warnPrefix = '[RobotTelemetry]',
): DriveValidationWarning[] {
  const seen = new Set<string>();
  const warnings: DriveValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.telemetryId)) {
      warnings.push({ code: 'DUPLICATE_TELEMETRY_ID', message: `${warnPrefix} Duplicate telemetryId: "${m.telemetryId}".` });
    }
    seen.add(m.telemetryId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// MOTOR DRIVER ENGINE (L298N)
// ═══════════════════════════════════════════════════════════════

/**
 * Derive the MotorDirection from L298N IN pin states.
 * L298N truth table:
 *   FORWARD:  INx=HIGH, INy=LOW
 *   BACKWARD: INx=LOW,  INy=HIGH
 *   BRAKE:    INx=HIGH, INy=HIGH
 *   COAST:    INx=LOW,  INy=LOW
 */
function deriveMotorDirection(inHigh: boolean, inLow: boolean): MotorDirection {
  if (inHigh && !inLow) return 'FORWARD';
  if (!inHigh && inLow) return 'BACKWARD';
  if (inHigh && inLow) return 'BRAKE';
  return 'COAST';
}

/**
 * Set motor PWM speed for a specific channel.
 * Channel 'LEFT' maps to enableAPWM, 'RIGHT' maps to enableBPWM.
 * PWM duty is clamped to 0–255.
 * Returns a new MotorDriverModel (immutable).
 */
export function setMotorSpeed(
  driver: MotorDriverModel,
  channel: 'LEFT' | 'RIGHT',
  pwmDuty: number,
): MotorDriverModel {
  const clampedPWM = Math.max(0, Math.min(DEFAULT_MOTOR_PWM_MAX, Math.round(pwmDuty)));
  const speedPercent = (clampedPWM / DEFAULT_MOTOR_PWM_MAX) * 100;

  if (channel === 'LEFT') {
    return {
      ...safeDeepCopy(driver),
      enableAPWM: clampedPWM,
      leftSpeedPercent: speedPercent,
    };
  }
  return {
    ...safeDeepCopy(driver),
    enableBPWM: clampedPWM,
    rightSpeedPercent: speedPercent,
  };
}

/**
 * Set motor direction for a specific channel.
 * Updates IN1/IN2 (LEFT) or IN3/IN4 (RIGHT) based on L298N truth table.
 * Returns a new MotorDriverModel (immutable).
 */
export function setMotorDirection(
  driver: MotorDriverModel,
  channel: 'LEFT' | 'RIGHT',
  direction: MotorDirection,
): MotorDriverModel {
  if (!VALID_MOTOR_DIRECTIONS.includes(direction)) {
    console.warn(`[MotorDriver] Invalid direction: "${direction}". Defaulting to COAST.`);
    direction = 'COAST';
  }

  const copy = safeDeepCopy(driver);

  if (channel === 'LEFT') {
    switch (direction) {
      case 'FORWARD':  copy.in1High = true;  copy.in2High = false; break;
      case 'BACKWARD': copy.in1High = false; copy.in2High = true;  break;
      case 'BRAKE':    copy.in1High = true;  copy.in2High = true;  break;
      case 'COAST':    copy.in1High = false; copy.in2High = false; break;
    }
    copy.leftMotorDirection = direction;
  } else {
    switch (direction) {
      case 'FORWARD':  copy.in3High = true;  copy.in4High = false; break;
      case 'BACKWARD': copy.in3High = false; copy.in4High = true;  break;
      case 'BRAKE':    copy.in3High = true;  copy.in4High = true;  break;
      case 'COAST':    copy.in3High = false; copy.in4High = false; break;
    }
    copy.rightMotorDirection = direction;
  }

  return copy;
}

/**
 * Stop a motor on a specific channel (set direction to BRAKE, PWM to 0).
 * Returns a new MotorDriverModel (immutable).
 */
export function stopMotor(
  driver: MotorDriverModel,
  channel: 'LEFT' | 'RIGHT',
): MotorDriverModel {
  let result = setMotorDirection(driver, channel, 'BRAKE');
  result = setMotorSpeed(result, channel, 0);
  return result;
}

/**
 * Simulate motor driver output — convert PWM + direction into speed (cm/s).
 * Negative speed for BACKWARD, 0 for BRAKE/COAST.
 */
export function simulateDriverOutput(
  driver: MotorDriverModel,
  maxSpeedCmPerSec: number,
): { leftSpeedCmPerSec: number; rightSpeedCmPerSec: number } {
  let leftSpeed = (driver.enableAPWM / DEFAULT_MOTOR_PWM_MAX) * maxSpeedCmPerSec;
  let rightSpeed = (driver.enableBPWM / DEFAULT_MOTOR_PWM_MAX) * maxSpeedCmPerSec;

  if (driver.leftMotorDirection === 'BACKWARD') leftSpeed = -leftSpeed;
  else if (driver.leftMotorDirection === 'BRAKE' || driver.leftMotorDirection === 'COAST') leftSpeed = 0;

  if (driver.rightMotorDirection === 'BACKWARD') rightSpeed = -rightSpeed;
  else if (driver.rightMotorDirection === 'BRAKE' || driver.rightMotorDirection === 'COAST') rightSpeed = 0;

  return { leftSpeedCmPerSec: leftSpeed, rightSpeedCmPerSec: rightSpeed };
}

// ═══════════════════════════════════════════════════════════════
// WHEEL ENCODER RUNTIME
// ═══════════════════════════════════════════════════════════════

/**
 * Update encoder ticks from distance traveled.
 * ticks = distanceCm / (π × wheelDiameter) × ticksPerRevolution
 * Returns a new WheelEncoderModel (immutable).
 */
export function updateEncoderTicks(
  encoder: WheelEncoderModel,
  distanceCm: number,
  wheelDiameterCm: number,
  timestamp: number,
): WheelEncoderModel {
  const circumference = Math.PI * wheelDiameterCm;
  if (circumference <= 0) {
    console.warn('[WheelEncoder] wheelDiameterCm must be > 0 for encoder calculation.');
    return safeDeepCopy(encoder);
  }

  const newTicks = Math.abs(distanceCm) / circumference * encoder.ticksPerRevolution;
  const totalTicks = encoder.tickCount + newTicks;
  const totalDistance = encoder.distanceCm + Math.abs(distanceCm);

  return {
    ...safeDeepCopy(encoder),
    tickCount: totalTicks,
    distanceCm: totalDistance,
    lastTickTimestamp: timestamp,
    encoderState: newTicks > 0 ? 'COUNTING' : encoder.encoderState,
  };
}

/**
 * Calculate distance from encoder ticks.
 * distance = (tickCount / ticksPerRevolution) × π × wheelDiameter
 */
export function calculateDistanceFromTicks(
  encoder: WheelEncoderModel,
  wheelDiameterCm: number,
): number {
  if (encoder.ticksPerRevolution <= 0) return 0;
  const circumference = Math.PI * wheelDiameterCm;
  return (encoder.tickCount / encoder.ticksPerRevolution) * circumference;
}

/**
 * Calculate RPM from encoder tick delta over time.
 * rpm = (tickDelta / ticksPerRevolution) / (deltaMs / 60000)
 */
export function calculateRPM(
  encoder: WheelEncoderModel,
  prevEncoder: WheelEncoderModel,
  deltaMs: number,
): number {
  if (deltaMs <= 0 || encoder.ticksPerRevolution <= 0) return 0;
  const tickDelta = encoder.tickCount - prevEncoder.tickCount;
  const revolutions = tickDelta / encoder.ticksPerRevolution;
  const minutes = deltaMs / 60000;
  return revolutions / minutes;
}

/**
 * Reset encoder to initial state.
 * Returns a new WheelEncoderModel (immutable).
 */
export function resetEncoder(
  encoder: WheelEncoderModel,
): WheelEncoderModel {
  return {
    ...safeDeepCopy(encoder),
    tickCount: 0,
    distanceCm: 0,
    rpm: 0,
    lastTickTimestamp: 0,
    encoderState: 'RESET',
  };
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENTIAL DRIVE SOLVER
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate linear velocity from left/right wheel speeds.
 * v = (vL + vR) / 2
 */
export function calculateDriveLinearVelocity(
  leftSpeed: number,
  rightSpeed: number,
): number {
  return (leftSpeed + rightSpeed) / 2;
}

/**
 * Calculate angular velocity from left/right wheel speeds and wheel base.
 * ω = (vR - vL) / wheelBaseCm (rad/s → deg/s)
 */
export function calculateDriveAngularVelocity(
  leftSpeed: number,
  rightSpeed: number,
  wheelBaseCm: number,
): number {
  if (wheelBaseCm <= 0) return 0;
  const radPerSec = (rightSpeed - leftSpeed) / wheelBaseCm;
  return radPerSec * (180 / Math.PI);
}

/**
 * Calculate wheel speed from PWM duty cycle.
 * speedCmPerSec = (pwmDuty / maxPWM) × maxSpeedCmPerSec
 */
export function calculateWheelSpeedFromPWM(
  pwmDuty: number,
  maxPWM: number,
  maxSpeedCmPerSec: number,
): number {
  if (maxPWM <= 0) return 0;
  const clamped = Math.max(0, Math.min(maxPWM, pwmDuty));
  return (clamped / maxPWM) * maxSpeedCmPerSec;
}

/**
 * Update drive pose using differential drive kinematics (Euler integration).
 * x += v × cos(θ) × dt
 * y += v × sin(θ) × dt
 * θ += ω × dt
 * Returns new position and heading (heading normalized to [0, 360)).
 */
export function updateDrivePose(
  posX: number,
  posY: number,
  headingDeg: number,
  linearVel: number,
  angularVelDeg: number,
  deltaSec: number,
): { x: number; y: number; headingDeg: number } {
  const headingRad = headingDeg * (Math.PI / 180);

  const newX = posX + linearVel * Math.cos(headingRad) * deltaSec;
  const newY = posY + linearVel * Math.sin(headingRad) * deltaSec;
  let newHeading = headingDeg + angularVelDeg * deltaSec;

  // Normalize heading to [0, 360)
  newHeading = ((newHeading % 360) + 360) % 360;

  return { x: newX, y: newY, headingDeg: newHeading };
}

/**
 * Perform one full drive simulation step.
 * Combines motor driver output → kinematics → encoder updates.
 * Returns updated drive, encoders, and new pose data (all immutable).
 */
export function simulateDriveStep(
  drive: DifferentialDriveRobotModel,
  motorDriver: MotorDriverModel,
  leftEncoder: WheelEncoderModel,
  rightEncoder: WheelEncoderModel,
  deltaMs: number,
  timestamp: number,
): {
  drive: DifferentialDriveRobotModel;
  leftEncoder: WheelEncoderModel;
  rightEncoder: WheelEncoderModel;
  newX: number;
  newY: number;
  newHeadingDeg: number;
} {
  const deltaSec = deltaMs / 1000;
  if (deltaSec <= 0) {
    return {
      drive: safeDeepCopy(drive),
      leftEncoder: safeDeepCopy(leftEncoder),
      rightEncoder: safeDeepCopy(rightEncoder),
      newX: 0,
      newY: 0,
      newHeadingDeg: 0,
    };
  }

  // Get wheel speeds from motor driver
  const driverOutput = simulateDriverOutput(motorDriver, drive.maxSpeedCmPerSec);
  const vL = driverOutput.leftSpeedCmPerSec;
  const vR = driverOutput.rightSpeedCmPerSec;

  // Compute kinematics
  const linearVel = calculateDriveLinearVelocity(vL, vR);
  const angularVelDeg = calculateDriveAngularVelocity(vL, vR, drive.wheelBaseCm);

  // Determine drive state
  let driveState: RobotDriveState = 'IDLE';
  if (Math.abs(linearVel) > 0.01 && Math.abs(angularVelDeg) > 1) {
    driveState = 'TURNING';
  } else if (Math.abs(linearVel) > 0.01) {
    driveState = 'DRIVING';
  } else if (Math.abs(angularVelDeg) > 0.01) {
    driveState = 'TURNING';
  }

  // Update encoders based on distance traveled
  const leftDistCm = Math.abs(vL) * deltaSec;
  const rightDistCm = Math.abs(vR) * deltaSec;

  const prevLeftEncoder = safeDeepCopy(leftEncoder);
  const prevRightEncoder = safeDeepCopy(rightEncoder);

  let newLeftEncoder = updateEncoderTicks(leftEncoder, leftDistCm, drive.wheelDiameterCm, timestamp);
  let newRightEncoder = updateEncoderTicks(rightEncoder, rightDistCm, drive.wheelDiameterCm, timestamp);

  // Compute RPM
  const leftRPM = calculateRPM(newLeftEncoder, prevLeftEncoder, deltaMs);
  const rightRPM = calculateRPM(newRightEncoder, prevRightEncoder, deltaMs);
  newLeftEncoder = { ...newLeftEncoder, rpm: leftRPM };
  newRightEncoder = { ...newRightEncoder, rpm: rightRPM };

  // Update drive model
  const newDrive: DifferentialDriveRobotModel = {
    ...safeDeepCopy(drive),
    driveState,
    timestamp,
  };

  // Compute new pose (caller is responsible for tracking absolute position;
  // we return deltas relative to origin for composition)
  const pose = updateDrivePose(0, 0, 0, linearVel, angularVelDeg, deltaSec);

  return {
    drive: newDrive,
    leftEncoder: newLeftEncoder,
    rightEncoder: newRightEncoder,
    newX: pose.x,
    newY: pose.y,
    newHeadingDeg: pose.headingDeg,
  };
}

/**
 * Calculate the turning radius for differential drive.
 * R = (wheelBase / 2) × (vL + vR) / (vR - vL)
 * Returns Infinity for straight-line motion (vL === vR).
 */
export function calculateTurningRadius(
  leftSpeed: number,
  rightSpeed: number,
  wheelBaseCm: number,
): number {
  const diff = rightSpeed - leftSpeed;
  if (Math.abs(diff) < 0.001) return Infinity;
  return (wheelBaseCm / 2) * ((leftSpeed + rightSpeed) / diff);
}

// ═══════════════════════════════════════════════════════════════
// ROBOT COMMAND QUEUE
// ═══════════════════════════════════════════════════════════════

/**
 * Enqueue a new drive command.
 * Returns a new RobotCommandQueueModel (immutable).
 */
export function enqueueCommand(
  queue: RobotCommandQueueModel,
  commandType: string,
  speedCmPerSec: number,
  durationMs: number,
  angleDeg: number,
): RobotCommandQueueModel {
  if (!VALID_DRIVE_COMMAND_TYPES.includes(commandType)) {
    console.warn(`[CommandQueue] Invalid commandType: "${commandType}". Command not enqueued.`);
    return safeDeepCopy(queue);
  }

  const copy = safeDeepCopy(queue);
  copy.commands.push({
    commandType,
    speedCmPerSec: Math.max(0, speedCmPerSec),
    durationMs: Math.max(0, durationMs),
    angleDeg,
    isComplete: false,
  });
  return copy;
}

/**
 * Dequeue (peek and advance) the current command.
 * Returns the current command (or undefined if queue is empty/exhausted)
 * and the updated queue.
 */
export function dequeueCommand(
  queue: RobotCommandQueueModel,
): {
  queue: RobotCommandQueueModel;
  command: { commandType: string; speedCmPerSec: number; durationMs: number; angleDeg: number; isComplete: boolean } | undefined;
} {
  const copy = safeDeepCopy(queue);
  if (copy.currentIndex >= copy.commands.length) {
    return { queue: copy, command: undefined };
  }

  const command = safeDeepCopy(copy.commands[copy.currentIndex]);
  copy.commands[copy.currentIndex].isComplete = true;
  copy.currentIndex += 1;
  return { queue: copy, command };
}

/**
 * Execute the next command in the queue — sets motor driver and drive state accordingly.
 * Returns updated queue, drive, and motorDriver (all immutable).
 */
export function executeNextCommand(
  queue: RobotCommandQueueModel,
  drive: DifferentialDriveRobotModel,
  motorDriver: MotorDriverModel,
): {
  queue: RobotCommandQueueModel;
  drive: DifferentialDriveRobotModel;
  motorDriver: MotorDriverModel;
} {
  const { queue: newQueue, command } = dequeueCommand(queue);

  if (!command) {
    // Queue exhausted
    const newDrive: DifferentialDriveRobotModel = {
      ...safeDeepCopy(drive),
      driveState: 'COMPLETED',
    };
    let newDriver = stopMotor(motorDriver, 'LEFT');
    newDriver = stopMotor(newDriver, 'RIGHT');
    return { queue: newQueue, drive: newDrive, motorDriver: newDriver };
  }

  let newDriver = safeDeepCopy(motorDriver);
  let driveState: RobotDriveState = 'QUEUED';

  const pwmDuty = (command.speedCmPerSec / drive.maxSpeedCmPerSec) * DEFAULT_MOTOR_PWM_MAX;

  switch (command.commandType) {
    case 'MOVE_FORWARD':
      newDriver = setMotorDirection(newDriver, 'LEFT', 'FORWARD');
      newDriver = setMotorDirection(newDriver, 'RIGHT', 'FORWARD');
      newDriver = setMotorSpeed(newDriver, 'LEFT', pwmDuty);
      newDriver = setMotorSpeed(newDriver, 'RIGHT', pwmDuty);
      driveState = 'DRIVING';
      break;
    case 'MOVE_BACKWARD':
      newDriver = setMotorDirection(newDriver, 'LEFT', 'BACKWARD');
      newDriver = setMotorDirection(newDriver, 'RIGHT', 'BACKWARD');
      newDriver = setMotorSpeed(newDriver, 'LEFT', pwmDuty);
      newDriver = setMotorSpeed(newDriver, 'RIGHT', pwmDuty);
      driveState = 'DRIVING';
      break;
    case 'TURN_LEFT':
      newDriver = setMotorDirection(newDriver, 'LEFT', 'BACKWARD');
      newDriver = setMotorDirection(newDriver, 'RIGHT', 'FORWARD');
      newDriver = setMotorSpeed(newDriver, 'LEFT', pwmDuty);
      newDriver = setMotorSpeed(newDriver, 'RIGHT', pwmDuty);
      driveState = 'TURNING';
      break;
    case 'TURN_RIGHT':
      newDriver = setMotorDirection(newDriver, 'LEFT', 'FORWARD');
      newDriver = setMotorDirection(newDriver, 'RIGHT', 'BACKWARD');
      newDriver = setMotorSpeed(newDriver, 'LEFT', pwmDuty);
      newDriver = setMotorSpeed(newDriver, 'RIGHT', pwmDuty);
      driveState = 'TURNING';
      break;
    case 'STOP':
      newDriver = stopMotor(newDriver, 'LEFT');
      newDriver = stopMotor(newDriver, 'RIGHT');
      driveState = 'IDLE';
      break;
    case 'WAIT':
      // Keep current motor state, transition to QUEUED
      driveState = 'QUEUED';
      break;
  }

  const newDrive: DifferentialDriveRobotModel = {
    ...safeDeepCopy(drive),
    driveState,
  };

  const updatedQueue: RobotCommandQueueModel = {
    ...newQueue,
    isExecuting: true,
  };

  return { queue: updatedQueue, drive: newDrive, motorDriver: newDriver };
}

/**
 * Cancel all pending commands in the queue.
 * Returns a new RobotCommandQueueModel (immutable).
 */
export function cancelQueue(
  queue: RobotCommandQueueModel,
): RobotCommandQueueModel {
  const copy = safeDeepCopy(queue);
  copy.isExecuting = false;
  copy.currentIndex = copy.commands.length;
  for (const cmd of copy.commands) {
    cmd.isComplete = true;
  }
  return copy;
}

/**
 * Check if all commands in the queue have been completed.
 */
export function isQueueComplete(
  queue: RobotCommandQueueModel,
): boolean {
  return queue.currentIndex >= queue.commands.length;
}

// ═══════════════════════════════════════════════════════════════
// PATH RUNTIME
// ═══════════════════════════════════════════════════════════════

/**
 * Record a waypoint in the robot's path.
 * Trims oldest waypoints if count exceeds DEFAULT_MAX_WAYPOINTS.
 * Returns a new RobotPathModel (immutable).
 */
export function recordWaypoint(
  path: RobotPathModel,
  x: number,
  y: number,
  headingDeg: number,
  timestamp: number,
): RobotPathModel {
  const copy = safeDeepCopy(path);
  copy.waypoints.push({ x, y, headingDeg, timestamp });

  // Trim oldest if exceeds max
  if (copy.waypoints.length > DEFAULT_MAX_WAYPOINTS) {
    const excess = copy.waypoints.length - DEFAULT_MAX_WAYPOINTS;
    copy.waypoints.splice(0, excess);
  }

  // Recalculate total distance
  copy.totalDistanceCm = calculatePathDistance(copy);

  return copy;
}

/**
 * Calculate total path distance from waypoints (sum of Euclidean segments).
 */
export function calculatePathDistance(
  path: RobotPathModel,
): number {
  let total = 0;
  for (let i = 1; i < path.waypoints.length; i++) {
    const prev = path.waypoints[i - 1];
    const curr = path.waypoints[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

/**
 * Clear all waypoints from the path.
 * Returns a new RobotPathModel (immutable).
 */
export function clearPath(
  path: RobotPathModel,
): RobotPathModel {
  return {
    ...safeDeepCopy(path),
    waypoints: [],
    totalDistanceCm: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// TELEMETRY RUNTIME
// ═══════════════════════════════════════════════════════════════

/**
 * Update telemetry with latest robot state.
 * Returns a new RobotTelemetryModel (immutable).
 */
export function updateTelemetry(
  telemetry: RobotTelemetryModel,
  posX: number,
  posY: number,
  headingDeg: number,
  velCmPerSec: number,
  angVelDegPerSec: number,
  leftEncoder: WheelEncoderModel,
  rightEncoder: WheelEncoderModel,
  batteryVoltage: number,
  timestamp: number,
): RobotTelemetryModel {
  return {
    ...safeDeepCopy(telemetry),
    positionX: posX,
    positionY: posY,
    headingDeg,
    velocityCmPerSec: velCmPerSec,
    angularVelocityDegPerSec: angVelDegPerSec,
    leftEncoderTicks: leftEncoder.tickCount,
    rightEncoderTicks: rightEncoder.tickCount,
    leftWheelRPM: leftEncoder.rpm,
    rightWheelRPM: rightEncoder.rpm,
    batteryVoltage,
    timestamp,
  };
}

/**
 * Get a human-readable telemetry summary string.
 */
export function getTelemetrySummary(
  telemetry: RobotTelemetryModel,
): string {
  return (
    `[Telemetry ${telemetry.telemetryId}] ` +
    `pos=(${telemetry.positionX.toFixed(1)}, ${telemetry.positionY.toFixed(1)}) ` +
    `hdg=${telemetry.headingDeg.toFixed(1)}° ` +
    `vel=${telemetry.velocityCmPerSec.toFixed(1)}cm/s ` +
    `ω=${telemetry.angularVelocityDegPerSec.toFixed(1)}°/s ` +
    `enc=(L:${telemetry.leftEncoderTicks.toFixed(0)}, R:${telemetry.rightEncoderTicks.toFixed(0)}) ` +
    `rpm=(L:${telemetry.leftWheelRPM.toFixed(1)}, R:${telemetry.rightWheelRPM.toFixed(1)}) ` +
    `bat=${telemetry.batteryVoltage.toFixed(1)}V`
  );
}

// ═══════════════════════════════════════════════════════════════
// ESP32 INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Virtual digitalWrite — maps pin numbers to L298N IN1/IN2/IN3/IN4.
 * Based on drive.in1Pin, drive.in2Pin, drive.in3Pin, drive.in4Pin.
 * Returns a new MotorDriverModel (immutable).
 */
export function virtualDigitalWrite(
  drive: DifferentialDriveRobotModel,
  motorDriver: MotorDriverModel,
  pin: number,
  value: boolean,
): MotorDriverModel {
  const copy = safeDeepCopy(motorDriver);

  if (pin === drive.in1Pin) {
    copy.in1High = value;
    copy.leftMotorDirection = deriveMotorDirection(copy.in1High, copy.in2High);
  } else if (pin === drive.in2Pin) {
    copy.in2High = value;
    copy.leftMotorDirection = deriveMotorDirection(copy.in1High, copy.in2High);
  } else if (pin === drive.in3Pin) {
    copy.in3High = value;
    copy.rightMotorDirection = deriveMotorDirection(copy.in3High, copy.in4High);
  } else if (pin === drive.in4Pin) {
    copy.in4High = value;
    copy.rightMotorDirection = deriveMotorDirection(copy.in3High, copy.in4High);
  } else {
    console.warn(`[ESP32] virtualDigitalWrite: pin ${pin} does not map to any motor driver IN pin.`);
  }

  return copy;
}

/**
 * Virtual analogWrite (PWM) — maps pin numbers to ENA/ENB.
 * Based on drive.enablePinA, drive.enablePinB.
 * Returns a new MotorDriverModel (immutable).
 */
export function virtualPWMWrite(
  drive: DifferentialDriveRobotModel,
  motorDriver: MotorDriverModel,
  pin: number,
  duty: number,
): MotorDriverModel {
  const clampedDuty = Math.max(0, Math.min(DEFAULT_MOTOR_PWM_MAX, Math.round(duty)));

  if (pin === drive.enablePinA) {
    return setMotorSpeed(motorDriver, 'LEFT', clampedDuty);
  } else if (pin === drive.enablePinB) {
    return setMotorSpeed(motorDriver, 'RIGHT', clampedDuty);
  }

  console.warn(`[ESP32] virtualPWMWrite: pin ${pin} does not map to ENA or ENB.`);
  return safeDeepCopy(motorDriver);
}

/**
 * Virtual interrupt tick — simulates encoder interrupt on a pin.
 * Increments tick count by 1 and updates state.
 * Returns a new WheelEncoderModel (immutable).
 */
export function virtualInterruptTick(
  drive: DifferentialDriveRobotModel,
  encoder: WheelEncoderModel,
  pin: number,
  wheelDiameterCm: number,
  timestamp: number,
): WheelEncoderModel {
  if (pin !== drive.leftEncoderPin && pin !== drive.rightEncoderPin) {
    console.warn(`[ESP32] virtualInterruptTick: pin ${pin} does not map to any encoder pin.`);
    return safeDeepCopy(encoder);
  }

  const circumference = Math.PI * wheelDiameterCm;
  const distancePerTick = encoder.ticksPerRevolution > 0
    ? circumference / encoder.ticksPerRevolution
    : 0;

  return {
    ...safeDeepCopy(encoder),
    tickCount: encoder.tickCount + 1,
    distanceCm: encoder.distanceCm + distancePerTick,
    lastTickTimestamp: timestamp,
    encoderState: 'COUNTING',
  };
}

// ═══════════════════════════════════════════════════════════════
// DRIVE REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Registry helper — maintains Map + insertion-order array with deep-copy safety.
 */
export class DriveRegistry<T extends object> {
  private _map = new Map<string, T>();
  private _order: string[] = [];

  get size(): number { return this._map.size; }

  register(id: string, model: T): void {
    this._map.set(id, safeDeepCopy(model));
    if (!this._order.includes(id)) this._order.push(id);
  }

  lookup(id: string): T | undefined {
    const m = this._map.get(id);
    return m ? safeDeepCopy(m) : undefined;
  }

  getAll(): T[] {
    return this._order
      .map(id => this._map.get(id))
      .filter((m): m is T => !!m)
      .map(m => safeDeepCopy(m));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this._map.get(id);
    if (!existing) return;
    this._map.set(id, safeDeepCopy({ ...existing, ...partial } as T));
  }

  remove(id: string): void {
    this._map.delete(id);
    this._order = this._order.filter(e => e !== id);
  }

  clear(): void {
    this._map.clear();
    this._order = [];
  }

  has(id: string): boolean { return this._map.has(id); }

  keys(): string[] { return [...this._order]; }
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENTIAL DRIVE SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * DifferentialDriveSynchronizer — manages all drive registries
 * and provides snapshot/serialization support.
 */
export class DifferentialDriveSynchronizer {
  public differentialDriveRobots = new DriveRegistry<DifferentialDriveRobotModel>();
  public wheelEncoders = new DriveRegistry<WheelEncoderModel>();
  public motorDrivers = new DriveRegistry<MotorDriverModel>();
  public robotCommandQueues = new DriveRegistry<RobotCommandQueueModel>();
  public robotPaths = new DriveRegistry<RobotPathModel>();
  public robotTelemetry = new DriveRegistry<RobotTelemetryModel>();

  /**
   * Build snapshot from arrays (validates and registers).
   * Rejects models that fail validation with empty IDs.
   */
  public buildSnapshot(
    differentialDriveRobotsArr: DifferentialDriveRobotModel[],
    wheelEncodersArr: WheelEncoderModel[],
    motorDriversArr: MotorDriverModel[],
    robotCommandQueuesArr: RobotCommandQueueModel[],
    robotPathsArr: RobotPathModel[],
    robotTelemetryArr: RobotTelemetryModel[],
  ): DifferentialDriveSnapshot {
    this.clear();

    for (const m of differentialDriveRobotsArr) {
      if (m.driveId) this.differentialDriveRobots.register(m.driveId, m);
    }
    for (const m of wheelEncodersArr) {
      if (m.encoderId) this.wheelEncoders.register(m.encoderId, m);
    }
    for (const m of motorDriversArr) {
      if (m.driverId) this.motorDrivers.register(m.driverId, m);
    }
    for (const m of robotCommandQueuesArr) {
      if (m.queueId) this.robotCommandQueues.register(m.queueId, m);
    }
    for (const m of robotPathsArr) {
      if (m.pathId) this.robotPaths.register(m.pathId, m);
    }
    for (const m of robotTelemetryArr) {
      if (m.telemetryId) this.robotTelemetry.register(m.telemetryId, m);
    }

    return this.toJSON();
  }

  /** Clear all registries. */
  public clear(): void {
    this.differentialDriveRobots.clear();
    this.wheelEncoders.clear();
    this.motorDrivers.clear();
    this.robotCommandQueues.clear();
    this.robotPaths.clear();
    this.robotTelemetry.clear();
  }

  /** Clone with deep copy. */
  public clone(): DifferentialDriveSynchronizer {
    const cloned = new DifferentialDriveSynchronizer();
    const snap = this.toJSON();
    cloned.fromJSON(snap);
    return cloned;
  }

  /** Export to JSON snapshot. */
  public toJSON(): DifferentialDriveSnapshot {
    return {
      differentialDriveRobots: this.differentialDriveRobots.getAll(),
      wheelEncoders: this.wheelEncoders.getAll(),
      motorDrivers: this.motorDrivers.getAll(),
      robotCommandQueues: this.robotCommandQueues.getAll(),
      robotPaths: this.robotPaths.getAll(),
      robotTelemetry: this.robotTelemetry.getAll(),
    };
  }

  /** Import from JSON snapshot. */
  public fromJSON(data: DifferentialDriveSnapshot | null | undefined): void {
    this.clear();
    if (!data) return;

    if (Array.isArray(data.differentialDriveRobots)) {
      for (const m of data.differentialDriveRobots) this.differentialDriveRobots.register(m.driveId, m);
    }
    if (Array.isArray(data.wheelEncoders)) {
      for (const m of data.wheelEncoders) this.wheelEncoders.register(m.encoderId, m);
    }
    if (Array.isArray(data.motorDrivers)) {
      for (const m of data.motorDrivers) this.motorDrivers.register(m.driverId, m);
    }
    if (Array.isArray(data.robotCommandQueues)) {
      for (const m of data.robotCommandQueues) this.robotCommandQueues.register(m.queueId, m);
    }
    if (Array.isArray(data.robotPaths)) {
      for (const m of data.robotPaths) this.robotPaths.register(m.pathId, m);
    }
    if (Array.isArray(data.robotTelemetry)) {
      for (const m of data.robotTelemetry) this.robotTelemetry.register(m.telemetryId, m);
    }
  }
}
