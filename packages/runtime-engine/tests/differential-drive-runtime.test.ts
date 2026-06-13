// ═══════════════════════════════════════════════════════════════
// Phase 24B: Differential Drive Robot Simulator — Tests
// 19 sections, 150,000+ assertions, stress iterations = 500
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Constants
  DEFAULT_ENCODER_TICKS_PER_REV,
  DEFAULT_WHEEL_DIAMETER_CM,
  DEFAULT_DRIVE_WHEEL_BASE_CM,
  DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC,
  DEFAULT_MOTOR_PWM_MAX,
  DEFAULT_BATTERY_VOLTAGE,
  DEFAULT_MAX_WAYPOINTS,
  DEFAULT_TELEMETRY_INTERVAL_MS,
  VALID_MOTOR_DIRECTIONS,
  VALID_DRIVE_STATES,
  VALID_ENCODER_STATES,
  VALID_DRIVE_COMMAND_TYPES,
  VALID_ENCODER_SIDES,

  // Factories
  createDefaultDifferentialDriveRobotModel,
  createDefaultWheelEncoderModel,
  createDefaultMotorDriverModel,
  createDefaultRobotCommandQueueModel,
  createDefaultRobotPathModel,
  createDefaultRobotTelemetryModel,

  // Validators
  validateDifferentialDriveRobotModel,
  validateWheelEncoderModel,
  validateMotorDriverModel,
  validateRobotCommandQueueModel,
  validateRobotPathModel,
  validateRobotTelemetryModel,

  // Duplicate validators
  validateDuplicateDriveIds,
  validateDuplicateEncoderIds,
  validateDuplicateDriverIds,
  validateDuplicateQueueIds,
  validateDuplicateRobotPathIds,
  validateDuplicateTelemetryIds,

  // Motor driver engine
  setMotorSpeed,
  setMotorDirection,
  stopMotor,
  simulateDriverOutput,

  // Wheel encoder runtime
  updateEncoderTicks,
  calculateDistanceFromTicks,
  calculateRPM,
  resetEncoder,

  // Differential drive solver
  calculateDriveLinearVelocity,
  calculateDriveAngularVelocity,
  calculateWheelSpeedFromPWM,
  updateDrivePose,
  simulateDriveStep,
  calculateTurningRadius,

  // Robot command queue
  enqueueCommand,
  dequeueCommand,
  executeNextCommand,
  cancelQueue,
  isQueueComplete,

  // Path runtime
  recordWaypoint,
  calculatePathDistance,
  clearPath,

  // Telemetry runtime
  updateTelemetry,
  getTelemetrySummary,

  // ESP32 integration
  virtualDigitalWrite,
  virtualPWMWrite,
  virtualInterruptTick,

  // Registry & Synchronizer
  DriveRegistry,
  DifferentialDriveSynchronizer,
} from '../src/stage/differential-drive-runtime';

import type {
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
} from '../src/types';

const STRESS_ITERATIONS = 500;

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Factory Defaults
// ═══════════════════════════════════════════════════════════════

describe('Phase 24B: Differential Drive Runtime', () => {

  describe('Section 1: Factory Defaults', () => {
    it('should create default DifferentialDriveRobotModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`drive-${i}`);
        expect(model.driveId).toBe(`drive-${i}`);
        expect(model.esp32Id).toBe('');
        expect(model.motorDriverId).toBe('');
        expect(model.leftEncoderId).toBe('');
        expect(model.rightEncoderId).toBe('');
        expect(model.wheelBaseCm).toBe(DEFAULT_DRIVE_WHEEL_BASE_CM);
        expect(model.wheelDiameterCm).toBe(DEFAULT_WHEEL_DIAMETER_CM);
        expect(model.maxSpeedCmPerSec).toBe(DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC);
        expect(model.driveState).toBe('IDLE');
        expect(model.enablePinA).toBe(5);
        expect(model.enablePinB).toBe(6);
        expect(model.in1Pin).toBe(7);
        expect(model.in2Pin).toBe(8);
        expect(model.in3Pin).toBe(9);
        expect(model.in4Pin).toBe(10);
        expect(model.leftEncoderPin).toBe(2);
        expect(model.rightEncoderPin).toBe(3);
        expect(model.timestamp).toBe(0);
        expect(model.futureDriveRobotHints).toEqual({});
      }
    });

    it('should create DifferentialDriveRobotModel with overrides (ID always wins)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`, {
          driveId: 'wrong',
          esp32Id: `esp-${i}`,
          wheelBaseCm: 20,
          maxSpeedCmPerSec: 50,
        });
        expect(model.driveId).toBe(`d-${i}`);
        expect(model.esp32Id).toBe(`esp-${i}`);
        expect(model.wheelBaseCm).toBe(20);
        expect(model.maxSpeedCmPerSec).toBe(50);
      }
    });

    it('should create default WheelEncoderModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`enc-${i}`);
        expect(model.encoderId).toBe(`enc-${i}`);
        expect(model.driveId).toBe('');
        expect(model.side).toBe('LEFT');
        expect(model.tickCount).toBe(0);
        expect(model.ticksPerRevolution).toBe(DEFAULT_ENCODER_TICKS_PER_REV);
        expect(model.distanceCm).toBe(0);
        expect(model.rpm).toBe(0);
        expect(model.lastTickTimestamp).toBe(0);
        expect(model.encoderState).toBe('IDLE');
        expect(model.futureEncoderHints).toEqual({});
      }
    });

    it('should create default MotorDriverModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`drv-${i}`);
        expect(model.driverId).toBe(`drv-${i}`);
        expect(model.driveId).toBe('');
        expect(model.enableAPWM).toBe(0);
        expect(model.enableBPWM).toBe(0);
        expect(model.in1High).toBe(false);
        expect(model.in2High).toBe(false);
        expect(model.in3High).toBe(false);
        expect(model.in4High).toBe(false);
        expect(model.leftMotorDirection).toBe('COAST');
        expect(model.rightMotorDirection).toBe('COAST');
        expect(model.leftSpeedPercent).toBe(0);
        expect(model.rightSpeedPercent).toBe(0);
        expect(model.futureMotorDriverHints).toEqual({});
      }
    });

    it('should create default RobotCommandQueueModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel(`q-${i}`);
        expect(model.queueId).toBe(`q-${i}`);
        expect(model.driveId).toBe('');
        expect(model.commands).toEqual([]);
        expect(model.currentIndex).toBe(0);
        expect(model.isExecuting).toBe(false);
        expect(model.futureCommandQueueHints).toEqual({});
      }
    });

    it('should create default RobotPathModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotPathModel(`path-${i}`);
        expect(model.pathId).toBe(`path-${i}`);
        expect(model.driveId).toBe('');
        expect(model.waypoints).toEqual([]);
        expect(model.totalDistanceCm).toBe(0);
        expect(model.futurePathHints).toEqual({});
      }
    });

    it('should create default RobotTelemetryModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotTelemetryModel(`tel-${i}`);
        expect(model.telemetryId).toBe(`tel-${i}`);
        expect(model.driveId).toBe('');
        expect(model.positionX).toBe(0);
        expect(model.positionY).toBe(0);
        expect(model.headingDeg).toBe(0);
        expect(model.velocityCmPerSec).toBe(0);
        expect(model.angularVelocityDegPerSec).toBe(0);
        expect(model.leftEncoderTicks).toBe(0);
        expect(model.rightEncoderTicks).toBe(0);
        expect(model.leftWheelRPM).toBe(0);
        expect(model.rightWheelRPM).toBe(0);
        expect(model.batteryVoltage).toBe(DEFAULT_BATTERY_VOLTAGE);
        expect(model.timestamp).toBe(0);
        expect(model.futureTelemetryHints).toEqual({});
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Validation — DifferentialDriveRobotModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 2: Validation — DifferentialDriveRobotModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateDifferentialDriveRobotModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return NULL_MODEL warning for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateDifferentialDriveRobotModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_DRIVE_ID for empty driveId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel('');
        const w = validateDifferentialDriveRobotModel(model);
        expect(w.some(x => x.code === 'EMPTY_DRIVE_ID')).toBe(true);
      }
    });

    it('should return INVALID_DRIVE_STATE for an invalid driveState', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`, {
          driveState: 'INVALID_STATE' as RobotDriveState,
        });
        const w = validateDifferentialDriveRobotModel(model);
        expect(w.some(x => x.code === 'INVALID_DRIVE_STATE')).toBe(true);
      }
    });

    it('should return INVALID_WHEEL_BASE for negative wheelBaseCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`, { wheelBaseCm: -5 });
        const w = validateDifferentialDriveRobotModel(model);
        expect(w.some(x => x.code === 'INVALID_WHEEL_BASE')).toBe(true);
      }
    });

    it('should return INVALID_WHEEL_DIAMETER for zero wheelDiameterCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`, { wheelDiameterCm: 0 });
        const w = validateDifferentialDriveRobotModel(model);
        expect(w.some(x => x.code === 'INVALID_WHEEL_DIAMETER')).toBe(true);
      }
    });

    it('should return no warnings for a valid model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`);
        const w = validateDifferentialDriveRobotModel(model);
        expect(w.length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation — WheelEncoderModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 3: Validation — WheelEncoderModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateWheelEncoderModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return NULL_MODEL warning for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateWheelEncoderModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_ENCODER_ID for empty encoderId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel('');
        const w = validateWheelEncoderModel(model);
        expect(w.some(x => x.code === 'EMPTY_ENCODER_ID')).toBe(true);
      }
    });

    it('should return INVALID_ENCODER_SIDE for invalid side', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`e-${i}`, { side: 'CENTER' as 'LEFT' | 'RIGHT' });
        const w = validateWheelEncoderModel(model);
        expect(w.some(x => x.code === 'INVALID_ENCODER_SIDE')).toBe(true);
      }
    });

    it('should return NEGATIVE_TICK_COUNT for negative tickCount', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`e-${i}`, { tickCount: -10 });
        const w = validateWheelEncoderModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_TICK_COUNT')).toBe(true);
      }
    });

    it('should return INVALID_TICKS_PER_REV for zero ticksPerRevolution', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`e-${i}`, { ticksPerRevolution: 0 });
        const w = validateWheelEncoderModel(model);
        expect(w.some(x => x.code === 'INVALID_TICKS_PER_REV')).toBe(true);
      }
    });

    it('should return INVALID_ENCODER_STATE for invalid encoderState', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`e-${i}`, { encoderState: 'BROKEN' as EncoderState });
        const w = validateWheelEncoderModel(model);
        expect(w.some(x => x.code === 'INVALID_ENCODER_STATE')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Validation — MotorDriverModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 4: Validation — MotorDriverModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateMotorDriverModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return NULL_MODEL warning for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateMotorDriverModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_DRIVER_ID for empty driverId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel('');
        const w = validateMotorDriverModel(model);
        expect(w.some(x => x.code === 'EMPTY_DRIVER_ID')).toBe(true);
      }
    });

    it('should return INVALID_ENABLE_A_PWM for negative enableAPWM', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`m-${i}`, { enableAPWM: -1 });
        const w = validateMotorDriverModel(model);
        expect(w.some(x => x.code === 'INVALID_ENABLE_A_PWM')).toBe(true);
      }
    });

    it('should return INVALID_ENABLE_B_PWM for PWM exceeding max', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`m-${i}`, { enableBPWM: 300 });
        const w = validateMotorDriverModel(model);
        expect(w.some(x => x.code === 'INVALID_ENABLE_B_PWM')).toBe(true);
      }
    });

    it('should return INVALID_LEFT_MOTOR_DIR for invalid left motor direction', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`m-${i}`, {
          leftMotorDirection: 'INVALID' as MotorDirection,
        });
        const w = validateMotorDriverModel(model);
        expect(w.some(x => x.code === 'INVALID_LEFT_MOTOR_DIR')).toBe(true);
      }
    });

    it('should return INVALID_RIGHT_MOTOR_DIR for invalid right motor direction', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`m-${i}`, {
          rightMotorDirection: 'INVALID' as MotorDirection,
        });
        const w = validateMotorDriverModel(model);
        expect(w.some(x => x.code === 'INVALID_RIGHT_MOTOR_DIR')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Validation — RobotCommandQueueModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 5: Validation — RobotCommandQueueModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateRobotCommandQueueModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_QUEUE_ID for empty queueId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel('');
        const w = validateRobotCommandQueueModel(model);
        expect(w.some(x => x.code === 'EMPTY_QUEUE_ID')).toBe(true);
      }
    });

    it('should return INVALID_CURRENT_INDEX for negative currentIndex', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel(`q-${i}`, { currentIndex: -1 });
        const w = validateRobotCommandQueueModel(model);
        expect(w.some(x => x.code === 'INVALID_CURRENT_INDEX')).toBe(true);
      }
    });

    it('should return INDEX_OUT_OF_BOUNDS when currentIndex > commands.length', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel(`q-${i}`, { currentIndex: 5 });
        const w = validateRobotCommandQueueModel(model);
        expect(w.some(x => x.code === 'INDEX_OUT_OF_BOUNDS')).toBe(true);
      }
    });

    it('should return no warnings for a valid empty queue', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel(`q-${i}`);
        const w = validateRobotCommandQueueModel(model);
        expect(w.length).toBe(0);
      }
    });

    it('should return INVALID_COMMAND_TYPE for bad command type in commands array', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotCommandQueueModel(`q-${i}`);
        model.commands.push({
          commandType: 'FLY',
          speedCmPerSec: 10,
          durationMs: 1000,
          angleDeg: 0,
          isComplete: false,
        });
        const w = validateRobotCommandQueueModel(model);
        expect(w.some(x => x.code === 'INVALID_COMMAND_TYPE')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Validation — RobotPathModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 6: Validation — RobotPathModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateRobotPathModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_PATH_ID for empty pathId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotPathModel('');
        const w = validateRobotPathModel(model);
        expect(w.some(x => x.code === 'EMPTY_PATH_ID')).toBe(true);
      }
    });

    it('should return NEGATIVE_TOTAL_DISTANCE for negative totalDistanceCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotPathModel(`p-${i}`, { totalDistanceCm: -5 });
        const w = validateRobotPathModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_TOTAL_DISTANCE')).toBe(true);
      }
    });

    it('should return no warnings for a valid path', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotPathModel(`p-${i}`);
        const w = validateRobotPathModel(model);
        expect(w.length).toBe(0);
      }
    });

    it('should return TOO_MANY_WAYPOINTS when exceeding max', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotPathModel(`p-${i}`);
        const waypoints: RobotPathModel['waypoints'] = [];
        for (let j = 0; j <= DEFAULT_MAX_WAYPOINTS; j++) {
          waypoints.push({ x: j, y: j, headingDeg: 0, timestamp: j });
        }
        model.waypoints = waypoints;
        const w = validateRobotPathModel(model);
        expect(w.some(x => x.code === 'TOO_MANY_WAYPOINTS')).toBe(true);
      }
    });

    it('should return NULL_MODEL for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateRobotPathModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Validation — RobotTelemetryModel
  // ═══════════════════════════════════════════════════════════════

  describe('Section 7: Validation — RobotTelemetryModel', () => {
    it('should return NULL_MODEL warning for null input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateRobotTelemetryModel(null);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should return EMPTY_TELEMETRY_ID for empty telemetryId', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotTelemetryModel('');
        const w = validateRobotTelemetryModel(model);
        expect(w.some(x => x.code === 'EMPTY_TELEMETRY_ID')).toBe(true);
      }
    });

    it('should return NEGATIVE_BATTERY_VOLTAGE for negative batteryVoltage', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotTelemetryModel(`t-${i}`, { batteryVoltage: -1 });
        const w = validateRobotTelemetryModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_BATTERY_VOLTAGE')).toBe(true);
      }
    });

    it('should return no warnings for a valid telemetry model', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotTelemetryModel(`t-${i}`);
        const w = validateRobotTelemetryModel(model);
        expect(w.length).toBe(0);
      }
    });

    it('should return NULL_MODEL for undefined input', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const w = validateRobotTelemetryModel(undefined);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('NULL_MODEL');
      }
    });

    it('should accept zero batteryVoltage without warning', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultRobotTelemetryModel(`t-${i}`, { batteryVoltage: 0 });
        const w = validateRobotTelemetryModel(model);
        expect(w.some(x => x.code === 'NEGATIVE_BATTERY_VOLTAGE')).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Duplicate Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Section 8: Duplicate Validators', () => {
    it('should return 0 warnings for unique drive IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultDifferentialDriveRobotModel('d-1');
        const b = createDefaultDifferentialDriveRobotModel('d-2');
        expect(validateDuplicateDriveIds([a, b]).length).toBe(0);

        const c = createDefaultDifferentialDriveRobotModel('d-1');
        expect(validateDuplicateDriveIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateDriveIds([a, c])[0].code).toBe('DUPLICATE_DRIVE_ID');
      }
    });

    it('should return 0 warnings for unique encoder IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultWheelEncoderModel('e-1');
        const b = createDefaultWheelEncoderModel('e-2');
        expect(validateDuplicateEncoderIds([a, b]).length).toBe(0);

        const c = createDefaultWheelEncoderModel('e-1');
        expect(validateDuplicateEncoderIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateEncoderIds([a, c])[0].code).toBe('DUPLICATE_ENCODER_ID');
      }
    });

    it('should return 0 warnings for unique driver IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultMotorDriverModel('m-1');
        const b = createDefaultMotorDriverModel('m-2');
        expect(validateDuplicateDriverIds([a, b]).length).toBe(0);

        const c = createDefaultMotorDriverModel('m-1');
        expect(validateDuplicateDriverIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateDriverIds([a, c])[0].code).toBe('DUPLICATE_DRIVER_ID');
      }
    });

    it('should return 0 warnings for unique queue IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultRobotCommandQueueModel('q-1');
        const b = createDefaultRobotCommandQueueModel('q-2');
        expect(validateDuplicateQueueIds([a, b]).length).toBe(0);

        const c = createDefaultRobotCommandQueueModel('q-1');
        expect(validateDuplicateQueueIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateQueueIds([a, c])[0].code).toBe('DUPLICATE_QUEUE_ID');
      }
    });

    it('should return 0 warnings for unique path IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultRobotPathModel('p-1');
        const b = createDefaultRobotPathModel('p-2');
        expect(validateDuplicateRobotPathIds([a, b]).length).toBe(0);

        const c = createDefaultRobotPathModel('p-1');
        expect(validateDuplicateRobotPathIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateRobotPathIds([a, c])[0].code).toBe('DUPLICATE_PATH_ID');
      }
    });

    it('should return 0 warnings for unique telemetry IDs and 1+ for duplicates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultRobotTelemetryModel('t-1');
        const b = createDefaultRobotTelemetryModel('t-2');
        expect(validateDuplicateTelemetryIds([a, b]).length).toBe(0);

        const c = createDefaultRobotTelemetryModel('t-1');
        expect(validateDuplicateTelemetryIds([a, c]).length).toBeGreaterThanOrEqual(1);
        expect(validateDuplicateTelemetryIds([a, c])[0].code).toBe('DUPLICATE_TELEMETRY_ID');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Motor Driver Engine
  // ═══════════════════════════════════════════════════════════════

  describe('Section 9: Motor Driver Engine', () => {
    it('should setMotorSpeed LEFT and clamp PWM to 0–255', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorSpeed(driver, 'LEFT', 128);
        expect(result.enableAPWM).toBe(128);
        expect(result.leftSpeedPercent).toBeCloseTo((128 / 255) * 100, 5);
        expect(result.enableBPWM).toBe(0);
        // Original immutability
        expect(driver.enableAPWM).toBe(0);
      }
    });

    it('should setMotorSpeed RIGHT and clamp PWM to 0–255', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorSpeed(driver, 'RIGHT', 200);
        expect(result.enableBPWM).toBe(200);
        expect(result.rightSpeedPercent).toBeCloseTo((200 / 255) * 100, 5);
        expect(result.enableAPWM).toBe(0);
        expect(driver.enableBPWM).toBe(0);
      }
    });

    it('should clamp negative PWM to 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorSpeed(driver, 'LEFT', -50);
        expect(result.enableAPWM).toBe(0);
        expect(result.leftSpeedPercent).toBe(0);
      }
    });

    it('should clamp PWM above 255 to 255', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorSpeed(driver, 'LEFT', 999);
        expect(result.enableAPWM).toBe(255);
        expect(result.leftSpeedPercent).toBe(100);
      }
    });

    it('should setMotorDirection FORWARD for LEFT channel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorDirection(driver, 'LEFT', 'FORWARD');
        expect(result.in1High).toBe(true);
        expect(result.in2High).toBe(false);
        expect(result.leftMotorDirection).toBe('FORWARD');
        expect(driver.in1High).toBe(false);
      }
    });

    it('should setMotorDirection BACKWARD for LEFT channel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorDirection(driver, 'LEFT', 'BACKWARD');
        expect(result.in1High).toBe(false);
        expect(result.in2High).toBe(true);
        expect(result.leftMotorDirection).toBe('BACKWARD');
      }
    });

    it('should setMotorDirection BRAKE for RIGHT channel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorDirection(driver, 'RIGHT', 'BRAKE');
        expect(result.in3High).toBe(true);
        expect(result.in4High).toBe(true);
        expect(result.rightMotorDirection).toBe('BRAKE');
      }
    });

    it('should setMotorDirection COAST for RIGHT channel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const result = setMotorDirection(driver, 'RIGHT', 'COAST');
        expect(result.in3High).toBe(false);
        expect(result.in4High).toBe(false);
        expect(result.rightMotorDirection).toBe('COAST');
      }
    });

    it('should stopMotor setting direction to BRAKE and PWM to 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let driver = createDefaultMotorDriverModel('m-1');
        driver = setMotorSpeed(driver, 'LEFT', 200);
        driver = setMotorDirection(driver, 'LEFT', 'FORWARD');
        const result = stopMotor(driver, 'LEFT');
        expect(result.leftMotorDirection).toBe('BRAKE');
        expect(result.enableAPWM).toBe(0);
        expect(result.leftSpeedPercent).toBe(0);
      }
    });

    it('should simulateDriverOutput with 0 PWM giving 0 speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const driver = createDefaultMotorDriverModel('m-1');
        const output = simulateDriverOutput(driver, DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC);
        expect(output.leftSpeedCmPerSec).toBe(0);
        expect(output.rightSpeedCmPerSec).toBe(0);
      }
    });

    it('should simulateDriverOutput with FORWARD direction yielding positive speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let driver = createDefaultMotorDriverModel('m-1');
        driver = setMotorDirection(driver, 'LEFT', 'FORWARD');
        driver = setMotorSpeed(driver, 'LEFT', 127);
        const output = simulateDriverOutput(driver, DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC);
        expect(output.leftSpeedCmPerSec).toBeGreaterThan(0);
        expect(output.leftSpeedCmPerSec).toBeCloseTo(
          (127 / 255) * DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC, 2
        );
      }
    });

    it('should simulateDriverOutput with BACKWARD direction yielding negative speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let driver = createDefaultMotorDriverModel('m-1');
        driver = setMotorDirection(driver, 'RIGHT', 'BACKWARD');
        driver = setMotorSpeed(driver, 'RIGHT', 255);
        const output = simulateDriverOutput(driver, DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC);
        expect(output.rightSpeedCmPerSec).toBe(-DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Wheel Encoder Runtime
  // ═══════════════════════════════════════════════════════════════

  describe('Section 10: Wheel Encoder Runtime', () => {
    it('should updateEncoderTicks for forward distance', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1');
        const circumference = Math.PI * DEFAULT_WHEEL_DIAMETER_CM;
        const distanceCm = circumference; // exactly 1 revolution
        const result = updateEncoderTicks(enc, distanceCm, DEFAULT_WHEEL_DIAMETER_CM, 1000);
        expect(result.tickCount).toBeCloseTo(DEFAULT_ENCODER_TICKS_PER_REV, 5);
        expect(result.distanceCm).toBeCloseTo(circumference, 5);
        expect(result.lastTickTimestamp).toBe(1000);
        expect(result.encoderState).toBe('COUNTING');
        // Immutability
        expect(enc.tickCount).toBe(0);
      }
    });

    it('should handle zero distance without changing ticks', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1');
        const result = updateEncoderTicks(enc, 0, DEFAULT_WHEEL_DIAMETER_CM, 500);
        expect(result.tickCount).toBe(0);
        expect(result.distanceCm).toBe(0);
      }
    });

    it('should calculateDistanceFromTicks correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1', { tickCount: DEFAULT_ENCODER_TICKS_PER_REV });
        const dist = calculateDistanceFromTicks(enc, DEFAULT_WHEEL_DIAMETER_CM);
        const expectedCircumference = Math.PI * DEFAULT_WHEEL_DIAMETER_CM;
        expect(dist).toBeCloseTo(expectedCircumference, 5);
      }
    });

    it('should calculateDistanceFromTicks returning 0 for zero ticksPerRevolution', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1', { ticksPerRevolution: 0, tickCount: 10 });
        const dist = calculateDistanceFromTicks(enc, DEFAULT_WHEEL_DIAMETER_CM);
        expect(dist).toBe(0);
      }
    });

    it('should calculateRPM correctly for tick delta over time', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prev = createDefaultWheelEncoderModel('e-1', { tickCount: 0 });
        const curr = createDefaultWheelEncoderModel('e-1', { tickCount: DEFAULT_ENCODER_TICKS_PER_REV });
        // 20 ticks in 1000ms = 1 revolution in 1 second = 60 RPM
        const rpm = calculateRPM(curr, prev, 1000);
        expect(rpm).toBeCloseTo(60, 5);
      }
    });

    it('should calculateRPM returning 0 for zero deltaMs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prev = createDefaultWheelEncoderModel('e-1');
        const curr = createDefaultWheelEncoderModel('e-1', { tickCount: 100 });
        const rpm = calculateRPM(curr, prev, 0);
        expect(rpm).toBe(0);
      }
    });

    it('should calculateRPM returning 0 for negative deltaMs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const prev = createDefaultWheelEncoderModel('e-1');
        const curr = createDefaultWheelEncoderModel('e-1', { tickCount: 100 });
        const rpm = calculateRPM(curr, prev, -500);
        expect(rpm).toBe(0);
      }
    });

    it('should resetEncoder to initial state', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1', {
          tickCount: 500,
          distanceCm: 100,
          rpm: 30,
          lastTickTimestamp: 5000,
          encoderState: 'COUNTING',
        });
        const result = resetEncoder(enc);
        expect(result.tickCount).toBe(0);
        expect(result.distanceCm).toBe(0);
        expect(result.rpm).toBe(0);
        expect(result.lastTickTimestamp).toBe(0);
        expect(result.encoderState).toBe('RESET');
        // Immutability
        expect(enc.tickCount).toBe(500);
      }
    });

    it('should handle negative distance as absolute value in updateEncoderTicks', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1');
        const result = updateEncoderTicks(enc, -10, DEFAULT_WHEEL_DIAMETER_CM, 100);
        expect(result.tickCount).toBeGreaterThan(0);
        expect(result.distanceCm).toBe(10);
      }
    });

    it('should handle zero wheelDiameterCm gracefully in updateEncoderTicks', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const enc = createDefaultWheelEncoderModel('e-1');
        const result = updateEncoderTicks(enc, 10, 0, 100);
        expect(result.tickCount).toBe(0);
        expect(result.distanceCm).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 11: Differential Drive Solver
  // ═══════════════════════════════════════════════════════════════

  describe('Section 11: Differential Drive Solver', () => {
    it('should calculateDriveLinearVelocity with equal speeds', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const v = calculateDriveLinearVelocity(10, 10);
        expect(v).toBe(10);
      }
    });

    it('should calculateDriveLinearVelocity with unequal speeds', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const v = calculateDriveLinearVelocity(5, 15);
        expect(v).toBe(10);
      }
    });

    it('should calculateDriveLinearVelocity with zero speeds', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const v = calculateDriveLinearVelocity(0, 0);
        expect(v).toBe(0);
      }
    });

    it('should calculateDriveAngularVelocity with equal speeds returning 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const omega = calculateDriveAngularVelocity(10, 10, DEFAULT_DRIVE_WHEEL_BASE_CM);
        expect(omega).toBe(0);
      }
    });

    it('should calculateDriveAngularVelocity with different speeds returning non-zero', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const omega = calculateDriveAngularVelocity(5, 15, DEFAULT_DRIVE_WHEEL_BASE_CM);
        const expectedRad = (15 - 5) / DEFAULT_DRIVE_WHEEL_BASE_CM;
        const expectedDeg = expectedRad * (180 / Math.PI);
        expect(omega).toBeCloseTo(expectedDeg, 5);
      }
    });

    it('should calculateDriveAngularVelocity returning 0 for zero wheelBaseCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const omega = calculateDriveAngularVelocity(5, 15, 0);
        expect(omega).toBe(0);
      }
    });

    it('should calculateWheelSpeedFromPWM at various duty cycles', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(calculateWheelSpeedFromPWM(0, 255, 25)).toBe(0);
        expect(calculateWheelSpeedFromPWM(255, 255, 25)).toBe(25);
        expect(calculateWheelSpeedFromPWM(127, 255, 25)).toBeCloseTo((127 / 255) * 25, 5);
        // Clamp above max
        expect(calculateWheelSpeedFromPWM(300, 255, 25)).toBe(25);
        // Clamp below 0
        expect(calculateWheelSpeedFromPWM(-10, 255, 25)).toBe(0);
      }
    });

    it('should calculateWheelSpeedFromPWM returning 0 for zero maxPWM', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(calculateWheelSpeedFromPWM(128, 0, 25)).toBe(0);
      }
    });

    it('should updateDrivePose forward motion along heading 0', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pose = updateDrivePose(0, 0, 0, 10, 0, 1);
        expect(pose.x).toBeCloseTo(10, 5);
        expect(pose.y).toBeCloseTo(0, 5);
        expect(pose.headingDeg).toBe(0);
      }
    });

    it('should updateDrivePose with angular velocity changing heading', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pose = updateDrivePose(0, 0, 0, 0, 90, 1);
        expect(pose.x).toBeCloseTo(0, 5);
        expect(pose.y).toBeCloseTo(0, 5);
        expect(pose.headingDeg).toBeCloseTo(90, 5);
      }
    });

    it('should normalise heading to [0, 360) in updateDrivePose', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const pose = updateDrivePose(0, 0, 350, 0, 90, 1);
        // 350 + 90 = 440 → normalised to 80
        expect(pose.headingDeg).toBeCloseTo(80, 5);
        const pose2 = updateDrivePose(0, 0, 10, 0, -90, 1);
        // 10 + (-90) = -80 → normalised to 280
        expect(pose2.headingDeg).toBeCloseTo(280, 5);
      }
    });

    it('should simulateDriveStep and produce valid output', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        let motorDriver = createDefaultMotorDriverModel('m-1');
        motorDriver = setMotorDirection(motorDriver, 'LEFT', 'FORWARD');
        motorDriver = setMotorDirection(motorDriver, 'RIGHT', 'FORWARD');
        motorDriver = setMotorSpeed(motorDriver, 'LEFT', 127);
        motorDriver = setMotorSpeed(motorDriver, 'RIGHT', 127);
        const leftEnc = createDefaultWheelEncoderModel('eL');
        const rightEnc = createDefaultWheelEncoderModel('eR');
        const step = simulateDriveStep(drive, motorDriver, leftEnc, rightEnc, 100, 1000);
        expect(step.drive.driveState).toBe('DRIVING');
        expect(step.drive.timestamp).toBe(1000);
        expect(step.leftEncoder.tickCount).toBeGreaterThan(0);
        expect(step.rightEncoder.tickCount).toBeGreaterThan(0);
        expect(step.newX).toBeGreaterThan(0);
        // Immutability check
        expect(drive.driveState).toBe('IDLE');
        expect(leftEnc.tickCount).toBe(0);
      }
    });

    it('should calculateTurningRadius returning Infinity for equal speeds', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const r = calculateTurningRadius(10, 10, DEFAULT_DRIVE_WHEEL_BASE_CM);
        expect(r).toBe(Infinity);
      }
    });

    it('should calculateTurningRadius for differential speeds', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const r = calculateTurningRadius(5, 15, DEFAULT_DRIVE_WHEEL_BASE_CM);
        const expected = (DEFAULT_DRIVE_WHEEL_BASE_CM / 2) * ((5 + 15) / (15 - 5));
        expect(r).toBeCloseTo(expected, 5);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 12: Robot Command Queue
  // ═══════════════════════════════════════════════════════════════

  describe('Section 12: Robot Command Queue', () => {
    it('should enqueue a valid command', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const q = createDefaultRobotCommandQueueModel('q-1');
        const result = enqueueCommand(q, 'MOVE_FORWARD', 10, 2000, 0);
        expect(result.commands.length).toBe(1);
        expect(result.commands[0].commandType).toBe('MOVE_FORWARD');
        expect(result.commands[0].speedCmPerSec).toBe(10);
        expect(result.commands[0].durationMs).toBe(2000);
        expect(result.commands[0].isComplete).toBe(false);
        // Immutability
        expect(q.commands.length).toBe(0);
      }
    });

    it('should not enqueue an invalid command type', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const q = createDefaultRobotCommandQueueModel('q-1');
        const result = enqueueCommand(q, 'FLY', 10, 1000, 0);
        expect(result.commands.length).toBe(0);
      }
    });

    it('should clamp negative speed to 0 when enqueuing', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const q = createDefaultRobotCommandQueueModel('q-1');
        const result = enqueueCommand(q, 'MOVE_FORWARD', -5, 1000, 0);
        expect(result.commands[0].speedCmPerSec).toBe(0);
      }
    });

    it('should dequeue a command and advance currentIndex', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_FORWARD', 10, 1000, 0);
        q = enqueueCommand(q, 'TURN_LEFT', 5, 500, 90);
        const { queue: newQ, command } = dequeueCommand(q);
        expect(command).toBeDefined();
        expect(command!.commandType).toBe('MOVE_FORWARD');
        expect(newQ.currentIndex).toBe(1);
        expect(newQ.commands[0].isComplete).toBe(true);
      }
    });

    it('should return undefined command when dequeuing exhausted queue', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const q = createDefaultRobotCommandQueueModel('q-1');
        const { command } = dequeueCommand(q);
        expect(command).toBeUndefined();
      }
    });

    it('should executeNextCommand MOVE_FORWARD setting DRIVING state', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_FORWARD', 15, 2000, 0);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = executeNextCommand(q, drive, motor);
        expect(result.drive.driveState).toBe('DRIVING');
        expect(result.motorDriver.leftMotorDirection).toBe('FORWARD');
        expect(result.motorDriver.rightMotorDirection).toBe('FORWARD');
        expect(result.queue.isExecuting).toBe(true);
      }
    });

    it('should executeNextCommand TURN_LEFT setting TURNING state', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'TURN_LEFT', 10, 1000, 90);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = executeNextCommand(q, drive, motor);
        expect(result.drive.driveState).toBe('TURNING');
        expect(result.motorDriver.leftMotorDirection).toBe('BACKWARD');
        expect(result.motorDriver.rightMotorDirection).toBe('FORWARD');
      }
    });

    it('should executeNextCommand STOP setting IDLE state', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'STOP', 0, 0, 0);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = executeNextCommand(q, drive, motor);
        expect(result.drive.driveState).toBe('IDLE');
        expect(result.motorDriver.leftMotorDirection).toBe('BRAKE');
        expect(result.motorDriver.rightMotorDirection).toBe('BRAKE');
      }
    });

    it('should cancelQueue marking all commands complete', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_FORWARD', 10, 1000, 0);
        q = enqueueCommand(q, 'TURN_RIGHT', 10, 500, 90);
        const cancelled = cancelQueue(q);
        expect(cancelled.isExecuting).toBe(false);
        expect(cancelled.currentIndex).toBe(cancelled.commands.length);
        for (const cmd of cancelled.commands) {
          expect(cmd.isComplete).toBe(true);
        }
        // Immutability
        expect(q.isExecuting).toBe(false);
        expect(q.currentIndex).toBe(0);
      }
    });

    it('should isQueueComplete return true for exhausted queue and false otherwise', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const empty = createDefaultRobotCommandQueueModel('q-1');
        expect(isQueueComplete(empty)).toBe(true);

        let q = createDefaultRobotCommandQueueModel('q-2');
        q = enqueueCommand(q, 'MOVE_FORWARD', 10, 1000, 0);
        expect(isQueueComplete(q)).toBe(false);

        const { queue: advanced } = dequeueCommand(q);
        expect(isQueueComplete(advanced)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 13: Path Runtime
  // ═══════════════════════════════════════════════════════════════

  describe('Section 13: Path Runtime', () => {
    it('should recordWaypoint and update totalDistanceCm', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let path = createDefaultRobotPathModel('p-1');
        path = recordWaypoint(path, 0, 0, 0, 0);
        path = recordWaypoint(path, 3, 4, 0, 100);
        expect(path.waypoints.length).toBe(2);
        expect(path.totalDistanceCm).toBeCloseTo(5, 5); // 3-4-5 triangle
      }
    });

    it('should calculatePathDistance correctly with multiple waypoints', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const path = createDefaultRobotPathModel('p-1');
        path.waypoints = [
          { x: 0, y: 0, headingDeg: 0, timestamp: 0 },
          { x: 10, y: 0, headingDeg: 0, timestamp: 100 },
          { x: 10, y: 10, headingDeg: 90, timestamp: 200 },
        ];
        const dist = calculatePathDistance(path);
        expect(dist).toBeCloseTo(20, 5);
      }
    });

    it('should return 0 distance for empty or single waypoint path', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const empty = createDefaultRobotPathModel('p-1');
        expect(calculatePathDistance(empty)).toBe(0);

        empty.waypoints.push({ x: 5, y: 5, headingDeg: 0, timestamp: 0 });
        expect(calculatePathDistance(empty)).toBe(0);
      }
    });

    it('should clearPath resetting waypoints and distance', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let path = createDefaultRobotPathModel('p-1');
        path = recordWaypoint(path, 0, 0, 0, 0);
        path = recordWaypoint(path, 10, 10, 45, 100);
        const cleared = clearPath(path);
        expect(cleared.waypoints.length).toBe(0);
        expect(cleared.totalDistanceCm).toBe(0);
        // Immutability
        expect(path.waypoints.length).toBe(2);
      }
    });

    it('should trim oldest waypoints when exceeding DEFAULT_MAX_WAYPOINTS', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let path = createDefaultRobotPathModel('p-1');
        // Add MAX + 5 waypoints
        for (let j = 0; j <= DEFAULT_MAX_WAYPOINTS + 4; j++) {
          path = recordWaypoint(path, j, j, 0, j);
        }
        expect(path.waypoints.length).toBe(DEFAULT_MAX_WAYPOINTS);
        // First waypoint should NOT be x=0 (it was trimmed)
        expect(path.waypoints[0].x).toBeGreaterThan(0);
      }
    });

    it('should not mutate original path when recording waypoints', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const original = createDefaultRobotPathModel('p-1');
        const updated = recordWaypoint(original, 5, 5, 0, 100);
        expect(original.waypoints.length).toBe(0);
        expect(updated.waypoints.length).toBe(1);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: Telemetry Runtime
  // ═══════════════════════════════════════════════════════════════

  describe('Section 14: Telemetry Runtime', () => {
    it('should updateTelemetry with latest state', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('t-1');
        const leftEnc = createDefaultWheelEncoderModel('eL', { tickCount: 100, rpm: 30 });
        const rightEnc = createDefaultWheelEncoderModel('eR', { tickCount: 120, rpm: 35 });
        const result = updateTelemetry(tel, 10, 20, 45, 15, 5, leftEnc, rightEnc, 7.2, 5000);
        expect(result.positionX).toBe(10);
        expect(result.positionY).toBe(20);
        expect(result.headingDeg).toBe(45);
        expect(result.velocityCmPerSec).toBe(15);
        expect(result.angularVelocityDegPerSec).toBe(5);
        expect(result.leftEncoderTicks).toBe(100);
        expect(result.rightEncoderTicks).toBe(120);
        expect(result.leftWheelRPM).toBe(30);
        expect(result.rightWheelRPM).toBe(35);
        expect(result.batteryVoltage).toBe(7.2);
        expect(result.timestamp).toBe(5000);
        // Immutability
        expect(tel.positionX).toBe(0);
        expect(tel.timestamp).toBe(0);
      }
    });

    it('should getTelemetrySummary returning a formatted string', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('t-1', {
          positionX: 1.5,
          positionY: 2.5,
          headingDeg: 90.3,
          velocityCmPerSec: 12.4,
          angularVelocityDegPerSec: 3.7,
          leftEncoderTicks: 50,
          rightEncoderTicks: 55,
          leftWheelRPM: 28.6,
          rightWheelRPM: 30.2,
          batteryVoltage: 7.3,
        });
        const summary = getTelemetrySummary(tel);
        expect(summary).toContain('[Telemetry t-1]');
        expect(summary).toContain('pos=(1.5, 2.5)');
        expect(summary).toContain('hdg=90.3°');
        expect(summary).toContain('vel=12.4cm/s');
        expect(summary).toContain('bat=7.3V');
      }
    });

    it('should preserve telemetryId across updates', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel(`t-${i}`);
        const leftEnc = createDefaultWheelEncoderModel('eL');
        const rightEnc = createDefaultWheelEncoderModel('eR');
        const result = updateTelemetry(tel, 0, 0, 0, 0, 0, leftEnc, rightEnc, 7.4, 100);
        expect(result.telemetryId).toBe(`t-${i}`);
        expect(result.driveId).toBe('');
      }
    });

    it('should update timestamp on each telemetry update', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('t-1');
        const leftEnc = createDefaultWheelEncoderModel('eL');
        const rightEnc = createDefaultWheelEncoderModel('eR');
        const r1 = updateTelemetry(tel, 0, 0, 0, 0, 0, leftEnc, rightEnc, 7.4, 1000);
        const r2 = updateTelemetry(r1, 5, 5, 45, 10, 2, leftEnc, rightEnc, 7.3, 2000);
        expect(r1.timestamp).toBe(1000);
        expect(r2.timestamp).toBe(2000);
        expect(r2.positionX).toBe(5);
      }
    });

    it('should handle zero values in telemetry update', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('t-1');
        const leftEnc = createDefaultWheelEncoderModel('eL');
        const rightEnc = createDefaultWheelEncoderModel('eR');
        const result = updateTelemetry(tel, 0, 0, 0, 0, 0, leftEnc, rightEnc, 0, 0);
        expect(result.positionX).toBe(0);
        expect(result.batteryVoltage).toBe(0);
        expect(result.timestamp).toBe(0);
      }
    });

    it('should not mutate encoder models passed to updateTelemetry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('t-1');
        const leftEnc = createDefaultWheelEncoderModel('eL', { tickCount: 50 });
        const rightEnc = createDefaultWheelEncoderModel('eR', { tickCount: 60 });
        updateTelemetry(tel, 10, 20, 90, 15, 3, leftEnc, rightEnc, 7.4, 1000);
        expect(leftEnc.tickCount).toBe(50);
        expect(rightEnc.tickCount).toBe(60);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 15: ESP32 Integration
  // ═══════════════════════════════════════════════════════════════

  describe('Section 15: ESP32 Integration', () => {
    it('should virtualDigitalWrite IN1 pin setting in1High', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualDigitalWrite(drive, motor, drive.in1Pin, true);
        expect(result.in1High).toBe(true);
        expect(result.leftMotorDirection).toBe('FORWARD'); // in1=true, in2=false
        expect(motor.in1High).toBe(false); // immutability
      }
    });

    it('should virtualDigitalWrite IN2 pin setting in2High', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualDigitalWrite(drive, motor, drive.in2Pin, true);
        expect(result.in2High).toBe(true);
        expect(result.leftMotorDirection).toBe('BACKWARD'); // in1=false, in2=true
      }
    });

    it('should virtualDigitalWrite IN3 pin setting in3High', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualDigitalWrite(drive, motor, drive.in3Pin, true);
        expect(result.in3High).toBe(true);
        expect(result.rightMotorDirection).toBe('FORWARD'); // in3=true, in4=false
      }
    });

    it('should virtualDigitalWrite IN4 pin setting in4High', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualDigitalWrite(drive, motor, drive.in4Pin, true);
        expect(result.in4High).toBe(true);
        expect(result.rightMotorDirection).toBe('BACKWARD'); // in3=false, in4=true
      }
    });

    it('should virtualPWMWrite ENA pin setting left motor speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualPWMWrite(drive, motor, drive.enablePinA, 200);
        expect(result.enableAPWM).toBe(200);
        expect(result.leftSpeedPercent).toBeCloseTo((200 / 255) * 100, 2);
        expect(motor.enableAPWM).toBe(0); // immutability
      }
    });

    it('should virtualPWMWrite ENB pin setting right motor speed', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = virtualPWMWrite(drive, motor, drive.enablePinB, 150);
        expect(result.enableBPWM).toBe(150);
        expect(result.rightSpeedPercent).toBeCloseTo((150 / 255) * 100, 2);
      }
    });

    it('should virtualInterruptTick increment encoder ticks by 1', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const enc = createDefaultWheelEncoderModel('eL');
        const result = virtualInterruptTick(drive, enc, drive.leftEncoderPin, DEFAULT_WHEEL_DIAMETER_CM, 500);
        expect(result.tickCount).toBe(1);
        expect(result.encoderState).toBe('COUNTING');
        expect(result.lastTickTimestamp).toBe(500);
        expect(result.distanceCm).toBeGreaterThan(0);
        // Immutability
        expect(enc.tickCount).toBe(0);
      }
    });

    it('should virtualInterruptTick ignore unrecognised pins', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const enc = createDefaultWheelEncoderModel('eL');
        const result = virtualInterruptTick(drive, enc, 99, DEFAULT_WHEEL_DIAMETER_CM, 500);
        expect(result.tickCount).toBe(0);
        expect(result.encoderState).toBe('IDLE');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 16: Blockly Integration (End-to-End Scenario)
  // ═══════════════════════════════════════════════════════════════

  describe('Section 16: Blockly Integration', () => {
    it('should create all factory models for a complete robot setup', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('bot-1');
        const motor = createDefaultMotorDriverModel('motor-1');
        const eL = createDefaultWheelEncoderModel('eL', { side: 'LEFT' });
        const eR = createDefaultWheelEncoderModel('eR', { side: 'RIGHT' });
        const queue = createDefaultRobotCommandQueueModel('q-1');
        const path = createDefaultRobotPathModel('path-1');
        const tel = createDefaultRobotTelemetryModel('tel-1');
        expect(drive.driveId).toBe('bot-1');
        expect(motor.driverId).toBe('motor-1');
        expect(eL.side).toBe('LEFT');
        expect(eR.side).toBe('RIGHT');
        expect(queue.commands.length).toBe(0);
        expect(path.waypoints.length).toBe(0);
        expect(tel.batteryVoltage).toBe(DEFAULT_BATTERY_VOLTAGE);
      }
    });

    it('should enqueue and execute MOVE_FORWARD command end-to-end', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_FORWARD', 15, 2000, 0);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const result = executeNextCommand(q, drive, motor);
        expect(result.drive.driveState).toBe('DRIVING');
        expect(result.queue.isExecuting).toBe(true);
        expect(result.motorDriver.leftMotorDirection).toBe('FORWARD');
        expect(result.motorDriver.rightMotorDirection).toBe('FORWARD');
        expect(result.motorDriver.enableAPWM).toBeGreaterThan(0);
      }
    });

    it('should simulate a drive step and update telemetry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        let motor = createDefaultMotorDriverModel('m-1');
        motor = setMotorDirection(motor, 'LEFT', 'FORWARD');
        motor = setMotorDirection(motor, 'RIGHT', 'FORWARD');
        motor = setMotorSpeed(motor, 'LEFT', 255);
        motor = setMotorSpeed(motor, 'RIGHT', 255);
        const eL = createDefaultWheelEncoderModel('eL');
        const eR = createDefaultWheelEncoderModel('eR');
        const step = simulateDriveStep(drive, motor, eL, eR, 100, 1000);
        const tel = createDefaultRobotTelemetryModel('tel-1');
        const v = calculateDriveLinearVelocity(
          simulateDriverOutput(motor, drive.maxSpeedCmPerSec).leftSpeedCmPerSec,
          simulateDriverOutput(motor, drive.maxSpeedCmPerSec).rightSpeedCmPerSec,
        );
        const result = updateTelemetry(
          tel, step.newX, step.newY, step.newHeadingDeg,
          v, 0, step.leftEncoder, step.rightEncoder, DEFAULT_BATTERY_VOLTAGE, 1000,
        );
        expect(result.positionX).toBeGreaterThan(0);
        expect(result.leftEncoderTicks).toBeGreaterThan(0);
        expect(result.timestamp).toBe(1000);
      }
    });

    it('should execute a full MOVE_BACKWARD + TURN_RIGHT sequence', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_BACKWARD', 10, 1000, 0);
        q = enqueueCommand(q, 'TURN_RIGHT', 10, 500, 90);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const r1 = executeNextCommand(q, drive, motor);
        expect(r1.drive.driveState).toBe('DRIVING');
        expect(r1.motorDriver.leftMotorDirection).toBe('BACKWARD');
        const r2 = executeNextCommand(r1.queue, r1.drive, r1.motorDriver);
        expect(r2.drive.driveState).toBe('TURNING');
        expect(r2.motorDriver.rightMotorDirection).toBe('BACKWARD');
        expect(r2.motorDriver.leftMotorDirection).toBe('FORWARD');
      }
    });

    it('should record path waypoints from drive steps', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let path = createDefaultRobotPathModel('p-1');
        path = recordWaypoint(path, 0, 0, 0, 0);
        path = recordWaypoint(path, 10, 0, 0, 100);
        path = recordWaypoint(path, 10, 10, 90, 200);
        expect(path.waypoints.length).toBe(3);
        expect(path.totalDistanceCm).toBeCloseTo(20, 5);
      }
    });

    it('should complete queue after executing all commands', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let q = createDefaultRobotCommandQueueModel('q-1');
        q = enqueueCommand(q, 'MOVE_FORWARD', 10, 1000, 0);
        const drive = createDefaultDifferentialDriveRobotModel('d-1');
        const motor = createDefaultMotorDriverModel('m-1');
        const r = executeNextCommand(q, drive, motor);
        const r2 = executeNextCommand(r.queue, r.drive, r.motorDriver);
        expect(r2.drive.driveState).toBe('COMPLETED');
        expect(isQueueComplete(r2.queue)).toBe(true);
      }
    });

    it('should produce valid telemetry summary after end-to-end flow', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const tel = createDefaultRobotTelemetryModel('tel-1', {
          positionX: 5.2,
          positionY: 3.8,
          headingDeg: 45.0,
          velocityCmPerSec: 10.5,
          angularVelocityDegPerSec: 2.1,
          leftEncoderTicks: 42,
          rightEncoderTicks: 43,
          leftWheelRPM: 15.0,
          rightWheelRPM: 15.5,
          batteryVoltage: 7.2,
        });
        const summary = getTelemetrySummary(tel);
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        expect(summary).toContain('tel-1');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 17: Synchronizer CRUD & Serialization
  // ═══════════════════════════════════════════════════════════════

  describe('Section 17: Synchronizer CRUD & Serialization', () => {
    let sync: DifferentialDriveSynchronizer;

    beforeEach(() => {
      sync = new DifferentialDriveSynchronizer();
    });

    it('should register and lookup DifferentialDriveRobotModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultDifferentialDriveRobotModel(`d-${i}`);
        sync.differentialDriveRobots.register(`d-${i}`, model);
        const found = sync.differentialDriveRobots.lookup(`d-${i}`);
        expect(found).toBeDefined();
        expect(found!.driveId).toBe(`d-${i}`);
      }
    });

    it('should register and lookup WheelEncoderModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultWheelEncoderModel(`e-${i}`);
        sync.wheelEncoders.register(`e-${i}`, model);
        const found = sync.wheelEncoders.lookup(`e-${i}`);
        expect(found).toBeDefined();
        expect(found!.encoderId).toBe(`e-${i}`);
      }
    });

    it('should register and lookup MotorDriverModel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const model = createDefaultMotorDriverModel(`m-${i}`);
        sync.motorDrivers.register(`m-${i}`, model);
        const found = sync.motorDrivers.lookup(`m-${i}`);
        expect(found).toBeDefined();
        expect(found!.driverId).toBe(`m-${i}`);
      }
    });

    it('should getAll returning all registered models in order', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.differentialDriveRobots.clear();
        sync.differentialDriveRobots.register('a', createDefaultDifferentialDriveRobotModel('a'));
        sync.differentialDriveRobots.register('b', createDefaultDifferentialDriveRobotModel('b'));
        sync.differentialDriveRobots.register('c', createDefaultDifferentialDriveRobotModel('c'));
        const all = sync.differentialDriveRobots.getAll();
        expect(all.length).toBe(3);
        expect(all[0].driveId).toBe('a');
        expect(all[1].driveId).toBe('b');
        expect(all[2].driveId).toBe('c');
      }
    });

    it('should update a model with partial data', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.differentialDriveRobots.clear();
        sync.differentialDriveRobots.register('d-1', createDefaultDifferentialDriveRobotModel('d-1'));
        sync.differentialDriveRobots.update('d-1', { wheelBaseCm: 20, maxSpeedCmPerSec: 50 });
        const found = sync.differentialDriveRobots.lookup('d-1');
        expect(found!.wheelBaseCm).toBe(20);
        expect(found!.maxSpeedCmPerSec).toBe(50);
        expect(found!.driveId).toBe('d-1');
      }
    });

    it('should remove a model from registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.motorDrivers.clear();
        sync.motorDrivers.register('m-1', createDefaultMotorDriverModel('m-1'));
        expect(sync.motorDrivers.has('m-1')).toBe(true);
        sync.motorDrivers.remove('m-1');
        expect(sync.motorDrivers.has('m-1')).toBe(false);
        expect(sync.motorDrivers.lookup('m-1')).toBeUndefined();
      }
    });

    it('should clear all registries', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.differentialDriveRobots.register(`d-${i}`, createDefaultDifferentialDriveRobotModel(`d-${i}`));
        sync.wheelEncoders.register(`e-${i}`, createDefaultWheelEncoderModel(`e-${i}`));
      }
      sync.clear();
      expect(sync.differentialDriveRobots.size).toBe(0);
      expect(sync.wheelEncoders.size).toBe(0);
      expect(sync.motorDrivers.size).toBe(0);
      expect(sync.robotCommandQueues.size).toBe(0);
      expect(sync.robotPaths.size).toBe(0);
      expect(sync.robotTelemetry.size).toBe(0);
    });

    it('should buildSnapshot populating all registries and returning snapshot', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const snap = sync.buildSnapshot(
          [createDefaultDifferentialDriveRobotModel('d-1')],
          [createDefaultWheelEncoderModel('e-1')],
          [createDefaultMotorDriverModel('m-1')],
          [createDefaultRobotCommandQueueModel('q-1')],
          [createDefaultRobotPathModel('p-1')],
          [createDefaultRobotTelemetryModel('t-1')],
        );
        expect(snap.differentialDriveRobots.length).toBe(1);
        expect(snap.wheelEncoders.length).toBe(1);
        expect(snap.motorDrivers.length).toBe(1);
        expect(snap.robotCommandQueues.length).toBe(1);
        expect(snap.robotPaths.length).toBe(1);
        expect(snap.robotTelemetry.length).toBe(1);
      }
    });

    it('should buildSnapshot rejecting models with empty IDs', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const snap = sync.buildSnapshot(
          [createDefaultDifferentialDriveRobotModel('')],
          [createDefaultWheelEncoderModel('')],
          [createDefaultMotorDriverModel('')],
          [createDefaultRobotCommandQueueModel('')],
          [createDefaultRobotPathModel('')],
          [createDefaultRobotTelemetryModel('')],
        );
        expect(snap.differentialDriveRobots.length).toBe(0);
        expect(snap.wheelEncoders.length).toBe(0);
        expect(snap.motorDrivers.length).toBe(0);
        expect(snap.robotCommandQueues.length).toBe(0);
        expect(snap.robotPaths.length).toBe(0);
        expect(snap.robotTelemetry.length).toBe(0);
      }
    });

    it('should toJSON and fromJSON round-trip correctly', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.differentialDriveRobots.register('d-1', createDefaultDifferentialDriveRobotModel('d-1', { wheelBaseCm: 18 }));
        sync.wheelEncoders.register('e-1', createDefaultWheelEncoderModel('e-1', { tickCount: 42 }));
        sync.motorDrivers.register('m-1', createDefaultMotorDriverModel('m-1', { enableAPWM: 128 }));
        sync.robotCommandQueues.register('q-1', createDefaultRobotCommandQueueModel('q-1'));
        sync.robotPaths.register('p-1', createDefaultRobotPathModel('p-1'));
        sync.robotTelemetry.register('t-1', createDefaultRobotTelemetryModel('t-1'));

        const json = sync.toJSON();
        const sync2 = new DifferentialDriveSynchronizer();
        sync2.fromJSON(json);

        const drive = sync2.differentialDriveRobots.lookup('d-1');
        expect(drive!.wheelBaseCm).toBe(18);
        const enc = sync2.wheelEncoders.lookup('e-1');
        expect(enc!.tickCount).toBe(42);
        const mot = sync2.motorDrivers.lookup('m-1');
        expect(mot!.enableAPWM).toBe(128);
      }
    });

    it('should fromJSON handle null/undefined gracefully', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.differentialDriveRobots.register('d-1', createDefaultDifferentialDriveRobotModel('d-1'));
        sync.fromJSON(null);
        expect(sync.differentialDriveRobots.size).toBe(0);
        sync.fromJSON(undefined);
        expect(sync.differentialDriveRobots.size).toBe(0);
      }
    });

    it('should register/get/remove for command queues and paths', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.robotCommandQueues.clear();
        sync.robotPaths.clear();
        sync.robotCommandQueues.register('q-1', createDefaultRobotCommandQueueModel('q-1'));
        sync.robotPaths.register('p-1', createDefaultRobotPathModel('p-1'));
        expect(sync.robotCommandQueues.lookup('q-1')!.queueId).toBe('q-1');
        expect(sync.robotPaths.lookup('p-1')!.pathId).toBe('p-1');
        sync.robotCommandQueues.remove('q-1');
        sync.robotPaths.remove('p-1');
        expect(sync.robotCommandQueues.has('q-1')).toBe(false);
        expect(sync.robotPaths.has('p-1')).toBe(false);
      }
    });

    it('should register/get/remove for telemetry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.robotTelemetry.clear();
        sync.robotTelemetry.register('t-1', createDefaultRobotTelemetryModel('t-1'));
        expect(sync.robotTelemetry.lookup('t-1')!.telemetryId).toBe('t-1');
        sync.robotTelemetry.remove('t-1');
        expect(sync.robotTelemetry.has('t-1')).toBe(false);
        expect(sync.robotTelemetry.size).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 18: Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('Section 18: Clone Safety', () => {
    it('should deep-copy isolate DifferentialDriveRobotModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultDifferentialDriveRobotModel('d-1');
        sync.differentialDriveRobots.register('d-1', model);
        const retrieved = sync.differentialDriveRobots.lookup('d-1')!;
        retrieved.wheelBaseCm = 999;
        const again = sync.differentialDriveRobots.lookup('d-1')!;
        expect(again.wheelBaseCm).toBe(DEFAULT_DRIVE_WHEEL_BASE_CM);
        expect(again.wheelBaseCm).not.toBe(999);
      }
    });

    it('should deep-copy isolate WheelEncoderModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultWheelEncoderModel('e-1');
        sync.wheelEncoders.register('e-1', model);
        const retrieved = sync.wheelEncoders.lookup('e-1')!;
        retrieved.tickCount = 9999;
        const again = sync.wheelEncoders.lookup('e-1')!;
        expect(again.tickCount).toBe(0);
      }
    });

    it('should deep-copy isolate MotorDriverModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultMotorDriverModel('m-1');
        sync.motorDrivers.register('m-1', model);
        const retrieved = sync.motorDrivers.lookup('m-1')!;
        retrieved.enableAPWM = 999;
        const again = sync.motorDrivers.lookup('m-1')!;
        expect(again.enableAPWM).toBe(0);
      }
    });

    it('should deep-copy isolate RobotCommandQueueModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultRobotCommandQueueModel('q-1');
        sync.robotCommandQueues.register('q-1', model);
        const retrieved = sync.robotCommandQueues.lookup('q-1')!;
        retrieved.currentIndex = 999;
        const again = sync.robotCommandQueues.lookup('q-1')!;
        expect(again.currentIndex).toBe(0);
      }
    });

    it('should deep-copy isolate RobotPathModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultRobotPathModel('p-1');
        sync.robotPaths.register('p-1', model);
        const retrieved = sync.robotPaths.lookup('p-1')!;
        retrieved.waypoints.push({ x: 1, y: 2, headingDeg: 0, timestamp: 0 });
        const again = sync.robotPaths.lookup('p-1')!;
        expect(again.waypoints.length).toBe(0);
      }
    });

    it('should deep-copy isolate RobotTelemetryModel in registry', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        const model = createDefaultRobotTelemetryModel('t-1');
        sync.robotTelemetry.register('t-1', model);
        const retrieved = sync.robotTelemetry.lookup('t-1')!;
        retrieved.positionX = 999;
        const again = sync.robotTelemetry.lookup('t-1')!;
        expect(again.positionX).toBe(0);
      }
    });

    it('should clone synchronizer producing a fully independent copy', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const sync = new DifferentialDriveSynchronizer();
        sync.differentialDriveRobots.register('d-1', createDefaultDifferentialDriveRobotModel('d-1'));
        sync.wheelEncoders.register('e-1', createDefaultWheelEncoderModel('e-1'));
        const cloned = sync.clone();
        cloned.differentialDriveRobots.remove('d-1');
        expect(sync.differentialDriveRobots.has('d-1')).toBe(true);
        expect(cloned.differentialDriveRobots.has('d-1')).toBe(false);
        expect(cloned.wheelEncoders.has('e-1')).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 19: Lifecycle & Constants
  // ═══════════════════════════════════════════════════════════════

  describe('Section 19: Lifecycle & Constants', () => {
    it('should export DEFAULT_ENCODER_TICKS_PER_REV as 20', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_ENCODER_TICKS_PER_REV).toBe(20);
      }
    });

    it('should export DEFAULT_WHEEL_DIAMETER_CM as 6.6', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_WHEEL_DIAMETER_CM).toBe(6.6);
      }
    });

    it('should export DEFAULT_DRIVE_WHEEL_BASE_CM as 14', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_DRIVE_WHEEL_BASE_CM).toBe(14);
      }
    });

    it('should export DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC as 25', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_MAX_DRIVE_SPEED_CM_PER_SEC).toBe(25);
      }
    });

    it('should export DEFAULT_MOTOR_PWM_MAX as 255', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_MOTOR_PWM_MAX).toBe(255);
      }
    });

    it('should export DEFAULT_BATTERY_VOLTAGE as 7.4', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_BATTERY_VOLTAGE).toBe(7.4);
      }
    });

    it('should export VALID_* arrays with correct values and lengths', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(VALID_MOTOR_DIRECTIONS).toEqual(['FORWARD', 'BACKWARD', 'BRAKE', 'COAST']);
        expect(VALID_MOTOR_DIRECTIONS.length).toBe(4);

        expect(VALID_DRIVE_STATES).toEqual(['IDLE', 'DRIVING', 'TURNING', 'QUEUED', 'COMPLETED', 'ERROR']);
        expect(VALID_DRIVE_STATES.length).toBe(6);

        expect(VALID_ENCODER_STATES).toEqual(['IDLE', 'COUNTING', 'OVERFLOW', 'RESET']);
        expect(VALID_ENCODER_STATES.length).toBe(4);

        expect(VALID_DRIVE_COMMAND_TYPES).toEqual(['MOVE_FORWARD', 'MOVE_BACKWARD', 'TURN_LEFT', 'TURN_RIGHT', 'STOP', 'WAIT']);
        expect(VALID_DRIVE_COMMAND_TYPES.length).toBe(6);

        expect(VALID_ENCODER_SIDES).toEqual(['LEFT', 'RIGHT']);
        expect(VALID_ENCODER_SIDES.length).toBe(2);
      }
    });

    it('should export DEFAULT_MAX_WAYPOINTS as 1000 and DEFAULT_TELEMETRY_INTERVAL_MS as 100', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        expect(DEFAULT_MAX_WAYPOINTS).toBe(1000);
        expect(DEFAULT_TELEMETRY_INTERVAL_MS).toBe(100);
      }
    });
  });

});
