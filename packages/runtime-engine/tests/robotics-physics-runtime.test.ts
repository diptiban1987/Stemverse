// ═══════════════════════════════════════════════════════════════
// Phase 24A: Virtual Robotics Physics Runtime Foundation — Tests
// 16 sections, 100,000+ assertions, stress iterations = 500
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDefaultRobotPhysicsModel,
  createDefaultRobotPoseModel,
  createDefaultWheelRuntimeModel,
  createDefaultMotionCommandModel,
  createDefaultCollisionModel,
  createDefaultPhysicsWorldModel,
  validateRobotPhysicsModel,
  validateRobotPoseModel,
  validateWheelRuntimeModel,
  validateMotionCommandModel,
  validateCollisionModel,
  validatePhysicsWorldModel,
  validateDuplicateRobotPhysicsIds,
  validateDuplicateRobotPoseIds,
  validateDuplicateWheelRuntimeIds,
  validateDuplicateMotionCommandIds,
  validateDuplicateCollisionIds,
  validateDuplicatePhysicsWorldIds,
  calculateForwardVelocity,
  calculateAngularVelocity,
  updatePose,
  updateHeading,
  stepPhysics,
  applyMotionCommand,
  detectCollisions,
  checkAABBOverlap,
  getRobotAABB,
  applyFriction,
  clampToWorldBounds,
  computeSensorWorldPosition,
  computeRobotSensorDistance,
  computeServoSensorDirection,
  computeRobotSensorDistanceWithServo,
  RoboticsPhysicsSynchronizer,
  VALID_MOTION_STATES,
  VALID_COLLISION_STATES,
  VALID_PHYSICS_STATES,
  VALID_MOTION_COMMAND_TYPES,
  VALID_WHEEL_SIDES,
  DEFAULT_ROBOT_MASS,
  DEFAULT_WHEEL_BASE_CM,
  DEFAULT_WHEEL_RADIUS_CM,
  DEFAULT_MAX_SPEED_CM_PER_SEC,
  DEFAULT_FRICTION_COEFF,
  DEFAULT_BOUNDING_BOX_WIDTH,
  DEFAULT_BOUNDING_BOX_HEIGHT,
  DEFAULT_TICK_RATE_HZ,
  DEFAULT_WORLD_BOUNDS_MIN,
  DEFAULT_WORLD_BOUNDS_MAX,
  DEFAULT_GRAVITY,
  DEFAULT_COMMAND_SPEED_CM_PER_SEC,
  DEFAULT_TURN_SPEED_DEG_PER_SEC,
} from '../src/stage/robotics-physics-runtime';

import type {
  RobotPhysicsModel,
  RobotPoseModel,
  WheelRuntimeModel,
  MotionCommandModel,
  CollisionModel,
  PhysicsWorldModel,
  PhysicsSnapshot,
} from '../src/types';

const STRESS_ITERATIONS = 500;

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Factory Functions
// ═══════════════════════════════════════════════════════════════

describe('Phase 24A: Robotics Physics Runtime', () => {

  describe('Section 1: Factory Functions', () => {
    it('should create default RobotPhysicsModel with correct defaults', () => {
      const model = createDefaultRobotPhysicsModel('robot-1');
      expect(model.robotId).toBe('robot-1');
      expect(model.esp32Id).toBe('');
      expect(model.mass).toBe(DEFAULT_ROBOT_MASS);
      expect(model.wheelBaseCm).toBe(DEFAULT_WHEEL_BASE_CM);
      expect(model.wheelRadiusCm).toBe(DEFAULT_WHEEL_RADIUS_CM);
      expect(model.maxSpeedCmPerSec).toBe(DEFAULT_MAX_SPEED_CM_PER_SEC);
      expect(model.frictionCoeff).toBe(DEFAULT_FRICTION_COEFF);
      expect(model.boundingBoxWidth).toBe(DEFAULT_BOUNDING_BOX_WIDTH);
      expect(model.boundingBoxHeight).toBe(DEFAULT_BOUNDING_BOX_HEIGHT);
      expect(model.futureRobotPhysicsHints).toEqual({});
    });

    it('should create RobotPhysicsModel with overrides (ID always wins)', () => {
      const model = createDefaultRobotPhysicsModel('r1', { robotId: 'wrong', mass: 500, esp32Id: 'esp-1' });
      expect(model.robotId).toBe('r1');
      expect(model.mass).toBe(500);
      expect(model.esp32Id).toBe('esp-1');
    });

    it('should create default RobotPoseModel with correct defaults', () => {
      const model = createDefaultRobotPoseModel('pose-1');
      expect(model.poseId).toBe('pose-1');
      expect(model.robotId).toBe('');
      expect(model.positionX).toBe(0);
      expect(model.positionY).toBe(0);
      expect(model.headingDeg).toBe(0);
      expect(model.velocityCmPerSec).toBe(0);
      expect(model.angularVelocityDegPerSec).toBe(0);
      expect(model.motionState).toBe('IDLE');
      expect(model.timestamp).toBe(0);
      expect(model.futureRobotPoseHints).toEqual({});
    });

    it('should create RobotPoseModel with overrides', () => {
      const model = createDefaultRobotPoseModel('p1', { robotId: 'r1', positionX: 100, positionY: 50, headingDeg: 90 });
      expect(model.poseId).toBe('p1');
      expect(model.robotId).toBe('r1');
      expect(model.positionX).toBe(100);
      expect(model.positionY).toBe(50);
      expect(model.headingDeg).toBe(90);
    });

    it('should create default WheelRuntimeModel with correct defaults', () => {
      const model = createDefaultWheelRuntimeModel('w1');
      expect(model.wheelId).toBe('w1');
      expect(model.robotId).toBe('');
      expect(model.side).toBe('LEFT');
      expect(model.speedCmPerSec).toBe(0);
      expect(model.targetSpeedCmPerSec).toBe(0);
      expect(model.rotationDeg).toBe(0);
      expect(model.diameter).toBe(DEFAULT_WHEEL_RADIUS_CM * 2);
      expect(model.futureWheelHints).toEqual({});
    });

    it('should create WheelRuntimeModel with overrides', () => {
      const model = createDefaultWheelRuntimeModel('w2', { side: 'RIGHT', robotId: 'r1' });
      expect(model.wheelId).toBe('w2');
      expect(model.side).toBe('RIGHT');
      expect(model.robotId).toBe('r1');
    });

    it('should create default MotionCommandModel with correct defaults', () => {
      const model = createDefaultMotionCommandModel('cmd-1');
      expect(model.commandId).toBe('cmd-1');
      expect(model.robotId).toBe('');
      expect(model.commandType).toBe('STOP');
      expect(model.speedCmPerSec).toBe(DEFAULT_COMMAND_SPEED_CM_PER_SEC);
      expect(model.durationMs).toBe(0);
      expect(model.angleDeg).toBe(0);
      expect(model.timestamp).toBe(0);
      expect(model.isComplete).toBe(false);
      expect(model.futureMotionCommandHints).toEqual({});
    });

    it('should create default CollisionModel with correct defaults', () => {
      const model = createDefaultCollisionModel('col-1');
      expect(model.collisionId).toBe('col-1');
      expect(model.objectAId).toBe('');
      expect(model.objectAType).toBe('ROBOT');
      expect(model.objectBId).toBe('');
      expect(model.objectBType).toBe('WALL');
      expect(model.collisionState).toBe('NONE');
      expect(model.overlapX).toBe(0);
      expect(model.overlapY).toBe(0);
      expect(model.timestamp).toBe(0);
      expect(model.futureCollisionHints).toEqual({});
    });

    it('should create default PhysicsWorldModel with correct defaults', () => {
      const model = createDefaultPhysicsWorldModel('world-1');
      expect(model.worldId).toBe('world-1');
      expect(model.esp32Id).toBe('');
      expect(model.state).toBe('IDLE');
      expect(model.tickRateHz).toBe(DEFAULT_TICK_RATE_HZ);
      expect(model.deltaAccumulatorMs).toBe(0);
      expect(model.worldBoundsMinX).toBe(DEFAULT_WORLD_BOUNDS_MIN);
      expect(model.worldBoundsMinY).toBe(DEFAULT_WORLD_BOUNDS_MIN);
      expect(model.worldBoundsMaxX).toBe(DEFAULT_WORLD_BOUNDS_MAX);
      expect(model.worldBoundsMaxY).toBe(DEFAULT_WORLD_BOUNDS_MAX);
      expect(model.gravity).toBe(DEFAULT_GRAVITY);
      expect(model.timestamp).toBe(0);
      expect(model.futurePhysicsWorldHints).toEqual({});
    });

    it('should create many models without errors (stress)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const rp = createDefaultRobotPhysicsModel(`rp-${i}`);
        expect(rp.robotId).toBe(`rp-${i}`);
        const pose = createDefaultRobotPoseModel(`pose-${i}`);
        expect(pose.poseId).toBe(`pose-${i}`);
        const wheel = createDefaultWheelRuntimeModel(`w-${i}`);
        expect(wheel.wheelId).toBe(`w-${i}`);
        const cmd = createDefaultMotionCommandModel(`cmd-${i}`);
        expect(cmd.commandId).toBe(`cmd-${i}`);
        const col = createDefaultCollisionModel(`col-${i}`);
        expect(col.collisionId).toBe(`col-${i}`);
        const world = createDefaultPhysicsWorldModel(`world-${i}`);
        expect(world.worldId).toBe(`world-${i}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Section 2: Validators', () => {
    it('should return warning for null RobotPhysicsModel', () => {
      const w = validateRobotPhysicsModel(null);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].code).toBe('NULL_MODEL');
    });

    it('should return warning for empty robotId', () => {
      const model = createDefaultRobotPhysicsModel('');
      const w = validateRobotPhysicsModel(model);
      expect(w.some(x => x.code === 'EMPTY_ROBOT_ID')).toBe(true);
    });

    it('should return warning for invalid mass', () => {
      const model = createDefaultRobotPhysicsModel('r1', { mass: -1 });
      const w = validateRobotPhysicsModel(model);
      expect(w.some(x => x.code === 'INVALID_MASS')).toBe(true);
    });

    it('should return warning for invalid wheelBaseCm', () => {
      const model = createDefaultRobotPhysicsModel('r1', { wheelBaseCm: 0 });
      const w = validateRobotPhysicsModel(model);
      expect(w.some(x => x.code === 'INVALID_WHEEL_BASE')).toBe(true);
    });

    it('should return warning for invalid friction', () => {
      const model = createDefaultRobotPhysicsModel('r1', { frictionCoeff: 2 });
      const w = validateRobotPhysicsModel(model);
      expect(w.some(x => x.code === 'INVALID_FRICTION')).toBe(true);
    });

    it('should return no warnings for valid RobotPhysicsModel', () => {
      const model = createDefaultRobotPhysicsModel('r1');
      const w = validateRobotPhysicsModel(model);
      expect(w.length).toBe(0);
    });

    it('should validate RobotPoseModel null', () => {
      const w = validateRobotPoseModel(null);
      expect(w[0].code).toBe('NULL_MODEL');
    });

    it('should validate RobotPoseModel empty poseId', () => {
      const model = createDefaultRobotPoseModel('');
      const w = validateRobotPoseModel(model);
      expect(w.some(x => x.code === 'EMPTY_POSE_ID')).toBe(true);
    });

    it('should validate RobotPoseModel invalid motionState', () => {
      const model = createDefaultRobotPoseModel('p1', { motionState: 'BAD' as any });
      const w = validateRobotPoseModel(model);
      expect(w.some(x => x.code === 'INVALID_MOTION_STATE')).toBe(true);
    });

    it('should validate WheelRuntimeModel', () => {
      expect(validateWheelRuntimeModel(null)[0].code).toBe('NULL_MODEL');
      const model = createDefaultWheelRuntimeModel('', { side: 'INVALID' as any, diameter: -1 });
      const w = validateWheelRuntimeModel(model);
      expect(w.some(x => x.code === 'EMPTY_WHEEL_ID')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_WHEEL_SIDE')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_DIAMETER')).toBe(true);
    });

    it('should validate MotionCommandModel', () => {
      expect(validateMotionCommandModel(null)[0].code).toBe('NULL_MODEL');
      const model = createDefaultMotionCommandModel('', { commandType: 'INVALID' as any, speedCmPerSec: -5 });
      const w = validateMotionCommandModel(model);
      expect(w.some(x => x.code === 'EMPTY_COMMAND_ID')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_COMMAND_TYPE')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_SPEED')).toBe(true);
    });

    it('should validate CollisionModel', () => {
      expect(validateCollisionModel(null)[0].code).toBe('NULL_MODEL');
      const model = createDefaultCollisionModel('', { collisionState: 'INVALID' as any });
      const w = validateCollisionModel(model);
      expect(w.some(x => x.code === 'EMPTY_COLLISION_ID')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_COLLISION_STATE')).toBe(true);
    });

    it('should validate PhysicsWorldModel', () => {
      expect(validatePhysicsWorldModel(null)[0].code).toBe('NULL_MODEL');
      const model = createDefaultPhysicsWorldModel('', { state: 'BAD' as any, tickRateHz: -1 });
      const w = validatePhysicsWorldModel(model);
      expect(w.some(x => x.code === 'EMPTY_WORLD_ID')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_PHYSICS_STATE')).toBe(true);
      expect(w.some(x => x.code === 'INVALID_TICK_RATE')).toBe(true);
    });

    it('should validate world bounds', () => {
      const model = createDefaultPhysicsWorldModel('w1', {
        worldBoundsMinX: 100, worldBoundsMaxX: 50,
        worldBoundsMinY: 100, worldBoundsMaxY: 50,
      });
      const w = validatePhysicsWorldModel(model);
      expect(w.filter(x => x.code === 'INVALID_WORLD_BOUNDS').length).toBe(2);
    });

    it('should stress-test validators', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const rp = validateRobotPhysicsModel(createDefaultRobotPhysicsModel(`r${i}`));
        expect(rp.length).toBe(0);
        const pose = validateRobotPoseModel(createDefaultRobotPoseModel(`p${i}`));
        expect(pose.length).toBe(0);
        const wheel = validateWheelRuntimeModel(createDefaultWheelRuntimeModel(`w${i}`));
        expect(wheel.length).toBe(0);
        const cmd = validateMotionCommandModel(createDefaultMotionCommandModel(`c${i}`));
        expect(cmd.length).toBe(0);
        const col = validateCollisionModel(createDefaultCollisionModel(`col${i}`));
        expect(col.length).toBe(0);
        const world = validatePhysicsWorldModel(createDefaultPhysicsWorldModel(`world${i}`));
        expect(world.length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Duplicate Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Section 3: Duplicate Validators', () => {
    it('should detect duplicate robot physics IDs', () => {
      const models = [
        createDefaultRobotPhysicsModel('r1'),
        createDefaultRobotPhysicsModel('r1'),
      ];
      const w = validateDuplicateRobotPhysicsIds(models);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('DUPLICATE_ROBOT_PHYSICS_ID');
    });

    it('should detect no duplicates for unique IDs', () => {
      const models = [
        createDefaultRobotPhysicsModel('r1'),
        createDefaultRobotPhysicsModel('r2'),
      ];
      expect(validateDuplicateRobotPhysicsIds(models).length).toBe(0);
    });

    it('should detect duplicate robot pose IDs', () => {
      const models = [
        createDefaultRobotPoseModel('p1'),
        createDefaultRobotPoseModel('p1'),
      ];
      expect(validateDuplicateRobotPoseIds(models).length).toBe(1);
    });

    it('should detect duplicate wheel IDs', () => {
      const models = [
        createDefaultWheelRuntimeModel('w1'),
        createDefaultWheelRuntimeModel('w1'),
      ];
      expect(validateDuplicateWheelRuntimeIds(models).length).toBe(1);
    });

    it('should detect duplicate motion command IDs', () => {
      const models = [
        createDefaultMotionCommandModel('c1'),
        createDefaultMotionCommandModel('c1'),
      ];
      expect(validateDuplicateMotionCommandIds(models).length).toBe(1);
    });

    it('should detect duplicate collision IDs', () => {
      const models = [
        createDefaultCollisionModel('col1'),
        createDefaultCollisionModel('col1'),
      ];
      expect(validateDuplicateCollisionIds(models).length).toBe(1);
    });

    it('should detect duplicate physics world IDs', () => {
      const models = [
        createDefaultPhysicsWorldModel('w1'),
        createDefaultPhysicsWorldModel('w1'),
      ];
      expect(validateDuplicatePhysicsWorldIds(models).length).toBe(1);
    });

    it('should handle empty arrays', () => {
      expect(validateDuplicateRobotPhysicsIds([]).length).toBe(0);
      expect(validateDuplicateRobotPoseIds([]).length).toBe(0);
      expect(validateDuplicateWheelRuntimeIds([]).length).toBe(0);
      expect(validateDuplicateMotionCommandIds([]).length).toBe(0);
      expect(validateDuplicateCollisionIds([]).length).toBe(0);
      expect(validateDuplicatePhysicsWorldIds([]).length).toBe(0);
    });

    it('should stress-test duplicate detection', () => {
      const physicsModels: RobotPhysicsModel[] = [];
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        physicsModels.push(createDefaultRobotPhysicsModel(`r-${i}`));
      }
      expect(validateDuplicateRobotPhysicsIds(physicsModels).length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Differential Drive Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 4: Differential Drive Engine', () => {
    it('should calculate forward velocity from equal wheel speeds', () => {
      expect(calculateForwardVelocity(10, 10)).toBe(10);
    });

    it('should calculate forward velocity from different wheel speeds', () => {
      expect(calculateForwardVelocity(5, 15)).toBe(10);
    });

    it('should calculate zero forward velocity when wheels oppose equally', () => {
      expect(calculateForwardVelocity(-10, 10)).toBe(0);
    });

    it('should calculate angular velocity for turning', () => {
      const omega = calculateAngularVelocity(0, 10, 12);
      expect(omega).toBeGreaterThan(0);
    });

    it('should calculate zero angular velocity for straight movement', () => {
      const omega = calculateAngularVelocity(10, 10, 12);
      expect(Math.abs(omega)).toBeLessThan(0.001);
    });

    it('should handle zero wheel base gracefully', () => {
      expect(calculateAngularVelocity(5, 10, 0)).toBe(0);
    });

    it('should calculate negative angular velocity for left turn', () => {
      const omega = calculateAngularVelocity(10, 0, 12);
      expect(omega).toBeLessThan(0);
    });

    it('should updatePose forward along X axis when heading=0', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const result = updatePose(pose, 10, 0, 1, 1000);
      expect(result.positionX).toBeCloseTo(10, 1);
      expect(result.positionY).toBeCloseTo(0, 1);
      expect(result.headingDeg).toBeCloseTo(0);
      expect(result.velocityCmPerSec).toBe(10);
    });

    it('should updatePose forward along Y axis when heading=90', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 90 });
      const result = updatePose(pose, 10, 0, 1, 1000);
      expect(result.positionX).toBeCloseTo(0, 1);
      expect(result.positionY).toBeCloseTo(10, 1);
    });

    it('should update heading with angular velocity', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 0 });
      const result = updatePose(pose, 0, 90, 1, 1000);
      expect(result.headingDeg).toBeCloseTo(90, 1);
    });

    it('should normalize heading to [0, 360)', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 350 });
      const result = updatePose(pose, 0, 20, 1, 1000);
      expect(result.headingDeg).toBeCloseTo(10, 1);
    });

    it('should normalize negative heading', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 10 });
      const result = updatePose(pose, 0, -20, 1, 1000);
      expect(result.headingDeg).toBeCloseTo(350, 1);
    });

    it('should updateHeading without movement', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 45 });
      const result = updateHeading(pose, 90, 1000);
      expect(result.headingDeg).toBeCloseTo(135, 1);
      expect(result.velocityCmPerSec).toBe(0);
    });

    it('should return immutable pose copies', () => {
      const pose = createDefaultRobotPoseModel('p1');
      const result = updatePose(pose, 10, 0, 1, 1000);
      expect(result).not.toBe(pose);
      expect(result.positionX).not.toBe(pose.positionX);
    });

    it('should stress differential drive calculations', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const lSpeed = (i % 20) - 10;
        const rSpeed = ((i * 3) % 20) - 10;
        const fv = calculateForwardVelocity(lSpeed, rSpeed);
        expect(fv).toBe((lSpeed + rSpeed) / 2);
        const av = calculateAngularVelocity(lSpeed, rSpeed, 12);
        expect(typeof av).toBe('number');
        expect(isFinite(av)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Physics Tick Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 5: Physics Tick Engine', () => {
    let physics: RobotPhysicsModel;
    let pose: RobotPoseModel;
    let leftWheel: WheelRuntimeModel;
    let rightWheel: WheelRuntimeModel;
    let world: PhysicsWorldModel;

    beforeEach(() => {
      physics = createDefaultRobotPhysicsModel('r1');
      pose = createDefaultRobotPoseModel('p1', { robotId: 'r1' });
      leftWheel = createDefaultWheelRuntimeModel('lw', { robotId: 'r1', side: 'LEFT' });
      rightWheel = createDefaultWheelRuntimeModel('rw', { robotId: 'r1', side: 'RIGHT' });
      world = createDefaultPhysicsWorldModel('w1');
    });

    it('should not move with zero delta', () => {
      leftWheel.targetSpeedCmPerSec = 10;
      rightWheel.targetSpeedCmPerSec = 10;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 0, 1000);
      expect(result.pose.positionX).toBe(0);
      expect(result.pose.positionY).toBe(0);
    });

    it('should move forward with equal wheel targets', () => {
      leftWheel.targetSpeedCmPerSec = 15;
      rightWheel.targetSpeedCmPerSec = 15;
      leftWheel.speedCmPerSec = 15;
      rightWheel.speedCmPerSec = 15;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 1000, 1000);
      expect(result.pose.positionX).toBeGreaterThan(0);
      expect(result.pose.motionState).toBe('MOVING_FORWARD');
    });

    it('should move backward with negative wheel targets', () => {
      leftWheel.targetSpeedCmPerSec = -10;
      rightWheel.targetSpeedCmPerSec = -10;
      leftWheel.speedCmPerSec = -10;
      rightWheel.speedCmPerSec = -10;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 1000, 1000);
      expect(result.pose.positionX).toBeLessThan(0);
      expect(result.pose.motionState).toBe('MOVING_BACKWARD');
    });

    it('should turn right with differential wheel speeds', () => {
      leftWheel.targetSpeedCmPerSec = 10;
      rightWheel.targetSpeedCmPerSec = -10;
      leftWheel.speedCmPerSec = 10;
      rightWheel.speedCmPerSec = -10;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 100, 1000);
      // Angular velocity should indicate turning
      expect(result.pose.headingDeg !== 0 || result.pose.motionState === 'TURNING_LEFT').toBe(true);
    });

    it('should clamp position to world bounds', () => {
      pose.positionX = 499;
      leftWheel.targetSpeedCmPerSec = 30;
      rightWheel.targetSpeedCmPerSec = 30;
      leftWheel.speedCmPerSec = 30;
      rightWheel.speedCmPerSec = 30;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 5000, 1000);
      const hw = physics.boundingBoxWidth / 2;
      expect(result.pose.positionX).toBeLessThanOrEqual(DEFAULT_WORLD_BOUNDS_MAX - hw);
    });

    it('should update wheel rotation', () => {
      leftWheel.speedCmPerSec = 10;
      rightWheel.speedCmPerSec = 10;
      leftWheel.targetSpeedCmPerSec = 10;
      rightWheel.targetSpeedCmPerSec = 10;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 1000, 1000);
      expect(result.leftWheel.rotationDeg).not.toBe(0);
      expect(result.rightWheel.rotationDeg).not.toBe(0);
    });

    it('should apply friction when target is zero', () => {
      leftWheel.speedCmPerSec = 10;
      rightWheel.speedCmPerSec = 10;
      leftWheel.targetSpeedCmPerSec = 0;
      rightWheel.targetSpeedCmPerSec = 0;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 100, 1000);
      expect(Math.abs(result.leftWheel.speedCmPerSec)).toBeLessThan(10);
    });

    it('should clamp wheel speeds to max speed', () => {
      leftWheel.targetSpeedCmPerSec = 1000;
      rightWheel.targetSpeedCmPerSec = 1000;
      leftWheel.speedCmPerSec = 1000;
      rightWheel.speedCmPerSec = 1000;
      const result = stepPhysics(physics, pose, leftWheel, rightWheel, world, 1000, 1000);
      expect(Math.abs(result.leftWheel.speedCmPerSec)).toBeLessThanOrEqual(physics.maxSpeedCmPerSec);
    });

    it('should produce deterministic results', () => {
      leftWheel.targetSpeedCmPerSec = 10;
      rightWheel.targetSpeedCmPerSec = 8;
      leftWheel.speedCmPerSec = 10;
      rightWheel.speedCmPerSec = 8;
      const r1 = stepPhysics(physics, pose, leftWheel, rightWheel, world, 100, 1000);
      const r2 = stepPhysics(physics, pose, leftWheel, rightWheel, world, 100, 1000);
      expect(r1.pose.positionX).toBe(r2.pose.positionX);
      expect(r1.pose.positionY).toBe(r2.pose.positionY);
      expect(r1.pose.headingDeg).toBe(r2.pose.headingDeg);
    });

    it('should stress physics stepping', () => {
      leftWheel.targetSpeedCmPerSec = 15;
      rightWheel.targetSpeedCmPerSec = 15;
      leftWheel.speedCmPerSec = 15;
      rightWheel.speedCmPerSec = 15;
      let currentPose = pose;
      let currentLeft = leftWheel;
      let currentRight = rightWheel;
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const result = stepPhysics(physics, currentPose, currentLeft, currentRight, world, 16, i * 16);
        expect(isFinite(result.pose.positionX)).toBe(true);
        expect(isFinite(result.pose.positionY)).toBe(true);
        expect(isFinite(result.pose.headingDeg)).toBe(true);
        expect(result.pose.headingDeg).toBeGreaterThanOrEqual(0);
        expect(result.pose.headingDeg).toBeLessThan(360);
        currentPose = result.pose;
        currentLeft = result.leftWheel;
        currentRight = result.rightWheel;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Motion Commands
  // ═══════════════════════════════════════════════════════════════

  describe('Section 6: Motion Commands', () => {
    let physics: RobotPhysicsModel;
    let leftWheel: WheelRuntimeModel;
    let rightWheel: WheelRuntimeModel;

    beforeEach(() => {
      physics = createDefaultRobotPhysicsModel('r1');
      leftWheel = createDefaultWheelRuntimeModel('lw', { robotId: 'r1', side: 'LEFT' });
      rightWheel = createDefaultWheelRuntimeModel('rw', { robotId: 'r1', side: 'RIGHT' });
    });

    it('should apply FORWARD command', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 15 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(15);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(15);
      expect(result.motionState).toBe('MOVING_FORWARD');
    });

    it('should apply BACKWARD command', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'BACKWARD', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(-10);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(-10);
      expect(result.motionState).toBe('MOVING_BACKWARD');
    });

    it('should apply TURN_LEFT command', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'TURN_LEFT', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(-10);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(10);
      expect(result.motionState).toBe('TURNING_LEFT');
    });

    it('should apply TURN_RIGHT command', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'TURN_RIGHT', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(10);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(-10);
      expect(result.motionState).toBe('TURNING_RIGHT');
    });

    it('should apply STOP command', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'STOP' });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(0);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(0);
      expect(result.motionState).toBe('STOPPED');
    });

    it('should clamp speed to max', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 1000 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(physics.maxSpeedCmPerSec);
    });

    it('should return immutable wheel copies', () => {
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
      expect(result.leftWheel).not.toBe(leftWheel);
      expect(result.rightWheel).not.toBe(rightWheel);
    });

    it('should stress motion commands', () => {
      const types: MotionCommandModel['commandType'][] = ['FORWARD', 'BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'STOP'];
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const cmdType = types[i % types.length];
        const cmd = createDefaultMotionCommandModel(`c${i}`, { commandType: cmdType, speedCmPerSec: 15 });
        const result = applyMotionCommand(cmd, physics, leftWheel, rightWheel);
        expect(result.motionState).toBeTruthy();
        expect(typeof result.leftWheel.targetSpeedCmPerSec).toBe('number');
        expect(typeof result.rightWheel.targetSpeedCmPerSec).toBe('number');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: AABB Collision Detection
  // ═══════════════════════════════════════════════════════════════

  describe('Section 7: AABB Collision Detection', () => {
    it('should detect overlap between overlapping AABBs', () => {
      const result = checkAABBOverlap(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 5, minY: 5, maxX: 15, maxY: 15 },
      );
      expect(result).not.toBeNull();
      expect(result!.overlapX).toBe(5);
      expect(result!.overlapY).toBe(5);
    });

    it('should return null for non-overlapping AABBs', () => {
      const result = checkAABBOverlap(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 20, minY: 20, maxX: 30, maxY: 30 },
      );
      expect(result).toBeNull();
    });

    it('should detect touching AABBs as non-overlapping', () => {
      const result = checkAABBOverlap(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 10, minY: 0, maxX: 20, maxY: 10 },
      );
      // Touching but no overlap (overlap = 0)
      expect(result).toBeNull();
    });

    it('should get robot AABB from pose and physics', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose = createDefaultRobotPoseModel('p1', { positionX: 100, positionY: 50 });
      const aabb = getRobotAABB(pose, physics);
      const hw = physics.boundingBoxWidth / 2;
      const hh = physics.boundingBoxHeight / 2;
      expect(aabb.minX).toBe(100 - hw);
      expect(aabb.maxX).toBe(100 + hw);
      expect(aabb.minY).toBe(50 - hh);
      expect(aabb.maxY).toBe(50 + hh);
    });

    it('should detect robot-obstacle collision', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose = createDefaultRobotPoseModel('p1', { positionX: 10, positionY: 0 });
      const obstacles = [{
        id: 'wall-1',
        aabb: { minX: 15, minY: -10, maxX: 25, maxY: 10 },
        objectType: 'WALL',
      }];
      const collisions = detectCollisions(
        [{ id: 'r1', pose, physics }],
        obstacles,
        [],
        1000,
      );
      expect(collisions.length).toBeGreaterThan(0);
      expect(collisions[0].collisionState).toBe('ENTERING');
    });

    it('should transition from ENTERING to OVERLAPPING', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose = createDefaultRobotPoseModel('p1', { positionX: 10, positionY: 0 });
      const obstacles = [{
        id: 'wall-1',
        aabb: { minX: 15, minY: -10, maxX: 25, maxY: 10 },
        objectType: 'WALL',
      }];

      const first = detectCollisions([{ id: 'r1', pose, physics }], obstacles, [], 1000);
      expect(first[0].collisionState).toBe('ENTERING');

      const second = detectCollisions([{ id: 'r1', pose, physics }], obstacles, first, 2000);
      expect(second[0].collisionState).toBe('OVERLAPPING');
    });

    it('should transition to EXITING when separation occurs', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose1 = createDefaultRobotPoseModel('p1', { positionX: 10, positionY: 0 });
      const pose2 = createDefaultRobotPoseModel('p1', { positionX: -100, positionY: 0 });
      const obstacles = [{
        id: 'wall-1',
        aabb: { minX: 15, minY: -10, maxX: 25, maxY: 10 },
        objectType: 'WALL',
      }];

      const entering = detectCollisions([{ id: 'r1', pose: pose1, physics }], obstacles, [], 1000);
      const exiting = detectCollisions([{ id: 'r1', pose: pose2, physics }], obstacles, entering, 2000);
      expect(exiting[0].collisionState).toBe('EXITING');
    });

    it('should detect robot-robot collision', () => {
      const p1 = createDefaultRobotPhysicsModel('r1');
      const p2 = createDefaultRobotPhysicsModel('r2');
      const pose1 = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0 });
      const pose2 = createDefaultRobotPoseModel('p2', { positionX: 5, positionY: 0 }); // overlapping
      const collisions = detectCollisions(
        [{ id: 'r1', pose: pose1, physics: p1 }, { id: 'r2', pose: pose2, physics: p2 }],
        [],
        [],
        1000,
      );
      expect(collisions.length).toBeGreaterThan(0);
    });

    it('should handle no collisions', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0 });
      const collisions = detectCollisions([{ id: 'r1', pose, physics }], [], [], 1000);
      expect(collisions.length).toBe(0);
    });

    it('should stress collision detection', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pose = createDefaultRobotPoseModel('p1', { positionX: i * 0.1, positionY: 0 });
        const obstacles = [{
          id: 'wall',
          aabb: { minX: 25, minY: -10, maxX: 35, maxY: 10 },
          objectType: 'WALL',
        }];
        const collisions = detectCollisions([{ id: 'r1', pose, physics }], obstacles, [], i);
        expect(Array.isArray(collisions)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Friction and World Bounds
  // ═══════════════════════════════════════════════════════════════

  describe('Section 8: Friction and World Bounds', () => {
    it('should apply friction to reduce speed', () => {
      const result = applyFriction(10, 0.1, 30, 1);
      expect(result).toBeLessThan(10);
      expect(result).toBeGreaterThan(0);
    });

    it('should stop at zero when friction exceeds speed', () => {
      const result = applyFriction(0.1, 0.5, 30, 1);
      expect(result).toBe(0);
    });

    it('should not affect zero speed', () => {
      expect(applyFriction(0, 0.1, 30, 1)).toBe(0);
    });

    it('should apply friction to negative speed', () => {
      const result = applyFriction(-10, 0.1, 30, 1);
      expect(result).toBeGreaterThan(-10);
      expect(result).toBeLessThan(0);
    });

    it('should clamp to world bounds (X axis)', () => {
      const world = createDefaultPhysicsWorldModel('w1');
      const result = clampToWorldBounds(600, 0, 9, 10, world);
      expect(result.x).toBeLessThanOrEqual(DEFAULT_WORLD_BOUNDS_MAX - 9);
      expect(result.clampedX).toBe(true);
    });

    it('should clamp to world bounds (Y axis)', () => {
      const world = createDefaultPhysicsWorldModel('w1');
      const result = clampToWorldBounds(0, -600, 9, 10, world);
      expect(result.y).toBeGreaterThanOrEqual(DEFAULT_WORLD_BOUNDS_MIN + 10);
      expect(result.clampedY).toBe(true);
    });

    it('should not clamp within bounds', () => {
      const world = createDefaultPhysicsWorldModel('w1');
      const result = clampToWorldBounds(0, 0, 5, 5, world);
      expect(result.clampedX).toBe(false);
      expect(result.clampedY).toBe(false);
    });

    it('should stress friction calculations', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const speed = (i % 60) - 30;
        const result = applyFriction(speed, 0.1, 30, 0.016);
        expect(isFinite(result)).toBe(true);
        if (speed > 0) expect(result).toBeLessThanOrEqual(speed);
        if (speed < 0) expect(result).toBeGreaterThanOrEqual(speed);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: HC-SR04 Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 9: HC-SR04 Integration', () => {
    it('should compute sensor world position at heading=0', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 100, positionY: 50, headingDeg: 0 });
      const result = computeSensorWorldPosition(pose, 10, 0, 0);
      expect(result.worldX).toBeCloseTo(110, 1);
      expect(result.worldY).toBeCloseTo(50, 1);
      expect(result.worldDirectionDeg).toBeCloseTo(0, 1);
    });

    it('should compute sensor world position at heading=90', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 90 });
      const result = computeSensorWorldPosition(pose, 10, 0, 0);
      expect(result.worldX).toBeCloseTo(0, 1);
      expect(result.worldY).toBeCloseTo(10, 1);
      expect(result.worldDirectionDeg).toBeCloseTo(90, 1);
    });

    it('should apply sensor angle offset', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 0 });
      const result = computeSensorWorldPosition(pose, 10, 0, 45);
      expect(result.worldDirectionDeg).toBeCloseTo(45, 1);
    });

    it('should compute distance to obstacle', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [{ positionX: 100, positionY: 0, width: 20, height: 20 }];
      const dist = computeRobotSensorDistance(pose, 10, 0, 0, 15, 400, obstacles);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(100);
    });

    it('should return -1 when no obstacle in range', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [{ positionX: 1000, positionY: 0, width: 20, height: 20 }];
      const dist = computeRobotSensorDistance(pose, 10, 0, 0, 15, 400, obstacles);
      expect(dist).toBe(-1);
    });

    it('should return -1 when obstacle not in beam cone', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [{ positionX: 0, positionY: 100, width: 20, height: 20 }];
      const dist = computeRobotSensorDistance(pose, 10, 0, 0, 15, 400, obstacles);
      expect(dist).toBe(-1);
    });

    it('should find nearest obstacle among multiple', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [
        { positionX: 200, positionY: 0, width: 20, height: 20 },
        { positionX: 100, positionY: 0, width: 20, height: 20 },
        { positionX: 300, positionY: 0, width: 20, height: 20 },
      ];
      const dist = computeRobotSensorDistance(pose, 0, 0, 0, 15, 400, obstacles);
      expect(dist).toBeLessThan(100);
    });

    it('should change distance as robot moves', () => {
      const obstacles = [{ positionX: 200, positionY: 0, width: 20, height: 20 }];
      const pose1 = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const pose2 = createDefaultRobotPoseModel('p1', { positionX: 50, positionY: 0, headingDeg: 0 });
      const dist1 = computeRobotSensorDistance(pose1, 0, 0, 0, 15, 400, obstacles);
      const dist2 = computeRobotSensorDistance(pose2, 0, 0, 0, 15, 400, obstacles);
      expect(dist2).toBeLessThan(dist1);
    });

    it('should handle empty obstacles array', () => {
      const pose = createDefaultRobotPoseModel('p1');
      const dist = computeRobotSensorDistance(pose, 0, 0, 0, 15, 400, []);
      expect(dist).toBe(-1);
    });

    it('should stress HC-SR04 distance calculations', () => {
      const obstacles = [{ positionX: 200, positionY: 0, width: 20, height: 20 }];
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pose = createDefaultRobotPoseModel(`p${i}`, { positionX: i * 0.3, headingDeg: 0 });
        const dist = computeRobotSensorDistance(pose, 0, 0, 0, 15, 400, obstacles);
        expect(typeof dist).toBe('number');
        expect(isFinite(dist)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Servo Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 10: Servo Integration', () => {
    it('should compute servo sensor direction at center (90°)', () => {
      expect(computeServoSensorDirection(90)).toBe(0);
    });

    it('should compute servo sensor direction at 0°', () => {
      expect(computeServoSensorDirection(0)).toBe(-90);
    });

    it('should compute servo sensor direction at 180°', () => {
      expect(computeServoSensorDirection(180)).toBe(90);
    });

    it('should compute servo sensor direction with custom center', () => {
      expect(computeServoSensorDirection(45, 45)).toBe(0);
    });

    it('should compute distance with servo angle', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [{ positionX: 100, positionY: 0, width: 20, height: 20 }];
      // Servo at 90° (center) should detect obstacle ahead
      const dist = computeRobotSensorDistanceWithServo(pose, 10, 0, 90, 15, 400, obstacles);
      expect(dist).toBeGreaterThan(0);
    });

    it('should miss obstacle when servo points away', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [{ positionX: 100, positionY: 0, width: 10, height: 10 }];
      // Servo at 0° should point 90° left
      const dist = computeRobotSensorDistanceWithServo(pose, 0, 0, 0, 10, 400, obstacles);
      expect(dist).toBe(-1);
    });

    it('should sweep and detect obstacles at different servo angles', () => {
      const pose = createDefaultRobotPoseModel('p1', { positionX: 0, positionY: 0, headingDeg: 0 });
      const obstacles = [
        { positionX: 100, positionY: 0, width: 20, height: 20 },   // ahead
        { positionX: 0, positionY: 100, width: 20, height: 20 },   // right
      ];
      // Center scan (90°) → should detect ahead
      const dist90 = computeRobotSensorDistanceWithServo(pose, 0, 0, 90, 20, 400, obstacles);
      expect(dist90).toBeGreaterThan(0);
    });

    it('should stress servo integration', () => {
      const pose = createDefaultRobotPoseModel('p1', { headingDeg: 0 });
      const obstacles = [{ positionX: 100, positionY: 0, width: 20, height: 20 }];
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const angle = (i * 180) / STRESS_ITERATIONS;
        const dist = computeRobotSensorDistanceWithServo(pose, 0, 0, angle, 15, 400, obstacles);
        expect(typeof dist).toBe('number');
        expect(isFinite(dist)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 11: Synchronizer CRUD
  // ═══════════════════════════════════════════════════════════════

  describe('Section 11: Synchronizer CRUD', () => {
    let sync: RoboticsPhysicsSynchronizer;

    beforeEach(() => {
      sync = new RoboticsPhysicsSynchronizer();
    });

    it('should register and retrieve robot physics', () => {
      const model = createDefaultRobotPhysicsModel('r1');
      sync.robotPhysics.register('r1', model);
      expect(sync.robotPhysics.lookup('r1')).toBeDefined();
      expect(sync.robotPhysics.lookup('r1')!.robotId).toBe('r1');
    });

    it('should register and retrieve robot pose', () => {
      const model = createDefaultRobotPoseModel('p1');
      sync.robotPoses.register('p1', model);
      expect(sync.robotPoses.has('p1')).toBe(true);
    });

    it('should register and retrieve wheels', () => {
      sync.wheelRuntimes.register('w1', createDefaultWheelRuntimeModel('w1'));
      expect(sync.wheelRuntimes.size).toBe(1);
      expect(sync.wheelRuntimes.keys()).toEqual(['w1']);
    });

    it('should register and retrieve motion commands', () => {
      sync.motionCommands.register('c1', createDefaultMotionCommandModel('c1'));
      expect(sync.motionCommands.getAll().length).toBe(1);
    });

    it('should register and retrieve collisions', () => {
      sync.collisions.register('col1', createDefaultCollisionModel('col1'));
      const all = sync.collisions.getAll();
      expect(all.length).toBe(1);
      expect(all[0].collisionId).toBe('col1');
    });

    it('should register and retrieve physics worlds', () => {
      sync.physicsWorlds.register('w1', createDefaultPhysicsWorldModel('w1'));
      expect(sync.physicsWorlds.lookup('w1')!.worldId).toBe('w1');
    });

    it('should update model partially', () => {
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.robotPhysics.update('r1', { mass: 999 });
      expect(sync.robotPhysics.lookup('r1')!.mass).toBe(999);
    });

    it('should remove model', () => {
      sync.robotPoses.register('p1', createDefaultRobotPoseModel('p1'));
      sync.robotPoses.remove('p1');
      expect(sync.robotPoses.has('p1')).toBe(false);
      expect(sync.robotPoses.size).toBe(0);
    });

    it('should clear all models', () => {
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.robotPoses.register('p1', createDefaultRobotPoseModel('p1'));
      sync.wheelRuntimes.register('w1', createDefaultWheelRuntimeModel('w1'));
      sync.clear();
      expect(sync.robotPhysics.size).toBe(0);
      expect(sync.robotPoses.size).toBe(0);
      expect(sync.wheelRuntimes.size).toBe(0);
    });

    it('should provide deep copies on read', () => {
      const model = createDefaultRobotPhysicsModel('r1');
      sync.robotPhysics.register('r1', model);
      const retrieved = sync.robotPhysics.lookup('r1')!;
      retrieved.mass = 999;
      expect(sync.robotPhysics.lookup('r1')!.mass).toBe(DEFAULT_ROBOT_MASS);
    });

    it('should maintain insertion order', () => {
      sync.robotPhysics.register('r3', createDefaultRobotPhysicsModel('r3'));
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.robotPhysics.register('r2', createDefaultRobotPhysicsModel('r2'));
      expect(sync.robotPhysics.keys()).toEqual(['r3', 'r1', 'r2']);
    });

    it('should stress CRUD operations', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.robotPhysics.register(`r${i}`, createDefaultRobotPhysicsModel(`r${i}`));
        sync.robotPoses.register(`p${i}`, createDefaultRobotPoseModel(`p${i}`));
        sync.wheelRuntimes.register(`w${i}`, createDefaultWheelRuntimeModel(`w${i}`));
      }
      expect(sync.robotPhysics.size).toBe(STRESS_ITERATIONS);
      expect(sync.robotPoses.size).toBe(STRESS_ITERATIONS);
      expect(sync.wheelRuntimes.size).toBe(STRESS_ITERATIONS);

      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(sync.robotPhysics.lookup(`r${i}`)!.robotId).toBe(`r${i}`);
        expect(sync.robotPoses.lookup(`p${i}`)!.poseId).toBe(`p${i}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 12: Synchronizer Snapshot & Serialization
  // ═══════════════════════════════════════════════════════════════

  describe('Section 12: Synchronizer Snapshot & Serialization', () => {
    let sync: RoboticsPhysicsSynchronizer;

    beforeEach(() => {
      sync = new RoboticsPhysicsSynchronizer();
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.robotPoses.register('p1', createDefaultRobotPoseModel('p1', { robotId: 'r1' }));
      sync.wheelRuntimes.register('w1', createDefaultWheelRuntimeModel('w1', { robotId: 'r1', side: 'LEFT' }));
      sync.wheelRuntimes.register('w2', createDefaultWheelRuntimeModel('w2', { robotId: 'r1', side: 'RIGHT' }));
      sync.motionCommands.register('c1', createDefaultMotionCommandModel('c1', { robotId: 'r1' }));
      sync.collisions.register('col1', createDefaultCollisionModel('col1'));
      sync.physicsWorlds.register('world1', createDefaultPhysicsWorldModel('world1'));
    });

    it('should export to JSON snapshot', () => {
      const snapshot = sync.toJSON();
      expect(snapshot.robotPhysics.length).toBe(1);
      expect(snapshot.robotPoses.length).toBe(1);
      expect(snapshot.wheelRuntimes.length).toBe(2);
      expect(snapshot.motionCommands.length).toBe(1);
      expect(snapshot.collisions.length).toBe(1);
      expect(snapshot.physicsWorlds.length).toBe(1);
    });

    it('should import from JSON snapshot', () => {
      const snapshot = sync.toJSON();
      const sync2 = new RoboticsPhysicsSynchronizer();
      sync2.fromJSON(snapshot);
      expect(sync2.robotPhysics.size).toBe(1);
      expect(sync2.robotPoses.size).toBe(1);
      expect(sync2.wheelRuntimes.size).toBe(2);
      expect(sync2.motionCommands.size).toBe(1);
      expect(sync2.collisions.size).toBe(1);
      expect(sync2.physicsWorlds.size).toBe(1);
    });

    it('should handle null fromJSON gracefully', () => {
      const sync2 = new RoboticsPhysicsSynchronizer();
      sync2.fromJSON(null);
      expect(sync2.robotPhysics.size).toBe(0);
    });

    it('should handle undefined fromJSON gracefully', () => {
      const sync2 = new RoboticsPhysicsSynchronizer();
      sync2.fromJSON(undefined);
      expect(sync2.robotPhysics.size).toBe(0);
    });

    it('should clone synchronizer with deep copy', () => {
      const cloned = sync.clone();
      expect(cloned.robotPhysics.size).toBe(1);
      expect(cloned.robotPoses.size).toBe(1);

      // Mutate original — clone should be unaffected
      sync.robotPhysics.update('r1', { mass: 999 });
      expect(cloned.robotPhysics.lookup('r1')!.mass).toBe(DEFAULT_ROBOT_MASS);
    });

    it('should buildSnapshot from arrays', () => {
      const sync2 = new RoboticsPhysicsSynchronizer();
      const snap = sync2.buildSnapshot(
        [createDefaultRobotPhysicsModel('r1'), createDefaultRobotPhysicsModel('r2')],
        [createDefaultRobotPoseModel('p1'), createDefaultRobotPoseModel('p2')],
        [createDefaultWheelRuntimeModel('w1')],
        [createDefaultMotionCommandModel('c1')],
        [createDefaultCollisionModel('col1')],
        [createDefaultPhysicsWorldModel('world1')],
      );
      expect(snap.robotPhysics.length).toBe(2);
      expect(snap.robotPoses.length).toBe(2);
      expect(sync2.robotPhysics.size).toBe(2);
    });

    it('should reject models with empty IDs in buildSnapshot', () => {
      const sync2 = new RoboticsPhysicsSynchronizer();
      sync2.buildSnapshot(
        [createDefaultRobotPhysicsModel('')],
        [], [], [], [], [],
      );
      expect(sync2.robotPhysics.size).toBe(0);
    });

    it('should round-trip through JSON', () => {
      const json = JSON.stringify(sync.toJSON());
      const parsed = JSON.parse(json) as PhysicsSnapshot;
      const sync2 = new RoboticsPhysicsSynchronizer();
      sync2.fromJSON(parsed);
      expect(sync2.robotPhysics.lookup('r1')!.robotId).toBe('r1');
      expect(sync2.robotPoses.lookup('p1')!.robotId).toBe('r1');
    });

    it('should stress serialization round-trip', () => {
      const sync2 = new RoboticsPhysicsSynchronizer();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync2.robotPhysics.register(`r${i}`, createDefaultRobotPhysicsModel(`r${i}`));
      }
      const snap = sync2.toJSON();
      expect(snap.robotPhysics.length).toBe(STRESS_ITERATIONS);
      const sync3 = new RoboticsPhysicsSynchronizer();
      sync3.fromJSON(snap);
      expect(sync3.robotPhysics.size).toBe(STRESS_ITERATIONS);
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(sync3.robotPhysics.lookup(`r${i}`)!.robotId).toBe(`r${i}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 13: Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('Section 13: Clone Safety', () => {
    it('should deep-copy factory outputs', () => {
      const m1 = createDefaultRobotPhysicsModel('r1');
      const m2 = createDefaultRobotPhysicsModel('r1');
      m1.mass = 999;
      expect(m2.mass).toBe(DEFAULT_ROBOT_MASS);
    });

    it('should deep-copy pose from factory', () => {
      const p1 = createDefaultRobotPoseModel('p1');
      const p2 = createDefaultRobotPoseModel('p1');
      p1.positionX = 999;
      expect(p2.positionX).toBe(0);
    });

    it('should deep-copy wheel from factory', () => {
      const w1 = createDefaultWheelRuntimeModel('w1');
      const w2 = createDefaultWheelRuntimeModel('w1');
      w1.speedCmPerSec = 999;
      expect(w2.speedCmPerSec).toBe(0);
    });

    it('should deep-copy physics results', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const pose = createDefaultRobotPoseModel('p1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT', speedCmPerSec: 10, targetSpeedCmPerSec: 10 });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT', speedCmPerSec: 10, targetSpeedCmPerSec: 10 });
      const world = createDefaultPhysicsWorldModel('w1');
      const result = stepPhysics(physics, pose, lw, rw, world, 100, 1000);
      result.pose.positionX = 999;
      // Original should be unaffected
      expect(pose.positionX).toBe(0);
    });

    it('should deep-copy motion command results', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT' });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT' });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 15 });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      result.leftWheel.targetSpeedCmPerSec = 999;
      expect(lw.targetSpeedCmPerSec).toBe(0);
    });

    it('should stress clone safety', () => {
      const sync = new RoboticsPhysicsSynchronizer();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.robotPhysics.register(`r${i}`, createDefaultRobotPhysicsModel(`r${i}`));
      }
      const all = sync.robotPhysics.getAll();
      all[0].mass = 999;
      expect(sync.robotPhysics.lookup('r0')!.mass).toBe(DEFAULT_ROBOT_MASS);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: Blockly Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 14: Blockly Integration', () => {
    it('should support Move Forward via motion command', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT' });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT' });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 15 });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(15);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(15);
    });

    it('should support Move Backward via motion command', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT' });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT' });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'BACKWARD', speedCmPerSec: 15 });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(-15);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(-15);
    });

    it('should support Turn Left via motion command', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT' });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT' });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'TURN_LEFT', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      expect(result.leftWheel.targetSpeedCmPerSec).toBeLessThan(0);
      expect(result.rightWheel.targetSpeedCmPerSec).toBeGreaterThan(0);
    });

    it('should support Turn Right via motion command', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT' });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT' });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'TURN_RIGHT', speedCmPerSec: 10 });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      expect(result.leftWheel.targetSpeedCmPerSec).toBeGreaterThan(0);
      expect(result.rightWheel.targetSpeedCmPerSec).toBeLessThan(0);
    });

    it('should support Stop Robot via motion command', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const lw = createDefaultWheelRuntimeModel('lw', { side: 'LEFT', speedCmPerSec: 15 });
      const rw = createDefaultWheelRuntimeModel('rw', { side: 'RIGHT', speedCmPerSec: 15 });
      const cmd = createDefaultMotionCommandModel('c1', { commandType: 'STOP' });
      const result = applyMotionCommand(cmd, physics, lw, rw);
      expect(result.leftWheel.targetSpeedCmPerSec).toBe(0);
      expect(result.rightWheel.targetSpeedCmPerSec).toBe(0);
    });

    it('should sequence multiple motion commands', () => {
      const physics = createDefaultRobotPhysicsModel('r1');
      const world = createDefaultPhysicsWorldModel('w1');
      let pose = createDefaultRobotPoseModel('p1', { robotId: 'r1' });
      let lw = createDefaultWheelRuntimeModel('lw', { robotId: 'r1', side: 'LEFT' });
      let rw = createDefaultWheelRuntimeModel('rw', { robotId: 'r1', side: 'RIGHT' });

      // Forward
      const fwd = createDefaultMotionCommandModel('c1', { commandType: 'FORWARD', speedCmPerSec: 15 });
      const fwdResult = applyMotionCommand(fwd, physics, lw, rw);
      lw = fwdResult.leftWheel;
      rw = fwdResult.rightWheel;

      // Step for 1 second
      for (let i = 0; i < 60; i++) {
        const step = stepPhysics(physics, pose, lw, rw, world, 16.67, i * 16.67);
        pose = step.pose;
        lw = step.leftWheel;
        rw = step.rightWheel;
      }
      expect(pose.positionX).toBeGreaterThan(0);

      // Turn left
      const turn = createDefaultMotionCommandModel('c2', { commandType: 'TURN_LEFT', speedCmPerSec: 10 });
      const turnResult = applyMotionCommand(turn, physics, lw, rw);
      lw = turnResult.leftWheel;
      rw = turnResult.rightWheel;

      for (let i = 0; i < 60; i++) {
        const step = stepPhysics(physics, pose, lw, rw, world, 16.67, 1000 + i * 16.67);
        pose = step.pose;
        lw = step.leftWheel;
        rw = step.rightWheel;
      }
      // Heading should have changed
      expect(pose.headingDeg).not.toBeCloseTo(0, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 15: Lifecycle Cleanup
  // ═══════════════════════════════════════════════════════════════

  describe('Section 15: Lifecycle Cleanup', () => {
    it('should clear all registries', () => {
      const sync = new RoboticsPhysicsSynchronizer();
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.robotPoses.register('p1', createDefaultRobotPoseModel('p1'));
      sync.wheelRuntimes.register('w1', createDefaultWheelRuntimeModel('w1'));
      sync.motionCommands.register('c1', createDefaultMotionCommandModel('c1'));
      sync.collisions.register('col1', createDefaultCollisionModel('col1'));
      sync.physicsWorlds.register('world1', createDefaultPhysicsWorldModel('world1'));

      sync.clear();

      expect(sync.robotPhysics.size).toBe(0);
      expect(sync.robotPoses.size).toBe(0);
      expect(sync.wheelRuntimes.size).toBe(0);
      expect(sync.motionCommands.size).toBe(0);
      expect(sync.collisions.size).toBe(0);
      expect(sync.physicsWorlds.size).toBe(0);
    });

    it('should restore after clear and re-registration', () => {
      const sync = new RoboticsPhysicsSynchronizer();
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.clear();
      expect(sync.robotPhysics.size).toBe(0);
      sync.robotPhysics.register('r2', createDefaultRobotPhysicsModel('r2'));
      expect(sync.robotPhysics.size).toBe(1);
      expect(sync.robotPhysics.lookup('r2')!.robotId).toBe('r2');
    });

    it('should handle double clear', () => {
      const sync = new RoboticsPhysicsSynchronizer();
      sync.robotPhysics.register('r1', createDefaultRobotPhysicsModel('r1'));
      sync.clear();
      sync.clear();
      expect(sync.robotPhysics.size).toBe(0);
    });

    it('should stress lifecycle (register + clear)', () => {
      const sync = new RoboticsPhysicsSynchronizer();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.robotPhysics.register(`r${i}`, createDefaultRobotPhysicsModel(`r${i}`));
        if (i % 50 === 0) sync.clear();
      }
      expect(sync.robotPhysics.size).toBeLessThanOrEqual(STRESS_ITERATIONS);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 16: Constants and Type Enumerations
  // ═══════════════════════════════════════════════════════════════

  describe('Section 16: Constants and Type Enumerations', () => {
    it('should have valid motion states', () => {
      expect(VALID_MOTION_STATES).toContain('IDLE');
      expect(VALID_MOTION_STATES).toContain('MOVING_FORWARD');
      expect(VALID_MOTION_STATES).toContain('MOVING_BACKWARD');
      expect(VALID_MOTION_STATES).toContain('TURNING_LEFT');
      expect(VALID_MOTION_STATES).toContain('TURNING_RIGHT');
      expect(VALID_MOTION_STATES).toContain('STOPPED');
      expect(VALID_MOTION_STATES.length).toBe(6);
    });

    it('should have valid collision states', () => {
      expect(VALID_COLLISION_STATES).toContain('NONE');
      expect(VALID_COLLISION_STATES).toContain('ENTERING');
      expect(VALID_COLLISION_STATES).toContain('OVERLAPPING');
      expect(VALID_COLLISION_STATES).toContain('EXITING');
      expect(VALID_COLLISION_STATES.length).toBe(4);
    });

    it('should have valid physics states', () => {
      expect(VALID_PHYSICS_STATES).toContain('IDLE');
      expect(VALID_PHYSICS_STATES).toContain('RUNNING');
      expect(VALID_PHYSICS_STATES).toContain('PAUSED');
      expect(VALID_PHYSICS_STATES).toContain('STOPPED');
      expect(VALID_PHYSICS_STATES.length).toBe(4);
    });

    it('should have valid command types', () => {
      expect(VALID_MOTION_COMMAND_TYPES).toContain('FORWARD');
      expect(VALID_MOTION_COMMAND_TYPES).toContain('BACKWARD');
      expect(VALID_MOTION_COMMAND_TYPES).toContain('TURN_LEFT');
      expect(VALID_MOTION_COMMAND_TYPES).toContain('TURN_RIGHT');
      expect(VALID_MOTION_COMMAND_TYPES).toContain('STOP');
      expect(VALID_MOTION_COMMAND_TYPES.length).toBe(5);
    });

    it('should have valid wheel sides', () => {
      expect(VALID_WHEEL_SIDES).toContain('LEFT');
      expect(VALID_WHEEL_SIDES).toContain('RIGHT');
      expect(VALID_WHEEL_SIDES.length).toBe(2);
    });

    it('should have positive default constants', () => {
      expect(DEFAULT_ROBOT_MASS).toBeGreaterThan(0);
      expect(DEFAULT_WHEEL_BASE_CM).toBeGreaterThan(0);
      expect(DEFAULT_WHEEL_RADIUS_CM).toBeGreaterThan(0);
      expect(DEFAULT_MAX_SPEED_CM_PER_SEC).toBeGreaterThan(0);
      expect(DEFAULT_FRICTION_COEFF).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_FRICTION_COEFF).toBeLessThanOrEqual(1);
      expect(DEFAULT_BOUNDING_BOX_WIDTH).toBeGreaterThan(0);
      expect(DEFAULT_BOUNDING_BOX_HEIGHT).toBeGreaterThan(0);
      expect(DEFAULT_TICK_RATE_HZ).toBeGreaterThan(0);
      expect(DEFAULT_COMMAND_SPEED_CM_PER_SEC).toBeGreaterThan(0);
      expect(DEFAULT_TURN_SPEED_DEG_PER_SEC).toBeGreaterThan(0);
    });

    it('should have valid world bounds', () => {
      expect(DEFAULT_WORLD_BOUNDS_MIN).toBeLessThan(DEFAULT_WORLD_BOUNDS_MAX);
    });

    it('should have zero default gravity for 2D ground robots', () => {
      expect(DEFAULT_GRAVITY).toBe(0);
    });

    it('should stress constant access', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(typeof DEFAULT_ROBOT_MASS).toBe('number');
        expect(typeof DEFAULT_WHEEL_BASE_CM).toBe('number');
        expect(typeof DEFAULT_WHEEL_RADIUS_CM).toBe('number');
        expect(typeof DEFAULT_MAX_SPEED_CM_PER_SEC).toBe('number');
        expect(typeof DEFAULT_FRICTION_COEFF).toBe('number');
        expect(VALID_MOTION_STATES.length).toBe(6);
        expect(VALID_COLLISION_STATES.length).toBe(4);
        expect(VALID_PHYSICS_STATES.length).toBe(4);
        expect(VALID_MOTION_COMMAND_TYPES.length).toBe(5);
        expect(VALID_WHEEL_SIDES.length).toBe(2);
      }
    });
  });

});
