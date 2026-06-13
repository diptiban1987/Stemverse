// ═══════════════════════════════════════════════════════════════
// Phase 24A: Virtual Robotics Physics Runtime Foundation
// Deterministic metadata-only robotics physics simulation.
// Supports differential drive kinematics, physics stepping,
// AABB collision metadata, HC-SR04/Servo integration.
// No Canvas, no WebGL, no Pixi. Simulation data only.
// ═══════════════════════════════════════════════════════════════

import {
  RobotPhysicsModel,
  RobotPoseModel,
  WheelRuntimeModel,
  MotionCommandModel,
  CollisionModel,
  PhysicsWorldModel,
  PhysicsSnapshot,
  MotionState,
  CollisionState,
  PhysicsState,
} from '../types';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Default robot mass in grams */
export const DEFAULT_ROBOT_MASS = 300;

/** Default wheel base in cm (distance between left/right wheel centers) */
export const DEFAULT_WHEEL_BASE_CM = 12;

/** Default wheel radius in cm */
export const DEFAULT_WHEEL_RADIUS_CM = 3.3;

/** Default max speed in cm/s */
export const DEFAULT_MAX_SPEED_CM_PER_SEC = 30;

/** Default friction coefficient (0–1) */
export const DEFAULT_FRICTION_COEFF = 0.1;

/** Default bounding box dimensions in cm */
export const DEFAULT_BOUNDING_BOX_WIDTH = 18;
export const DEFAULT_BOUNDING_BOX_HEIGHT = 20;

/** Default physics tick rate */
export const DEFAULT_TICK_RATE_HZ = 60;

/** Default world bounds (cm) */
export const DEFAULT_WORLD_BOUNDS_MIN = -500;
export const DEFAULT_WORLD_BOUNDS_MAX = 500;

/** Default gravity (cm/s², 0 for 2D ground robots) */
export const DEFAULT_GRAVITY = 0;

/** Default robot speed for motion commands */
export const DEFAULT_COMMAND_SPEED_CM_PER_SEC = 15;

/** Default turn speed for motion commands (degrees/sec) */
export const DEFAULT_TURN_SPEED_DEG_PER_SEC = 90;

/** Valid motion states */
export const VALID_MOTION_STATES: MotionState[] = [
  'IDLE', 'MOVING_FORWARD', 'MOVING_BACKWARD', 'TURNING_LEFT', 'TURNING_RIGHT', 'STOPPED',
];

/** Valid collision states */
export const VALID_COLLISION_STATES: CollisionState[] = [
  'NONE', 'ENTERING', 'OVERLAPPING', 'EXITING',
];

/** Valid physics states */
export const VALID_PHYSICS_STATES: PhysicsState[] = [
  'IDLE', 'RUNNING', 'PAUSED', 'STOPPED',
];

/** Valid command types */
export const VALID_MOTION_COMMAND_TYPES: MotionCommandModel['commandType'][] = [
  'FORWARD', 'BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'STOP',
];

/** Valid wheel sides */
export const VALID_WHEEL_SIDES: WheelRuntimeModel['side'][] = ['LEFT', 'RIGHT'];

// ═══════════════════════════════════════════════════════════════
// VALIDATION WARNING TYPE
// ═══════════════════════════════════════════════════════════════

export interface PhysicsValidationWarning {
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultRobotPhysicsModel(
  robotId: string,
  overrides: Partial<RobotPhysicsModel> = {},
): RobotPhysicsModel {
  return {
    esp32Id: '',
    mass: DEFAULT_ROBOT_MASS,
    wheelBaseCm: DEFAULT_WHEEL_BASE_CM,
    wheelRadiusCm: DEFAULT_WHEEL_RADIUS_CM,
    maxSpeedCmPerSec: DEFAULT_MAX_SPEED_CM_PER_SEC,
    frictionCoeff: DEFAULT_FRICTION_COEFF,
    boundingBoxWidth: DEFAULT_BOUNDING_BOX_WIDTH,
    boundingBoxHeight: DEFAULT_BOUNDING_BOX_HEIGHT,
    futureRobotPhysicsHints: {},
    ...overrides,
    robotId,
  };
}

export function createDefaultRobotPoseModel(
  poseId: string,
  overrides: Partial<RobotPoseModel> = {},
): RobotPoseModel {
  return {
    robotId: '',
    positionX: 0,
    positionY: 0,
    headingDeg: 0,
    velocityCmPerSec: 0,
    angularVelocityDegPerSec: 0,
    motionState: 'IDLE',
    timestamp: 0,
    futureRobotPoseHints: {},
    ...overrides,
    poseId,
  };
}

export function createDefaultWheelRuntimeModel(
  wheelId: string,
  overrides: Partial<WheelRuntimeModel> = {},
): WheelRuntimeModel {
  return {
    robotId: '',
    side: 'LEFT',
    speedCmPerSec: 0,
    targetSpeedCmPerSec: 0,
    rotationDeg: 0,
    diameter: DEFAULT_WHEEL_RADIUS_CM * 2,
    futureWheelHints: {},
    ...overrides,
    wheelId,
  };
}

export function createDefaultMotionCommandModel(
  commandId: string,
  overrides: Partial<MotionCommandModel> = {},
): MotionCommandModel {
  return {
    robotId: '',
    commandType: 'STOP',
    speedCmPerSec: DEFAULT_COMMAND_SPEED_CM_PER_SEC,
    durationMs: 0,
    angleDeg: 0,
    timestamp: 0,
    isComplete: false,
    futureMotionCommandHints: {},
    ...overrides,
    commandId,
  };
}

export function createDefaultCollisionModel(
  collisionId: string,
  overrides: Partial<CollisionModel> = {},
): CollisionModel {
  return {
    objectAId: '',
    objectAType: 'ROBOT',
    objectBId: '',
    objectBType: 'WALL',
    collisionState: 'NONE',
    overlapX: 0,
    overlapY: 0,
    timestamp: 0,
    futureCollisionHints: {},
    ...overrides,
    collisionId,
  };
}

export function createDefaultPhysicsWorldModel(
  worldId: string,
  overrides: Partial<PhysicsWorldModel> = {},
): PhysicsWorldModel {
  return {
    esp32Id: '',
    state: 'IDLE',
    tickRateHz: DEFAULT_TICK_RATE_HZ,
    deltaAccumulatorMs: 0,
    worldBoundsMinX: DEFAULT_WORLD_BOUNDS_MIN,
    worldBoundsMinY: DEFAULT_WORLD_BOUNDS_MIN,
    worldBoundsMaxX: DEFAULT_WORLD_BOUNDS_MAX,
    worldBoundsMaxY: DEFAULT_WORLD_BOUNDS_MAX,
    gravity: DEFAULT_GRAVITY,
    timestamp: 0,
    futurePhysicsWorldHints: {},
    ...overrides,
    worldId,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateRobotPhysicsModel(
  model: RobotPhysicsModel | null | undefined,
  warnPrefix = '[RobotPhysics]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.robotId) {
    warnings.push({ code: 'EMPTY_ROBOT_ID', message: `${warnPrefix} robotId is empty.` });
  }
  if (model.mass <= 0) {
    warnings.push({ code: 'INVALID_MASS', message: `${warnPrefix} mass must be > 0, got ${model.mass}.` });
  }
  if (model.wheelBaseCm <= 0) {
    warnings.push({ code: 'INVALID_WHEEL_BASE', message: `${warnPrefix} wheelBaseCm must be > 0, got ${model.wheelBaseCm}.` });
  }
  if (model.wheelRadiusCm <= 0) {
    warnings.push({ code: 'INVALID_WHEEL_RADIUS', message: `${warnPrefix} wheelRadiusCm must be > 0, got ${model.wheelRadiusCm}.` });
  }
  if (model.maxSpeedCmPerSec <= 0) {
    warnings.push({ code: 'INVALID_MAX_SPEED', message: `${warnPrefix} maxSpeedCmPerSec must be > 0, got ${model.maxSpeedCmPerSec}.` });
  }
  if (model.frictionCoeff < 0 || model.frictionCoeff > 1) {
    warnings.push({ code: 'INVALID_FRICTION', message: `${warnPrefix} frictionCoeff must be 0–1, got ${model.frictionCoeff}.` });
  }
  if (model.boundingBoxWidth <= 0) {
    warnings.push({ code: 'INVALID_BOUNDING_BOX', message: `${warnPrefix} boundingBoxWidth must be > 0, got ${model.boundingBoxWidth}.` });
  }
  if (model.boundingBoxHeight <= 0) {
    warnings.push({ code: 'INVALID_BOUNDING_BOX', message: `${warnPrefix} boundingBoxHeight must be > 0, got ${model.boundingBoxHeight}.` });
  }
  return warnings;
}

export function validateRobotPoseModel(
  model: RobotPoseModel | null | undefined,
  warnPrefix = '[RobotPose]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.poseId) {
    warnings.push({ code: 'EMPTY_POSE_ID', message: `${warnPrefix} poseId is empty.` });
  }
  if (!VALID_MOTION_STATES.includes(model.motionState)) {
    warnings.push({ code: 'INVALID_MOTION_STATE', message: `${warnPrefix} Invalid motionState: "${model.motionState}".` });
  }
  return warnings;
}

export function validateWheelRuntimeModel(
  model: WheelRuntimeModel | null | undefined,
  warnPrefix = '[Wheel]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.wheelId) {
    warnings.push({ code: 'EMPTY_WHEEL_ID', message: `${warnPrefix} wheelId is empty.` });
  }
  if (!VALID_WHEEL_SIDES.includes(model.side)) {
    warnings.push({ code: 'INVALID_WHEEL_SIDE', message: `${warnPrefix} Invalid side: "${model.side}".` });
  }
  if (model.diameter <= 0) {
    warnings.push({ code: 'INVALID_DIAMETER', message: `${warnPrefix} diameter must be > 0, got ${model.diameter}.` });
  }
  return warnings;
}

export function validateMotionCommandModel(
  model: MotionCommandModel | null | undefined,
  warnPrefix = '[MotionCommand]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.commandId) {
    warnings.push({ code: 'EMPTY_COMMAND_ID', message: `${warnPrefix} commandId is empty.` });
  }
  if (!VALID_MOTION_COMMAND_TYPES.includes(model.commandType)) {
    warnings.push({ code: 'INVALID_COMMAND_TYPE', message: `${warnPrefix} Invalid commandType: "${model.commandType}".` });
  }
  if (model.speedCmPerSec < 0) {
    warnings.push({ code: 'INVALID_SPEED', message: `${warnPrefix} speedCmPerSec must be >= 0, got ${model.speedCmPerSec}.` });
  }
  return warnings;
}

export function validateCollisionModel(
  model: CollisionModel | null | undefined,
  warnPrefix = '[Collision]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.collisionId) {
    warnings.push({ code: 'EMPTY_COLLISION_ID', message: `${warnPrefix} collisionId is empty.` });
  }
  if (!VALID_COLLISION_STATES.includes(model.collisionState)) {
    warnings.push({ code: 'INVALID_COLLISION_STATE', message: `${warnPrefix} Invalid collisionState: "${model.collisionState}".` });
  }
  return warnings;
}

export function validatePhysicsWorldModel(
  model: PhysicsWorldModel | null | undefined,
  warnPrefix = '[PhysicsWorld]',
): PhysicsValidationWarning[] {
  const warnings: PhysicsValidationWarning[] = [];
  if (!model) {
    warnings.push({ code: 'NULL_MODEL', message: `${warnPrefix} Model is null or undefined.` });
    return warnings;
  }
  if (!model.worldId) {
    warnings.push({ code: 'EMPTY_WORLD_ID', message: `${warnPrefix} worldId is empty.` });
  }
  if (!VALID_PHYSICS_STATES.includes(model.state)) {
    warnings.push({ code: 'INVALID_PHYSICS_STATE', message: `${warnPrefix} Invalid state: "${model.state}".` });
  }
  if (model.tickRateHz <= 0) {
    warnings.push({ code: 'INVALID_TICK_RATE', message: `${warnPrefix} tickRateHz must be > 0, got ${model.tickRateHz}.` });
  }
  if (model.worldBoundsMinX >= model.worldBoundsMaxX) {
    warnings.push({ code: 'INVALID_WORLD_BOUNDS', message: `${warnPrefix} worldBoundsMinX must be < worldBoundsMaxX.` });
  }
  if (model.worldBoundsMinY >= model.worldBoundsMaxY) {
    warnings.push({ code: 'INVALID_WORLD_BOUNDS', message: `${warnPrefix} worldBoundsMinY must be < worldBoundsMaxY.` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateRobotPhysicsIds(
  models: RobotPhysicsModel[],
  warnPrefix = '[RobotPhysics]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.robotId)) {
      warnings.push({ code: 'DUPLICATE_ROBOT_PHYSICS_ID', message: `${warnPrefix} Duplicate robotId: "${m.robotId}".` });
    }
    seen.add(m.robotId);
  }
  return warnings;
}

export function validateDuplicateRobotPoseIds(
  models: RobotPoseModel[],
  warnPrefix = '[RobotPose]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.poseId)) {
      warnings.push({ code: 'DUPLICATE_ROBOT_POSE_ID', message: `${warnPrefix} Duplicate poseId: "${m.poseId}".` });
    }
    seen.add(m.poseId);
  }
  return warnings;
}

export function validateDuplicateWheelRuntimeIds(
  models: WheelRuntimeModel[],
  warnPrefix = '[Wheel]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.wheelId)) {
      warnings.push({ code: 'DUPLICATE_WHEEL_ID', message: `${warnPrefix} Duplicate wheelId: "${m.wheelId}".` });
    }
    seen.add(m.wheelId);
  }
  return warnings;
}

export function validateDuplicateMotionCommandIds(
  models: MotionCommandModel[],
  warnPrefix = '[MotionCommand]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.commandId)) {
      warnings.push({ code: 'DUPLICATE_MOTION_COMMAND_ID', message: `${warnPrefix} Duplicate commandId: "${m.commandId}".` });
    }
    seen.add(m.commandId);
  }
  return warnings;
}

export function validateDuplicateCollisionIds(
  models: CollisionModel[],
  warnPrefix = '[Collision]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.collisionId)) {
      warnings.push({ code: 'DUPLICATE_COLLISION_ID', message: `${warnPrefix} Duplicate collisionId: "${m.collisionId}".` });
    }
    seen.add(m.collisionId);
  }
  return warnings;
}

export function validateDuplicatePhysicsWorldIds(
  models: PhysicsWorldModel[],
  warnPrefix = '[PhysicsWorld]',
): PhysicsValidationWarning[] {
  const seen = new Set<string>();
  const warnings: PhysicsValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.worldId)) {
      warnings.push({ code: 'DUPLICATE_PHYSICS_WORLD_ID', message: `${warnPrefix} Duplicate worldId: "${m.worldId}".` });
    }
    seen.add(m.worldId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DIFFERENTIAL DRIVE ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate forward velocity from left/right wheel speeds.
 * v = (vL + vR) / 2
 */
export function calculateForwardVelocity(
  leftWheelSpeed: number,
  rightWheelSpeed: number,
): number {
  return (leftWheelSpeed + rightWheelSpeed) / 2;
}

/**
 * Calculate angular velocity from left/right wheel speeds and wheel base.
 * ω = (vR - vL) / wheelBaseCm  (in degrees/sec)
 */
export function calculateAngularVelocity(
  leftWheelSpeed: number,
  rightWheelSpeed: number,
  wheelBaseCm: number,
): number {
  if (wheelBaseCm <= 0) return 0;
  const radPerSec = (rightWheelSpeed - leftWheelSpeed) / wheelBaseCm;
  return radPerSec * (180 / Math.PI);
}

/**
 * Update robot pose using differential drive kinematics.
 * Uses Euler integration: x += v·cos(θ)·dt, y += v·sin(θ)·dt, θ += ω·dt
 * Returns a new pose (immutable).
 */
export function updatePose(
  pose: RobotPoseModel,
  forwardVelocity: number,
  angularVelocityDeg: number,
  deltaSec: number,
  timestamp: number,
): RobotPoseModel {
  const headingRad = pose.headingDeg * (Math.PI / 180);

  const newX = pose.positionX + forwardVelocity * Math.cos(headingRad) * deltaSec;
  const newY = pose.positionY + forwardVelocity * Math.sin(headingRad) * deltaSec;
  let newHeading = pose.headingDeg + angularVelocityDeg * deltaSec;

  // Normalize heading to [0, 360)
  newHeading = ((newHeading % 360) + 360) % 360;

  return {
    ...safeDeepCopy(pose),
    positionX: newX,
    positionY: newY,
    headingDeg: newHeading,
    velocityCmPerSec: forwardVelocity,
    angularVelocityDegPerSec: angularVelocityDeg,
    timestamp,
  };
}

/**
 * Update heading only (for pure rotation).
 * Returns a new pose (immutable).
 */
export function updateHeading(
  pose: RobotPoseModel,
  angleDeltaDeg: number,
  timestamp: number,
): RobotPoseModel {
  let newHeading = pose.headingDeg + angleDeltaDeg;
  newHeading = ((newHeading % 360) + 360) % 360;
  return {
    ...safeDeepCopy(pose),
    headingDeg: newHeading,
    velocityCmPerSec: 0,
    timestamp,
  };
}

// ═══════════════════════════════════════════════════════════════
// PHYSICS TICK ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * AABB bounding box for collision detection.
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Get AABB from robot pose and physics model.
 */
export function getRobotAABB(pose: RobotPoseModel, physics: RobotPhysicsModel): AABB {
  const hw = physics.boundingBoxWidth / 2;
  const hh = physics.boundingBoxHeight / 2;
  return {
    minX: pose.positionX - hw,
    minY: pose.positionY - hh,
    maxX: pose.positionX + hw,
    maxY: pose.positionY + hh,
  };
}

/**
 * Check if two AABBs overlap.
 * Returns overlap amounts or null if no overlap.
 */
export function checkAABBOverlap(
  a: AABB,
  b: AABB,
): { overlapX: number; overlapY: number } | null {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);

  if (overlapX > 0 && overlapY > 0) {
    return { overlapX, overlapY };
  }
  return null;
}

/**
 * Apply friction to wheel speeds.
 * Decelerates toward 0 at rate = friction × maxSpeed × dt.
 */
export function applyFriction(
  speed: number,
  frictionCoeff: number,
  maxSpeed: number,
  deltaSec: number,
): number {
  if (speed === 0) return 0;
  const decel = frictionCoeff * maxSpeed * deltaSec;
  if (Math.abs(speed) <= decel) return 0;
  return speed > 0 ? speed - decel : speed + decel;
}

/**
 * Clamp position to world bounds.
 */
export function clampToWorldBounds(
  x: number,
  y: number,
  hw: number,
  hh: number,
  world: PhysicsWorldModel,
): { x: number; y: number; clampedX: boolean; clampedY: boolean } {
  let clampedX = false;
  let clampedY = false;
  let cx = x;
  let cy = y;

  if (cx - hw < world.worldBoundsMinX) { cx = world.worldBoundsMinX + hw; clampedX = true; }
  if (cx + hw > world.worldBoundsMaxX) { cx = world.worldBoundsMaxX - hw; clampedX = true; }
  if (cy - hh < world.worldBoundsMinY) { cy = world.worldBoundsMinY + hh; clampedY = true; }
  if (cy + hh > world.worldBoundsMaxY) { cy = world.worldBoundsMaxY - hh; clampedY = true; }

  return { x: cx, y: cy, clampedX, clampedY };
}

/**
 * Perform one physics step for a robot.
 * Deterministic fixed-timestep integration.
 * Returns updated pose and wheel states.
 */
export function stepPhysics(
  physics: RobotPhysicsModel,
  pose: RobotPoseModel,
  leftWheel: WheelRuntimeModel,
  rightWheel: WheelRuntimeModel,
  world: PhysicsWorldModel,
  deltaMs: number,
  timestamp: number,
): {
  pose: RobotPoseModel;
  leftWheel: WheelRuntimeModel;
  rightWheel: WheelRuntimeModel;
} {
  const deltaSec = deltaMs / 1000;
  if (deltaSec <= 0) {
    return {
      pose: safeDeepCopy(pose),
      leftWheel: safeDeepCopy(leftWheel),
      rightWheel: safeDeepCopy(rightWheel),
    };
  }

  // Update wheel speeds toward targets with simple lerp
  let lSpeed = leftWheel.speedCmPerSec;
  let rSpeed = rightWheel.speedCmPerSec;

  // If target is set, move speed toward target
  const lDiff = leftWheel.targetSpeedCmPerSec - lSpeed;
  const rDiff = rightWheel.targetSpeedCmPerSec - rSpeed;
  const maxAccel = physics.maxSpeedCmPerSec * 2 * deltaSec; // acceleration limit

  if (Math.abs(lDiff) <= maxAccel) {
    lSpeed = leftWheel.targetSpeedCmPerSec;
  } else {
    lSpeed += Math.sign(lDiff) * maxAccel;
  }

  if (Math.abs(rDiff) <= maxAccel) {
    rSpeed = rightWheel.targetSpeedCmPerSec;
  } else {
    rSpeed += Math.sign(rDiff) * maxAccel;
  }

  // Clamp to max speed
  lSpeed = Math.max(-physics.maxSpeedCmPerSec, Math.min(physics.maxSpeedCmPerSec, lSpeed));
  rSpeed = Math.max(-physics.maxSpeedCmPerSec, Math.min(physics.maxSpeedCmPerSec, rSpeed));

  // Apply friction when target is 0 (coasting to stop)
  if (leftWheel.targetSpeedCmPerSec === 0) {
    lSpeed = applyFriction(lSpeed, physics.frictionCoeff, physics.maxSpeedCmPerSec, deltaSec);
  }
  if (rightWheel.targetSpeedCmPerSec === 0) {
    rSpeed = applyFriction(rSpeed, physics.frictionCoeff, physics.maxSpeedCmPerSec, deltaSec);
  }

  // Differential drive kinematics
  const forwardVelocity = calculateForwardVelocity(lSpeed, rSpeed);
  const angularVelocity = calculateAngularVelocity(lSpeed, rSpeed, physics.wheelBaseCm);

  // Update pose
  let newPose = updatePose(pose, forwardVelocity, angularVelocity, deltaSec, timestamp);

  // Determine motion state
  let motionState: MotionState = 'IDLE';
  if (Math.abs(forwardVelocity) < 0.01 && Math.abs(angularVelocity) < 0.01) {
    motionState = lSpeed === 0 && rSpeed === 0 ? 'IDLE' : 'STOPPED';
  } else if (angularVelocity > 1) {
    motionState = 'TURNING_RIGHT';
  } else if (angularVelocity < -1) {
    motionState = 'TURNING_LEFT';
  } else if (forwardVelocity > 0) {
    motionState = 'MOVING_FORWARD';
  } else if (forwardVelocity < 0) {
    motionState = 'MOVING_BACKWARD';
  }

  newPose.motionState = motionState;

  // Clamp to world bounds
  const hw = physics.boundingBoxWidth / 2;
  const hh = physics.boundingBoxHeight / 2;
  const clamped = clampToWorldBounds(newPose.positionX, newPose.positionY, hw, hh, world);
  newPose.positionX = clamped.x;
  newPose.positionY = clamped.y;

  // Update wheel rotation (visual feedback data)
  const circumference = Math.PI * leftWheel.diameter;
  const lRotDelta = circumference > 0 ? (lSpeed * deltaSec / circumference) * 360 : 0;
  const rRotDelta = circumference > 0 ? (rSpeed * deltaSec / circumference) * 360 : 0;

  const newLeftWheel: WheelRuntimeModel = {
    ...safeDeepCopy(leftWheel),
    speedCmPerSec: lSpeed,
    rotationDeg: (leftWheel.rotationDeg + lRotDelta) % 360,
  };

  const newRightWheel: WheelRuntimeModel = {
    ...safeDeepCopy(rightWheel),
    speedCmPerSec: rSpeed,
    rotationDeg: (rightWheel.rotationDeg + rRotDelta) % 360,
  };

  return { pose: newPose, leftWheel: newLeftWheel, rightWheel: newRightWheel };
}

// ═══════════════════════════════════════════════════════════════
// MOTION COMMANDS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a motion command to set wheel target speeds.
 * Returns updated left/right wheel models and motion state.
 */
export function applyMotionCommand(
  command: MotionCommandModel,
  physics: RobotPhysicsModel,
  leftWheel: WheelRuntimeModel,
  rightWheel: WheelRuntimeModel,
): {
  leftWheel: WheelRuntimeModel;
  rightWheel: WheelRuntimeModel;
  motionState: MotionState;
} {
  const speed = Math.min(command.speedCmPerSec, physics.maxSpeedCmPerSec);
  let lTarget = 0;
  let rTarget = 0;
  let motionState: MotionState = 'IDLE';

  switch (command.commandType) {
    case 'FORWARD':
      lTarget = speed;
      rTarget = speed;
      motionState = 'MOVING_FORWARD';
      break;
    case 'BACKWARD':
      lTarget = -speed;
      rTarget = -speed;
      motionState = 'MOVING_BACKWARD';
      break;
    case 'TURN_LEFT':
      lTarget = -speed;
      rTarget = speed;
      motionState = 'TURNING_LEFT';
      break;
    case 'TURN_RIGHT':
      lTarget = speed;
      rTarget = -speed;
      motionState = 'TURNING_RIGHT';
      break;
    case 'STOP':
      lTarget = 0;
      rTarget = 0;
      motionState = 'STOPPED';
      break;
  }

  return {
    leftWheel: {
      ...safeDeepCopy(leftWheel),
      targetSpeedCmPerSec: lTarget,
    },
    rightWheel: {
      ...safeDeepCopy(rightWheel),
      targetSpeedCmPerSec: rTarget,
    },
    motionState,
  };
}

// ═══════════════════════════════════════════════════════════════
// COLLISION DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect AABB collisions between robots and obstacles.
 * Returns collision metadata (no physics resolution).
 */
export function detectCollisions(
  robotPoses: { id: string; pose: RobotPoseModel; physics: RobotPhysicsModel }[],
  obstacles: { id: string; aabb: AABB; objectType: string }[],
  existingCollisions: CollisionModel[],
  timestamp: number,
): CollisionModel[] {
  const results: CollisionModel[] = [];
  const existingMap = new Map<string, CollisionModel>();
  for (const c of existingCollisions) {
    const key = `${c.objectAId}_${c.objectBId}`;
    existingMap.set(key, c);
  }

  // Robot vs obstacle
  for (const robot of robotPoses) {
    const robotAABB = getRobotAABB(robot.pose, robot.physics);

    for (const obstacle of obstacles) {
      const key = `${robot.id}_${obstacle.id}`;
      const overlap = checkAABBOverlap(robotAABB, obstacle.aabb);
      const prev = existingMap.get(key);

      if (overlap) {
        // Currently overlapping
        let state: CollisionState = 'ENTERING';
        if (prev && (prev.collisionState === 'ENTERING' || prev.collisionState === 'OVERLAPPING')) {
          state = 'OVERLAPPING';
        }
        results.push({
          collisionId: key,
          objectAId: robot.id,
          objectAType: 'ROBOT',
          objectBId: obstacle.id,
          objectBType: obstacle.objectType,
          collisionState: state,
          overlapX: overlap.overlapX,
          overlapY: overlap.overlapY,
          timestamp,
          futureCollisionHints: {},
        });
      } else if (prev && (prev.collisionState === 'ENTERING' || prev.collisionState === 'OVERLAPPING')) {
        // Was overlapping, now exiting
        results.push({
          ...safeDeepCopy(prev),
          collisionState: 'EXITING',
          overlapX: 0,
          overlapY: 0,
          timestamp,
        });
      }
    }
  }

  // Robot vs robot
  for (let i = 0; i < robotPoses.length; i++) {
    for (let j = i + 1; j < robotPoses.length; j++) {
      const a = robotPoses[i];
      const b = robotPoses[j];
      const key = `${a.id}_${b.id}`;
      const aAABB = getRobotAABB(a.pose, a.physics);
      const bAABB = getRobotAABB(b.pose, b.physics);
      const overlap = checkAABBOverlap(aAABB, bAABB);
      const prev = existingMap.get(key);

      if (overlap) {
        let state: CollisionState = 'ENTERING';
        if (prev && (prev.collisionState === 'ENTERING' || prev.collisionState === 'OVERLAPPING')) {
          state = 'OVERLAPPING';
        }
        results.push({
          collisionId: key,
          objectAId: a.id,
          objectAType: 'ROBOT',
          objectBId: b.id,
          objectBType: 'ROBOT',
          collisionState: state,
          overlapX: overlap.overlapX,
          overlapY: overlap.overlapY,
          timestamp,
          futureCollisionHints: {},
        });
      } else if (prev && (prev.collisionState === 'ENTERING' || prev.collisionState === 'OVERLAPPING')) {
        results.push({
          ...safeDeepCopy(prev),
          collisionState: 'EXITING',
          overlapX: 0,
          overlapY: 0,
          timestamp,
        });
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// HC-SR04 INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute sensor world position and direction from robot pose.
 * sensorOffset: local position of sensor relative to robot center (cm).
 * sensorAngleOffset: local rotation of sensor relative to robot heading (deg).
 * Returns world position and direction.
 */
export function computeSensorWorldPosition(
  pose: RobotPoseModel,
  sensorOffsetX: number,
  sensorOffsetY: number,
  sensorAngleOffsetDeg: number,
): { worldX: number; worldY: number; worldDirectionDeg: number } {
  const headingRad = pose.headingDeg * (Math.PI / 180);
  const cosH = Math.cos(headingRad);
  const sinH = Math.sin(headingRad);

  // Rotate sensor offset by robot heading
  const worldX = pose.positionX + sensorOffsetX * cosH - sensorOffsetY * sinH;
  const worldY = pose.positionY + sensorOffsetX * sinH + sensorOffsetY * cosH;
  const worldDirectionDeg = ((pose.headingDeg + sensorAngleOffsetDeg) % 360 + 360) % 360;

  return { worldX, worldY, worldDirectionDeg };
}

/**
 * Compute distance from a robot-mounted sensor to the nearest obstacle.
 * Uses robot pose to transform sensor into world coordinates.
 * Returns distance in cm, or -1 if no obstacle found.
 */
export function computeRobotSensorDistance(
  pose: RobotPoseModel,
  sensorOffsetX: number,
  sensorOffsetY: number,
  sensorAngleOffsetDeg: number,
  beamAngleDeg: number,
  maxRangeCm: number,
  obstacles: { positionX: number; positionY: number; width: number; height: number }[],
): number {
  const sensor = computeSensorWorldPosition(pose, sensorOffsetX, sensorOffsetY, sensorAngleOffsetDeg);
  let nearest = -1;

  for (const obs of obstacles) {
    // Simple Euclidean distance to obstacle center
    const dx = obs.positionX - sensor.worldX;
    const dy = obs.positionY - sensor.worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRangeCm) continue;

    // Check if obstacle is within beam cone
    const angleTo = Math.atan2(dy, dx) * (180 / Math.PI);
    const sensorDir = sensor.worldDirectionDeg;
    let angleDiff = ((angleTo - sensorDir) % 360 + 360) % 360;
    if (angleDiff > 180) angleDiff -= 360;

    if (Math.abs(angleDiff) > beamAngleDeg) continue;

    // Subtract half obstacle size for nearest edge approximation
    const hw = obs.width / 2;
    const hh = obs.height / 2;
    const dirRad = sensorDir * (Math.PI / 180);
    const projectedHalfSize = Math.abs(Math.cos(dirRad) * hw) + Math.abs(Math.sin(dirRad) * hh);
    const edgeDist = Math.max(0, dist - projectedHalfSize);

    if (nearest < 0 || edgeDist < nearest) {
      nearest = edgeDist;
    }
  }

  return nearest;
}

// ═══════════════════════════════════════════════════════════════
// SERVO INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute sensor direction offset from servo angle.
 * Maps servo angle (0–180°) to sensor direction offset.
 * At 90° the sensor points straight ahead; at 0° it's -90° left; at 180° it's +90° right.
 */
export function computeServoSensorDirection(
  servoAngleDeg: number,
  servoCenterDeg: number = 90,
): number {
  return servoAngleDeg - servoCenterDeg;
}

/**
 * Compute robot-mounted HC-SR04 distance with servo-controlled direction.
 * Combines robot pose + servo angle + sensor offset for full sweep capability.
 */
export function computeRobotSensorDistanceWithServo(
  pose: RobotPoseModel,
  sensorOffsetX: number,
  sensorOffsetY: number,
  servoAngleDeg: number,
  beamAngleDeg: number,
  maxRangeCm: number,
  obstacles: { positionX: number; positionY: number; width: number; height: number }[],
): number {
  const servoOffset = computeServoSensorDirection(servoAngleDeg);
  return computeRobotSensorDistance(
    pose, sensorOffsetX, sensorOffsetY, servoOffset,
    beamAngleDeg, maxRangeCm, obstacles,
  );
}

// ═══════════════════════════════════════════════════════════════
// ROBOTICS PHYSICS SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Registry helper — maintains Map + insertion-order array with deep-copy safety.
 */
class PhysicsRegistry<T extends object> {
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

/**
 * RoboticsPhysicsSynchronizer — manages all physics registries
 * and provides snapshot/serialization support.
 */
export class RoboticsPhysicsSynchronizer {
  public robotPhysics = new PhysicsRegistry<RobotPhysicsModel>();
  public robotPoses = new PhysicsRegistry<RobotPoseModel>();
  public wheelRuntimes = new PhysicsRegistry<WheelRuntimeModel>();
  public motionCommands = new PhysicsRegistry<MotionCommandModel>();
  public collisions = new PhysicsRegistry<CollisionModel>();
  public physicsWorlds = new PhysicsRegistry<PhysicsWorldModel>();

  /**
   * Build snapshot from arrays (validates and registers).
   * Rejects models that fail validation with empty IDs.
   */
  public buildSnapshot(
    robotPhysicsArr: RobotPhysicsModel[],
    robotPosesArr: RobotPoseModel[],
    wheelRuntimesArr: WheelRuntimeModel[],
    motionCommandsArr: MotionCommandModel[],
    collisionsArr: CollisionModel[],
    physicsWorldsArr: PhysicsWorldModel[],
  ): PhysicsSnapshot {
    this.clear();

    for (const m of robotPhysicsArr) {
      if (m.robotId) this.robotPhysics.register(m.robotId, m);
    }
    for (const m of robotPosesArr) {
      if (m.poseId) this.robotPoses.register(m.poseId, m);
    }
    for (const m of wheelRuntimesArr) {
      if (m.wheelId) this.wheelRuntimes.register(m.wheelId, m);
    }
    for (const m of motionCommandsArr) {
      if (m.commandId) this.motionCommands.register(m.commandId, m);
    }
    for (const m of collisionsArr) {
      if (m.collisionId) this.collisions.register(m.collisionId, m);
    }
    for (const m of physicsWorldsArr) {
      if (m.worldId) this.physicsWorlds.register(m.worldId, m);
    }

    return this.toJSON();
  }

  /** Clear all registries. */
  public clear(): void {
    this.robotPhysics.clear();
    this.robotPoses.clear();
    this.wheelRuntimes.clear();
    this.motionCommands.clear();
    this.collisions.clear();
    this.physicsWorlds.clear();
  }

  /** Clone with deep copy. */
  public clone(): RoboticsPhysicsSynchronizer {
    const cloned = new RoboticsPhysicsSynchronizer();
    const snap = this.toJSON();
    cloned.fromJSON(snap);
    return cloned;
  }

  /** Export to JSON snapshot. */
  public toJSON(): PhysicsSnapshot {
    return {
      robotPhysics: this.robotPhysics.getAll(),
      robotPoses: this.robotPoses.getAll(),
      wheelRuntimes: this.wheelRuntimes.getAll(),
      motionCommands: this.motionCommands.getAll(),
      collisions: this.collisions.getAll(),
      physicsWorlds: this.physicsWorlds.getAll(),
    };
  }

  /** Import from JSON snapshot. */
  public fromJSON(data: PhysicsSnapshot | null | undefined): void {
    this.clear();
    if (!data) return;

    if (Array.isArray(data.robotPhysics)) {
      for (const m of data.robotPhysics) this.robotPhysics.register(m.robotId, m);
    }
    if (Array.isArray(data.robotPoses)) {
      for (const m of data.robotPoses) this.robotPoses.register(m.poseId, m);
    }
    if (Array.isArray(data.wheelRuntimes)) {
      for (const m of data.wheelRuntimes) this.wheelRuntimes.register(m.wheelId, m);
    }
    if (Array.isArray(data.motionCommands)) {
      for (const m of data.motionCommands) this.motionCommands.register(m.commandId, m);
    }
    if (Array.isArray(data.collisions)) {
      for (const m of data.collisions) this.collisions.register(m.collisionId, m);
    }
    if (Array.isArray(data.physicsWorlds)) {
      for (const m of data.physicsWorlds) this.physicsWorlds.register(m.worldId, m);
    }
  }
}
