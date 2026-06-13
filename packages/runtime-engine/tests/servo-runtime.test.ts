/**
 * Phase 22B: SG90 Servo Motor Full Virtual Simulation — Foundation Tests
 *
 * Tests all factories, validators, duplicate validators, PWM mapping,
 * motion engine, state machine, simulation engine, and ServoSynchronizer.
 *
 * Target: 50,000+ assertions via iteration-based stress testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Constants
  SG90_MIN_PULSE_US,
  SG90_MAX_PULSE_US,
  SG90_MIN_ANGLE_DEG,
  SG90_MAX_ANGLE_DEG,
  SG90_DEFAULT_FREQUENCY_HZ,
  SG90_MAX_SPEED_DEG_PER_SEC,
  SG90_STALL_TORQUE_KG_CM,
  SG90_OPERATING_VOLTAGE_V,
  SG90_DEADBAND_US,
  SG90_PWM_PERIOD_US,
  VALID_SERVO_STATES,
  VALID_SERVO_DIRECTIONS,
  // Factories
  createDefaultServoMotorModel,
  createDefaultServoPositionModel,
  createDefaultServoMotionModel,
  createDefaultServoConstraintModel,
  createDefaultServoAnimationModel,
  // Validators
  validateServoMotorModel,
  validateServoPositionModel,
  validateServoMotionModel,
  validateServoConstraintModel,
  validateServoAnimationModel,
  // Duplicate Validators
  validateDuplicateServoIds,
  validateDuplicatePositionIds,
  validateDuplicateMotionIds,
  validateDuplicateConstraintIds,
  validateDuplicateAnimationIds,
  // PWM Mapping
  dutyCycleToPulseWidthUs,
  pulseWidthToAngle,
  angleToPulseWidthUs,
  pwmDutyCycleToAngle,
  clampAngle,
  // Motion Engine
  computeDirection,
  computeMotion,
  stepMotion,
  isMotionComplete,
  // State Machine
  attachServo,
  detachServo,
  writeAngle,
  updateServoFromMotion,
  readAngle,
  resetServo,
  // Simulation
  simulateServoFromPWM,
  simulateServoStep,
  // Synchronizer
  ServoSynchronizer,
} from '../src/stage/servo-runtime';

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
} from '../src/types';

// ─── Iteration Counts ─────────────────────────────────────────

const CRUD_ITER = 6000;
const OTHER_ITER = 1500;

// ─── Test Helpers ─────────────────────────────────────────────

function servo(i: number, id?: string, overrides?: Partial<ServoMotorModel>): ServoMotorModel {
  return createDefaultServoMotorModel(id || `servo_${i}`, {
    esp32Id: `esp32_${i % 4}`,
    signalPin: (i * 3) % 40,
    positionX: i * 10,
    positionY: i * 5,
    ...overrides,
  });
}

function position(i: number, id?: string, overrides?: Partial<ServoPositionModel>): ServoPositionModel {
  return createDefaultServoPositionModel(id || `pos_${i}`, {
    servoId: `servo_${i}`,
    angleDeg: (i * 15) % 180,
    pulseWidthUs: 500 + (i % 1900),
    isValid: true,
    ...overrides,
  });
}

function motion(i: number, id?: string, overrides?: Partial<ServoMotionModel>): ServoMotionModel {
  return createDefaultServoMotionModel(id || `motion_${i}`, {
    servoId: `servo_${i}`,
    startAngleDeg: 0,
    endAngleDeg: (i * 15) % 180,
    currentAngleDeg: 0,
    isComplete: false,
    direction: 'CW',
    ...overrides,
  });
}

function constraint(i: number, id?: string, overrides?: Partial<ServoConstraintModel>): ServoConstraintModel {
  return createDefaultServoConstraintModel(id || `constraint_${i}`, {
    servoId: `servo_${i}`,
    ...overrides,
  });
}

function animation(i: number, id?: string, overrides?: Partial<ServoAnimationModel>): ServoAnimationModel {
  return createDefaultServoAnimationModel(id || `anim_${i}`, {
    servoId: `servo_${i}`,
    ...overrides,
  });
}

function makePWMChannel(duty: number, freq: number = 50, res: number = 16): VirtualPWMChannelModel {
  return {
    pwmChannelId: 'pwm_0',
    esp32Id: 'esp32_0',
    channelNumber: 0,
    attachedPinNumber: 5,
    dutyCycle: duty,
    frequency: freq,
    resolution: res,
    maxDutyValue: Math.pow(2, res),
    isActive: true,
    futurePWMHints: {},
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: SG90 Constants', () => {
  it('should have correct min pulse width', () => {
    expect(SG90_MIN_PULSE_US).toBe(500);
  });

  it('should have correct max pulse width', () => {
    expect(SG90_MAX_PULSE_US).toBe(2400);
  });

  it('should have correct min angle', () => {
    expect(SG90_MIN_ANGLE_DEG).toBe(0);
  });

  it('should have correct max angle', () => {
    expect(SG90_MAX_ANGLE_DEG).toBe(180);
  });

  it('should have correct default frequency', () => {
    expect(SG90_DEFAULT_FREQUENCY_HZ).toBe(50);
  });

  it('should have correct max speed', () => {
    expect(SG90_MAX_SPEED_DEG_PER_SEC).toBe(600);
  });

  it('should have correct stall torque', () => {
    expect(SG90_STALL_TORQUE_KG_CM).toBe(1.8);
  });

  it('should have correct operating voltage', () => {
    expect(SG90_OPERATING_VOLTAGE_V).toBe(5.0);
  });

  it('should have correct deadband', () => {
    expect(SG90_DEADBAND_US).toBe(5);
  });

  it('should have correct PWM period', () => {
    expect(SG90_PWM_PERIOD_US).toBe(20000);
  });

  it('should have 6 valid servo states', () => {
    expect(VALID_SERVO_STATES).toHaveLength(6);
    expect(VALID_SERVO_STATES).toContain('DETACHED');
    expect(VALID_SERVO_STATES).toContain('IDLE');
    expect(VALID_SERVO_STATES).toContain('MOVING');
    expect(VALID_SERVO_STATES).toContain('HOLDING');
    expect(VALID_SERVO_STATES).toContain('STALLED');
    expect(VALID_SERVO_STATES).toContain('ERROR');
  });

  it('should have 3 valid directions', () => {
    expect(VALID_SERVO_DIRECTIONS).toHaveLength(3);
    expect(VALID_SERVO_DIRECTIONS).toContain('CW');
    expect(VALID_SERVO_DIRECTIONS).toContain('CCW');
    expect(VALID_SERVO_DIRECTIONS).toContain('NONE');
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Factory Functions', () => {
  describe('createDefaultServoMotorModel', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultServoMotorModel('s1');
      expect(m.servoId).toBe('s1');
      expect(m.esp32Id).toBe('');
      expect(m.servoState).toBe('DETACHED');
      expect(m.currentAngleDeg).toBe(90);
      expect(m.targetAngleDeg).toBe(90);
      expect(m.minAngleDeg).toBe(SG90_MIN_ANGLE_DEG);
      expect(m.maxAngleDeg).toBe(SG90_MAX_ANGLE_DEG);
      expect(m.minPulseWidthUs).toBe(SG90_MIN_PULSE_US);
      expect(m.maxPulseWidthUs).toBe(SG90_MAX_PULSE_US);
      expect(m.frequencyHz).toBe(SG90_DEFAULT_FREQUENCY_HZ);
      expect(m.isAttached).toBe(false);
      expect(m.measurementCount).toBe(0);
      expect(m.futureServoHints).toEqual({});
    });

    it('should apply overrides', () => {
      const m = createDefaultServoMotorModel('s2', {
        esp32Id: 'esp_1',
        signalPin: 5,
        positionX: 100,
      });
      expect(m.servoId).toBe('s2');
      expect(m.esp32Id).toBe('esp_1');
      expect(m.signalPin).toBe(5);
      expect(m.positionX).toBe(100);
    });

    it('should always use provided id', () => {
      const m = createDefaultServoMotorModel('override_test', { servoId: 'wrong' } as any);
      expect(m.servoId).toBe('override_test');
    });

    it(`stress: create ${OTHER_ITER} models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = servo(i);
        expect(m.servoId).toBe(`servo_${i}`);
        expect(m.esp32Id).toBe(`esp32_${i % 4}`);
        expect(m.servoState).toBe('DETACHED');
        expect(m.futureServoHints).toEqual({});
      }
    });
  });

  describe('createDefaultServoPositionModel', () => {
    it('should create a valid model', () => {
      const m = createDefaultServoPositionModel('p1');
      expect(m.positionId).toBe('p1');
      expect(m.angleDeg).toBe(90);
      expect(m.isValid).toBe(false);
      expect(m.futurePositionHints).toEqual({});
    });

    it(`stress: create ${OTHER_ITER} models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = position(i);
        expect(m.positionId).toBe(`pos_${i}`);
        expect(m.isValid).toBe(true);
      }
    });
  });

  describe('createDefaultServoMotionModel', () => {
    it('should create a valid model', () => {
      const m = createDefaultServoMotionModel('m1');
      expect(m.motionId).toBe('m1');
      expect(m.speedDegPerSec).toBe(SG90_MAX_SPEED_DEG_PER_SEC);
      expect(m.direction).toBe('NONE');
      expect(m.isComplete).toBe(true);
      expect(m.futureMotionHints).toEqual({});
    });

    it(`stress: create ${OTHER_ITER} models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = motion(i);
        expect(m.motionId).toBe(`motion_${i}`);
        expect(m.direction).toBe('CW');
      }
    });
  });

  describe('createDefaultServoConstraintModel', () => {
    it('should create a valid model', () => {
      const m = createDefaultServoConstraintModel('c1');
      expect(m.constraintId).toBe('c1');
      expect(m.maxSpeedDegPerSec).toBe(SG90_MAX_SPEED_DEG_PER_SEC);
      expect(m.stallTorqueKgCm).toBe(SG90_STALL_TORQUE_KG_CM);
      expect(m.deadbandUs).toBe(SG90_DEADBAND_US);
      expect(m.isActive).toBe(true);
      expect(m.futureConstraintHints).toEqual({});
    });

    it(`stress: create ${OTHER_ITER} models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = constraint(i);
        expect(m.constraintId).toBe(`constraint_${i}`);
        expect(m.isActive).toBe(true);
      }
    });
  });

  describe('createDefaultServoAnimationModel', () => {
    it('should create a valid model', () => {
      const m = createDefaultServoAnimationModel('a1');
      expect(m.animationId).toBe('a1');
      expect(m.displayAngleDeg).toBe(90);
      expect(m.hornLengthPx).toBe(24);
      expect(m.showTargetIndicator).toBe(true);
      expect(m.futureAnimationHints).toEqual({});
    });

    it(`stress: create ${OTHER_ITER} models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = animation(i);
        expect(m.animationId).toBe(`anim_${i}`);
        expect(m.showAngleLabel).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Validators', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('validateServoMotorModel', () => {
    it('should return no warnings for a valid model', () => {
      expect(validateServoMotorModel(servo(0))).toHaveLength(0);
    });

    it('should warn on null', () => {
      const w = validateServoMotorModel(null as any);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].code).toBe('INVALID_SERVO');
    });

    it('should warn on empty servoId', () => {
      const m = createDefaultServoMotorModel('');
      const w = validateServoMotorModel(m);
      expect(w.some(x => x.code === 'EMPTY_SERVO_ID')).toBe(true);
    });

    it('should warn on empty esp32Id', () => {
      const m = createDefaultServoMotorModel('s1', { esp32Id: '' });
      expect(validateServoMotorModel(m).some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
    });

    it('should warn on negative signalPin', () => {
      const m = servo(0, 's1', { signalPin: -1 });
      expect(validateServoMotorModel(m).some(x => x.code === 'INVALID_SIGNAL_PIN')).toBe(true);
    });

    it('should warn on invalid servoState', () => {
      const m = servo(0, 's1', { servoState: 'INVALID' as ServoState });
      expect(validateServoMotorModel(m).some(x => x.code === 'INVALID_SERVO_STATE')).toBe(true);
    });

    it('should warn on invalid angle range', () => {
      const m = servo(0, 's1', { minAngleDeg: 180, maxAngleDeg: 0 });
      expect(validateServoMotorModel(m).some(x => x.code === 'INVALID_ANGLE_RANGE')).toBe(true);
    });

    it('should warn on invalid frequency', () => {
      const m = servo(0, 's1', { frequencyHz: 0 });
      expect(validateServoMotorModel(m).some(x => x.code === 'INVALID_FREQUENCY')).toBe(true);
    });

    it(`stress: validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateServoMotorModel(servo(i))).toHaveLength(0);
      }
    });
  });

  describe('validateServoPositionModel', () => {
    it('should return no warnings for valid', () => {
      expect(validateServoPositionModel(position(0))).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateServoPositionModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on empty positionId', () => {
      const m = createDefaultServoPositionModel('');
      expect(validateServoPositionModel(m).some(x => x.code === 'EMPTY_POSITION_ID')).toBe(true);
    });

    it(`stress: validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateServoPositionModel(position(i))).toHaveLength(0);
      }
    });
  });

  describe('validateServoMotionModel', () => {
    it('should return no warnings for valid', () => {
      expect(validateServoMotionModel(motion(0))).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateServoMotionModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on negative speed', () => {
      const m = motion(0, 'bad', { speedDegPerSec: -10 });
      expect(validateServoMotionModel(m).some(x => x.code === 'INVALID_SPEED')).toBe(true);
    });

    it('should warn on invalid direction', () => {
      const m = motion(0, 'bad', { direction: 'UP' as ServoDirection });
      expect(validateServoMotionModel(m).some(x => x.code === 'INVALID_DIRECTION')).toBe(true);
    });

    it(`stress: validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateServoMotionModel(motion(i))).toHaveLength(0);
      }
    });
  });

  describe('validateServoConstraintModel', () => {
    it('should return no warnings for valid', () => {
      expect(validateServoConstraintModel(constraint(0))).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateServoConstraintModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on zero max speed', () => {
      const m = constraint(0, 'bad', { maxSpeedDegPerSec: 0 });
      expect(validateServoConstraintModel(m).some(x => x.code === 'INVALID_MAX_SPEED')).toBe(true);
    });

    it('should warn on invalid angle range', () => {
      const m = constraint(0, 'bad', { minAngleDeg: 180, maxAngleDeg: 0 });
      expect(validateServoConstraintModel(m).some(x => x.code === 'INVALID_ANGLE_RANGE')).toBe(true);
    });

    it(`stress: validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateServoConstraintModel(constraint(i))).toHaveLength(0);
      }
    });
  });

  describe('validateServoAnimationModel', () => {
    it('should return no warnings for valid', () => {
      expect(validateServoAnimationModel(animation(0))).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateServoAnimationModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on zero horn length', () => {
      const m = animation(0, 'bad', { hornLengthPx: 0 });
      expect(validateServoAnimationModel(m).some(x => x.code === 'INVALID_HORN_LENGTH')).toBe(true);
    });

    it(`stress: validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateServoAnimationModel(animation(i))).toHaveLength(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Duplicate Validators', () => {
  it('should detect duplicate servo IDs', () => {
    const models = [servo(0, 'dup'), servo(1, 'dup')];
    expect(validateDuplicateServoIds(models).length).toBeGreaterThan(0);
    expect(validateDuplicateServoIds(models)[0].code).toBe('DUPLICATE_SERVO_ID');
  });

  it('should detect no duplicates with unique IDs', () => {
    const models = Array.from({ length: 100 }, (_, i) => servo(i));
    expect(validateDuplicateServoIds(models)).toHaveLength(0);
  });

  it('should detect duplicate position IDs', () => {
    expect(validateDuplicatePositionIds([position(0, 'dup'), position(1, 'dup')]).length).toBeGreaterThan(0);
  });

  it('should detect duplicate motion IDs', () => {
    expect(validateDuplicateMotionIds([motion(0, 'dup'), motion(1, 'dup')]).length).toBeGreaterThan(0);
  });

  it('should detect duplicate constraint IDs', () => {
    expect(validateDuplicateConstraintIds([constraint(0, 'dup'), constraint(1, 'dup')]).length).toBeGreaterThan(0);
  });

  it('should detect duplicate animation IDs', () => {
    expect(validateDuplicateAnimationIds([animation(0, 'dup'), animation(1, 'dup')]).length).toBeGreaterThan(0);
  });

  it(`stress: ${OTHER_ITER} unique pairs with 0 duplicates`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      expect(validateDuplicateServoIds([servo(i, `a_${i}`), servo(i, `b_${i}`)])).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PWM → ANGLE MAPPING
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: PWM → Angle Mapping', () => {
  describe('dutyCycleToPulseWidthUs', () => {
    it('should compute correct pulse width for 50Hz 16-bit', () => {
      // At 50Hz, period = 20000μs. Duty = 1638/65536 ≈ 2.5% → 500μs
      const pw = dutyCycleToPulseWidthUs(1638, 50, 16);
      expect(pw).toBeCloseTo(500, -1);
    });

    it('should compute correct pulse width for mid-range', () => {
      // Duty 4915/65536 ≈ 7.5% → 1500μs (90° position)
      const pw = dutyCycleToPulseWidthUs(4915, 50, 16);
      expect(pw).toBeCloseTo(1500, -1);
    });

    it('should return 0 for zero frequency', () => {
      expect(dutyCycleToPulseWidthUs(1000, 0, 16)).toBe(0);
    });

    it('should return 0 for zero resolution', () => {
      expect(dutyCycleToPulseWidthUs(1000, 50, 0)).toBe(0);
    });

    it(`stress: ${OTHER_ITER} conversions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const duty = (i * 8) % 65536;
        const pw = dutyCycleToPulseWidthUs(duty, 50, 16);
        expect(pw).toBeGreaterThanOrEqual(0);
        expect(pw).toBeLessThanOrEqual(20000);
      }
    });
  });

  describe('pulseWidthToAngle', () => {
    it('should return 0° for min pulse', () => {
      expect(pulseWidthToAngle(500)).toBeCloseTo(0, 1);
    });

    it('should return 180° for max pulse', () => {
      expect(pulseWidthToAngle(2400)).toBeCloseTo(180, 1);
    });

    it('should return 90° for mid pulse', () => {
      const midPulse = (500 + 2400) / 2;
      expect(pulseWidthToAngle(midPulse)).toBeCloseTo(90, 1);
    });

    it('should clamp below min', () => {
      expect(pulseWidthToAngle(0)).toBe(0);
    });

    it('should clamp above max', () => {
      expect(pulseWidthToAngle(5000)).toBe(180);
    });

    it(`stress: ${OTHER_ITER} conversions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const pw = 500 + (i / OTHER_ITER) * 1900;
        const angle = pulseWidthToAngle(pw);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('angleToPulseWidthUs', () => {
    it('should return min pulse for 0°', () => {
      expect(angleToPulseWidthUs(0)).toBeCloseTo(500, 1);
    });

    it('should return max pulse for 180°', () => {
      expect(angleToPulseWidthUs(180)).toBeCloseTo(2400, 1);
    });

    it('should be inverse of pulseWidthToAngle', () => {
      for (let a = 0; a <= 180; a += 10) {
        const pw = angleToPulseWidthUs(a);
        const back = pulseWidthToAngle(pw);
        expect(back).toBeCloseTo(a, 5);
      }
    });

    it(`stress: round-trip ${OTHER_ITER} values`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const angle = (i / OTHER_ITER) * 180;
        const pw = angleToPulseWidthUs(angle);
        const back = pulseWidthToAngle(pw);
        expect(back).toBeCloseTo(angle, 5);
      }
    });
  });

  describe('pwmDutyCycleToAngle', () => {
    it('should convert duty cycle directly to angle', () => {
      // Duty for ~500μs at 50Hz 16-bit: 500/20000 * 65536 ≈ 1638
      const angle = pwmDutyCycleToAngle(1638, 50, 16);
      expect(angle).toBeCloseTo(0, 0);
    });

    it('should convert mid-range duty to ~90°', () => {
      const midPulse = (500 + 2400) / 2; // 1450μs
      const duty = (midPulse / 20000) * 65536;
      const angle = pwmDutyCycleToAngle(duty, 50, 16);
      expect(angle).toBeCloseTo(90, 0);
    });

    it(`stress: ${OTHER_ITER} conversions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const angle = (i / OTHER_ITER) * 180;
        const pw = angleToPulseWidthUs(angle);
        const duty = (pw / 20000) * 65536;
        const back = pwmDutyCycleToAngle(duty, 50, 16);
        expect(back).toBeCloseTo(angle, 0);
      }
    });
  });

  describe('clampAngle', () => {
    it('should clamp below min', () => {
      expect(clampAngle(-10, 0, 180)).toBe(0);
    });

    it('should clamp above max', () => {
      expect(clampAngle(200, 0, 180)).toBe(180);
    });

    it('should pass through valid angles', () => {
      expect(clampAngle(90, 0, 180)).toBe(90);
    });

    it(`stress: ${OTHER_ITER} clamps`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const raw = -50 + (i / OTHER_ITER) * 300;
        const clamped = clampAngle(raw, 0, 180);
        expect(clamped).toBeGreaterThanOrEqual(0);
        expect(clamped).toBeLessThanOrEqual(180);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// MOTION ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Motion Engine', () => {
  describe('computeDirection', () => {
    it('CW for increasing angle', () => {
      expect(computeDirection(0, 90)).toBe('CW');
    });

    it('CCW for decreasing angle', () => {
      expect(computeDirection(90, 0)).toBe('CCW');
    });

    it('NONE for same angle', () => {
      expect(computeDirection(90, 90)).toBe('NONE');
    });

    it(`stress: ${OTHER_ITER} directions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const from = (i * 7) % 180;
        const to = (i * 11) % 180;
        const d = computeDirection(from, to);
        expect(VALID_SERVO_DIRECTIONS).toContain(d);
      }
    });
  });

  describe('computeMotion', () => {
    it('should create motion from 0 to 180', () => {
      const s = servo(0, 'test', { currentAngleDeg: 0 });
      const m = computeMotion(s, 180, 1000);
      expect(m.servoId).toBe('test');
      expect(m.startAngleDeg).toBe(0);
      expect(m.endAngleDeg).toBe(180);
      expect(m.direction).toBe('CW');
      expect(m.isComplete).toBe(false);
      expect(m.estimatedDurationMs).toBeCloseTo(300, -1); // 180/600 * 1000
    });

    it('should mark as complete for zero delta', () => {
      const s = servo(0, 'test', { currentAngleDeg: 90 });
      const m = computeMotion(s, 90, 1000);
      expect(m.isComplete).toBe(true);
      expect(m.direction).toBe('NONE');
    });

    it('should clamp to max angle', () => {
      const s = servo(0, 'test', { currentAngleDeg: 0, maxAngleDeg: 180 });
      const m = computeMotion(s, 200, 1000);
      expect(m.endAngleDeg).toBe(180);
    });

    it('should not mutate input', () => {
      const s = servo(0, 'test', { currentAngleDeg: 45 });
      const original = JSON.parse(JSON.stringify(s));
      computeMotion(s, 135, 1000);
      expect(s).toEqual(original);
    });

    it(`stress: ${OTHER_ITER} motions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i, `s_${i}`, { currentAngleDeg: i % 180 });
        const target = (i * 7) % 180;
        const m = computeMotion(s, target, i * 100);
        expect(m.servoId).toBe(`s_${i}`);
        if (Math.abs(target - (i % 180)) >= 0.01) {
          expect(m.isComplete).toBe(false);
        }
      }
    });
  });

  describe('stepMotion', () => {
    it('should advance position over time', () => {
      const s = servo(0, 'test', { currentAngleDeg: 0 });
      const m = computeMotion(s, 180, 1000, 600);
      // After 150ms → should be at 90° (600°/s × 0.15s = 90°)
      const stepped = stepMotion(m, 150);
      expect(stepped.currentAngleDeg).toBeCloseTo(90, 0);
      expect(stepped.isComplete).toBe(false);
    });

    it('should complete when reaching target', () => {
      const s = servo(0, 'test', { currentAngleDeg: 0 });
      const m = computeMotion(s, 60, 1000, 600);
      // After 200ms → 600°/s × 0.2s = 120° > 60° → complete
      const stepped = stepMotion(m, 200);
      expect(stepped.isComplete).toBe(true);
      expect(stepped.currentAngleDeg).toBeCloseTo(60, 0);
    });

    it('should not advance when already complete', () => {
      const m = motion(0, 'done', { isComplete: true, currentAngleDeg: 90 });
      const stepped = stepMotion(m, 100);
      expect(stepped.currentAngleDeg).toBe(90);
      expect(stepped.isComplete).toBe(true);
    });

    it('should not mutate input', () => {
      const s = servo(0, 'test', { currentAngleDeg: 0 });
      const m = computeMotion(s, 180, 1000);
      const original = JSON.parse(JSON.stringify(m));
      stepMotion(m, 50);
      expect(m).toEqual(original);
    });

    it(`stress: ${OTHER_ITER} steps`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i, `s_${i}`, { currentAngleDeg: 0 });
        const m = computeMotion(s, 180, i * 100, 600);
        const stepped = stepMotion(m, 10 + (i % 500));
        expect(stepped.currentAngleDeg).toBeGreaterThanOrEqual(0);
        expect(stepped.currentAngleDeg).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('isMotionComplete', () => {
    it('should return true when complete', () => {
      expect(isMotionComplete(motion(0, 'm', { isComplete: true }))).toBe(true);
    });

    it('should return false when not complete', () => {
      expect(isMotionComplete(motion(0, 'm', { isComplete: false }))).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Servo State Machine', () => {
  describe('attachServo', () => {
    it('DETACHED → IDLE', () => {
      const s = servo(0, 'test');
      const attached = attachServo(s, 'pwm_0');
      expect(attached.servoState).toBe('IDLE');
      expect(attached.isAttached).toBe(true);
      expect(attached.pwmChannelId).toBe('pwm_0');
    });

    it('already IDLE → stays IDLE', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true });
      const attached = attachServo(s);
      expect(attached.servoState).toBe('IDLE');
    });

    it('ERROR → IDLE', () => {
      const s = servo(0, 'test', { servoState: 'ERROR' });
      const attached = attachServo(s, 'pwm_1');
      expect(attached.servoState).toBe('IDLE');
      expect(attached.isAttached).toBe(true);
    });

    it('should not mutate input', () => {
      const s = servo(0, 'test');
      const original = JSON.parse(JSON.stringify(s));
      attachServo(s, 'pwm_0');
      expect(s).toEqual(original);
    });

    it(`stress: ${OTHER_ITER} attaches`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i);
        const a = attachServo(s, `pwm_${i}`);
        expect(a.servoState).toBe('IDLE');
        expect(a.isAttached).toBe(true);
        expect(s.servoState).toBe('DETACHED');
      }
    });
  });

  describe('detachServo', () => {
    it('should detach from any state', () => {
      for (const state of VALID_SERVO_STATES) {
        const s = servo(0, 'test', { servoState: state as ServoState, isAttached: true });
        const detached = detachServo(s);
        expect(detached.servoState).toBe('DETACHED');
        expect(detached.isAttached).toBe(false);
      }
    });
  });

  describe('writeAngle', () => {
    it('should set target and state to MOVING', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });
      const written = writeAngle(s, 90, 1000);
      expect(written.targetAngleDeg).toBe(90);
      expect(written.servoState).toBe('MOVING');
      expect(written.measurementCount).toBe(1);
    });

    it('should set HOLDING when already at target', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
      const written = writeAngle(s, 90, 1000);
      expect(written.servoState).toBe('HOLDING');
    });

    it('should not write to DETACHED servo', () => {
      const s = servo(0, 'test'); // DETACHED
      const written = writeAngle(s, 90);
      expect(written.servoState).toBe('DETACHED');
    });

    it('should clamp angle to range', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });
      const written = writeAngle(s, 200);
      expect(written.targetAngleDeg).toBe(180);
    });

    it(`stress: ${OTHER_ITER} writes`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i, `s_${i}`, { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
        const angle = (i * 13) % 200;
        const written = writeAngle(s, angle, i * 100);
        expect(written.targetAngleDeg).toBeGreaterThanOrEqual(0);
        expect(written.targetAngleDeg).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('updateServoFromMotion', () => {
    it('should update angle and state from motion', () => {
      const s = servo(0, 'test', { servoState: 'MOVING', currentAngleDeg: 0 });
      const m = motion(0, 'test_motion', { currentAngleDeg: 45, isComplete: false });
      const updated = updateServoFromMotion(s, m);
      expect(updated.currentAngleDeg).toBe(45);
      expect(updated.servoState).toBe('MOVING');
    });

    it('should set HOLDING when motion complete', () => {
      const s = servo(0, 'test', { servoState: 'MOVING', currentAngleDeg: 0 });
      const m = motion(0, 'test_motion', { currentAngleDeg: 90, isComplete: true });
      const updated = updateServoFromMotion(s, m);
      expect(updated.currentAngleDeg).toBe(90);
      expect(updated.servoState).toBe('HOLDING');
    });
  });

  describe('readAngle', () => {
    it('should return current angle', () => {
      const s = servo(0, 'test', { currentAngleDeg: 42 });
      expect(readAngle(s)).toBe(42);
    });
  });

  describe('resetServo', () => {
    it('should reset to DETACHED with default angle', () => {
      const s = servo(0, 'test', {
        servoState: 'HOLDING',
        isAttached: true,
        currentAngleDeg: 135,
        targetAngleDeg: 135,
        measurementCount: 10,
      });
      const reset = resetServo(s);
      expect(reset.servoState).toBe('DETACHED');
      expect(reset.isAttached).toBe(false);
      expect(reset.currentAngleDeg).toBe(90);
      expect(reset.targetAngleDeg).toBe(90);
      expect(reset.measurementCount).toBe(0);
    });

    it('should preserve identity', () => {
      const s = servo(0, 'test', { esp32Id: 'esp_1', signalPin: 5 });
      const reset = resetServo(s);
      expect(reset.servoId).toBe('test');
      expect(reset.esp32Id).toBe('esp_1');
      expect(reset.signalPin).toBe(5);
    });

    it('should not mutate input', () => {
      const s = servo(0, 'test', { servoState: 'HOLDING', measurementCount: 5 });
      const original = JSON.parse(JSON.stringify(s));
      resetServo(s);
      expect(s).toEqual(original);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Simulation Engine', () => {
  describe('simulateServoFromPWM', () => {
    it('should compute angle from PWM duty cycle', () => {
      const s = servo(0, 'test', {
        servoState: 'IDLE', isAttached: true, currentAngleDeg: 0,
      });
      // Duty for 1450μs (mid) at 50Hz 16-bit: 1450/20000 * 65536 ≈ 4751
      const pwm = makePWMChannel(4751);
      const result = simulateServoFromPWM(s, pwm, null, 1000);
      expect(result.servo.servoState).not.toBe('DETACHED');
      expect(result.position.isValid).toBe(true);
      expect(result.position.angleDeg).toBeCloseTo(90, 0);
    });

    it('should handle null PWM channel', () => {
      const s = servo(0, 'test');
      const result = simulateServoFromPWM(s, null, null, 1000);
      expect(result.position.isValid).toBe(false);
    });

    it('should handle inactive PWM channel', () => {
      const s = servo(0, 'test');
      const pwm = makePWMChannel(4751);
      pwm.isActive = false;
      const result = simulateServoFromPWM(s, pwm, null, 1000);
      expect(result.position.isValid).toBe(false);
    });

    it('should respect constraints', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });
      const c = constraint(0, 'c1', { servoId: 'test', minAngleDeg: 30, maxAngleDeg: 150, isActive: true });
      // Duty for 500μs (0°) — but constrained to 30°
      const pwm = makePWMChannel(1638);
      const result = simulateServoFromPWM(s, pwm, c, 1000);
      expect(result.position.angleDeg).toBeGreaterThanOrEqual(30);
    });

    it('should not mutate input', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });
      const original = JSON.parse(JSON.stringify(s));
      const pwm = makePWMChannel(4751);
      simulateServoFromPWM(s, pwm, null, 1000);
      expect(s).toEqual(original);
    });

    it('should record duty cycle on servo', () => {
      const s = servo(0, 'test', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });
      const pwm = makePWMChannel(3000);
      const result = simulateServoFromPWM(s, pwm, null, 1000);
      expect(result.servo.lastPWMDutyCycle).toBe(3000);
    });

    it(`stress: ${OTHER_ITER} PWM simulations`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i, `s_${i}`, { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
        const duty = 1638 + (i % 5500);
        const pwm = makePWMChannel(duty);
        const result = simulateServoFromPWM(s, pwm, null, i * 100);
        expect(result.position.angleDeg).toBeGreaterThanOrEqual(0);
        expect(result.position.angleDeg).toBeLessThanOrEqual(180);
        expect(result.position.isValid).toBe(true);
      }
    });
  });

  describe('simulateServoStep', () => {
    it('should advance servo position', () => {
      const s = servo(0, 'test', { servoState: 'MOVING', currentAngleDeg: 0, targetAngleDeg: 180 });
      const m = computeMotion(
        { ...s, currentAngleDeg: 0 } as ServoMotorModel,
        180, 1000, 600,
      );
      const result = simulateServoStep(s, m, 100);
      expect(result.servo.currentAngleDeg).toBeGreaterThan(0);
      expect(result.motion.elapsedMs).toBe(100);
    });

    it('should set HOLDING on completion', () => {
      const s = servo(0, 'test', { servoState: 'MOVING', currentAngleDeg: 0, targetAngleDeg: 60 });
      const m = computeMotion(
        { ...s, currentAngleDeg: 0 } as ServoMotorModel,
        60, 1000, 600,
      );
      const result = simulateServoStep(s, m, 500); // More than enough time
      expect(result.servo.servoState).toBe('HOLDING');
      expect(result.motion.isComplete).toBe(true);
    });

    it(`stress: ${OTHER_ITER} steps`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = servo(i, `s_${i}`, { servoState: 'MOVING', currentAngleDeg: 0 });
        const target = (i * 13) % 180;
        const m = computeMotion(s, target, i * 100, 600);
        const result = simulateServoStep(s, m, 10 + (i % 200));
        expect(result.servo.currentAngleDeg).toBeGreaterThanOrEqual(0);
        expect(result.servo.currentAngleDeg).toBeLessThanOrEqual(180);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SERVO SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: ServoSynchronizer', () => {
  let sync: ServoSynchronizer;

  beforeEach(() => {
    sync = new ServoSynchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('buildSnapshot', () => {
    it('should register all valid models', () => {
      const snap = sync.buildSnapshot(
        [servo(0), servo(1)],
        [position(0)],
        [motion(0)],
        [constraint(0)],
        [animation(0)],
      );
      expect(snap.servos).toHaveLength(2);
      expect(snap.positions).toHaveLength(1);
      expect(snap.motions).toHaveLength(1);
      expect(snap.constraints).toHaveLength(1);
      expect(snap.animations).toHaveLength(1);
    });

    it('should clear previous state', () => {
      sync.buildSnapshot([servo(0)], [], [], [], []);
      expect(sync.servos.size).toBe(1);
      sync.buildSnapshot([], [], [], [], []);
      expect(sync.servos.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should empty all registries', () => {
      sync.buildSnapshot([servo(0)], [position(0)], [motion(0)], [constraint(0)], [animation(0)]);
      sync.clear();
      expect(sync.servos.size).toBe(0);
      expect(sync.positions.size).toBe(0);
      expect(sync.motions.size).toBe(0);
      expect(sync.constraints.size).toBe(0);
      expect(sync.animations.size).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      sync.buildSnapshot([servo(0)], [], [], [], []);
      const cloned = sync.clone();
      expect(cloned.servos.size).toBe(1);
      sync.clear();
      expect(sync.servos.size).toBe(0);
      expect(cloned.servos.size).toBe(1);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should round-trip all data', () => {
      sync.buildSnapshot(
        [servo(0), servo(1), servo(2)],
        [position(0)],
        [motion(0)],
        [constraint(0), constraint(1)],
        [animation(0)],
      );
      const json = sync.toJSON();
      const restored = new ServoSynchronizer();
      restored.fromJSON(json);
      expect(restored.servos.size).toBe(3);
      expect(restored.positions.size).toBe(1);
      expect(restored.motions.size).toBe(1);
      expect(restored.constraints.size).toBe(2);
      expect(restored.animations.size).toBe(1);
    });

    it('should handle null json', () => {
      sync.buildSnapshot([servo(0)], [], [], [], []);
      sync.fromJSON(null as any);
      expect(sync.servos.size).toBe(0);
    });

    it(`stress: ${OTHER_ITER} round-trips`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = new ServoSynchronizer();
        s.buildSnapshot(
          [servo(i)], [position(i)], [motion(i)], [constraint(i)], [animation(i)],
        );
        const json = s.toJSON();
        const r = new ServoSynchronizer();
        r.fromJSON(json);
        expect(r.servos.size).toBe(1);
        expect(r.positions.size).toBe(1);
        expect(r.motions.size).toBe(1);
        expect(r.constraints.size).toBe(1);
        expect(r.animations.size).toBe(1);
      }
    });
  });

  describe('registry CRUD stress', () => {
    it(`register + lookup: ${CRUD_ITER} servos`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const s = servo(i);
        sync.servos.register(s.servoId, s);
        const found = sync.servos.lookup(s.servoId);
        expect(found).toBeDefined();
        expect(found!.servoId).toBe(s.servoId);
      }
    });

    it(`register + lookup: ${CRUD_ITER} positions`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const p = position(i);
        sync.positions.register(p.positionId, p);
        expect(sync.positions.lookup(p.positionId)).toBeDefined();
      }
    });

    it(`register + lookup: ${CRUD_ITER} motions`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const m = motion(i);
        sync.motions.register(m.motionId, m);
        expect(sync.motions.lookup(m.motionId)).toBeDefined();
      }
    });

    it(`register + lookup: ${CRUD_ITER} constraints`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const c = constraint(i);
        sync.constraints.register(c.constraintId, c);
        expect(sync.constraints.lookup(c.constraintId)).toBeDefined();
      }
    });

    it(`register + lookup: ${CRUD_ITER} animations`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const a = animation(i);
        sync.animations.register(a.animationId, a);
        expect(sync.animations.lookup(a.animationId)).toBeDefined();
      }
    });

    it(`update: ${CRUD_ITER} servos`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const s = servo(i);
        sync.servos.register(s.servoId, s);
        sync.servos.update(s.servoId, { currentAngleDeg: i % 180 });
        const found = sync.servos.lookup(s.servoId);
        expect(found!.currentAngleDeg).toBe(i % 180);
      }
    });

    it(`remove: ${CRUD_ITER} servos`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.servos.register(`servo_${i}`, servo(i));
      }
      expect(sync.servos.size).toBe(CRUD_ITER);
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.servos.remove(`servo_${i}`);
      }
      expect(sync.servos.size).toBe(0);
    });

    it(`has + keys: ${CRUD_ITER} constraints`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const c = constraint(i);
        sync.constraints.register(c.constraintId, c);
        expect(sync.constraints.has(c.constraintId)).toBe(true);
      }
      expect(sync.constraints.keys()).toHaveLength(CRUD_ITER);
    });

    it(`getAll: ${CRUD_ITER} animations`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.animations.register(`anim_${i}`, animation(i));
      }
      const all = sync.animations.getAll();
      expect(all).toHaveLength(CRUD_ITER);
      all[0].displayAngleDeg = -9999;
      const orig = sync.animations.lookup('anim_0');
      expect(orig!.displayAngleDeg).not.toBe(-9999);
    });

    it(`clear: ${CRUD_ITER} motions`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.motions.register(`motion_${i}`, motion(i));
      }
      expect(sync.motions.size).toBe(CRUD_ITER);
      sync.motions.clear();
      expect(sync.motions.size).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: Full Servo Cycle
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Integration — Full Servo Cycle', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should complete: place → attach → write → read', () => {
    let s = servo(0, 'sg90_1', {
      esp32Id: 'esp_main', signalPin: 5, currentAngleDeg: 90,
    });
    // Attach
    s = attachServo(s, 'pwm_0');
    expect(s.servoState).toBe('IDLE');
    expect(s.isAttached).toBe(true);

    // Write 0°
    s = writeAngle(s, 0, 1000);
    expect(s.targetAngleDeg).toBe(0);
    expect(s.servoState).toBe('MOVING');

    // Create and step motion
    const m = computeMotion({ ...s, currentAngleDeg: 90 } as ServoMotorModel, 0, 1000, 600);
    const result = simulateServoStep(s, m, 300); // 600°/s × 0.3s = 180° → complete
    expect(result.servo.servoState).toBe('HOLDING');
    expect(result.servo.currentAngleDeg).toBeCloseTo(0, 0);

    // Read
    expect(readAngle(result.servo)).toBeCloseTo(0, 0);
  });

  it('should handle 0° → 90° → 180° sequence', () => {
    let s = servo(0, 'sweep', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 0 });

    // Write 90°
    s = writeAngle(s, 90, 1000);
    let m = computeMotion({ ...s, currentAngleDeg: 0 } as ServoMotorModel, 90, 1000);
    let result = simulateServoStep(s, m, 500);
    expect(result.servo.servoState).toBe('HOLDING');
    expect(result.servo.currentAngleDeg).toBeCloseTo(90, 0);

    // Write 180°
    s = writeAngle(result.servo, 180, 2000);
    m = computeMotion({ ...s, currentAngleDeg: result.servo.currentAngleDeg } as ServoMotorModel, 180, 2000);
    result = simulateServoStep(s, m, 500);
    expect(result.servo.servoState).toBe('HOLDING');
    expect(result.servo.currentAngleDeg).toBeCloseTo(180, 0);
  });

  it('should handle PWM-driven servo cycle', () => {
    const s = servo(0, 'pwm_test', {
      servoState: 'IDLE', isAttached: true, currentAngleDeg: 90,
    });

    // 0° = 500μs → duty = 500/20000 * 65536 ≈ 1638
    const pwm0 = makePWMChannel(1638);
    const r0 = simulateServoFromPWM(s, pwm0, null, 1000);
    expect(r0.position.angleDeg).toBeCloseTo(0, 0);

    // 90° = 1450μs → duty = 1450/20000 * 65536 ≈ 4751
    const pwm90 = makePWMChannel(4751);
    const r90 = simulateServoFromPWM(s, pwm90, null, 2000);
    expect(r90.position.angleDeg).toBeCloseTo(90, 0);

    // 180° = 2400μs → duty = 2400/20000 * 65536 ≈ 7864
    const pwm180 = makePWMChannel(7864);
    const r180 = simulateServoFromPWM(s, pwm180, null, 3000);
    expect(r180.position.angleDeg).toBeCloseTo(180, 0);
  });

  it('should handle detach during motion', () => {
    let s = servo(0, 'detach_test', {
      servoState: 'MOVING', isAttached: true, currentAngleDeg: 45,
    });
    s = detachServo(s);
    expect(s.servoState).toBe('DETACHED');
    expect(s.isAttached).toBe(false);
  });

  it(`stress: ${OTHER_ITER} full cycles`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      let s = servo(i, `cycle_${i}`, { currentAngleDeg: 90 });
      s = attachServo(s, `pwm_${i}`);
      const angle = (i * 13) % 180;
      s = writeAngle(s, angle, i * 100);
      const m = computeMotion({ ...s, currentAngleDeg: 90 } as ServoMotorModel, angle, i * 100);
      const r = simulateServoStep(s, m, 500);
      expect(r.servo.servoState).toBe('HOLDING');
      expect(readAngle(r.servo)).toBeCloseTo(angle, 0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION ROUND-TRIP
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Serialization Round-Trip', () => {
  it('should preserve all data through JSON round-trip', () => {
    const original: ServoSimulationSnapshot = {
      servos: [servo(0), servo(1)],
      positions: [position(0)],
      motions: [motion(0)],
      constraints: [constraint(0), constraint(1)],
      animations: [animation(0)],
    };
    const json = JSON.stringify(original);
    const restored: ServoSimulationSnapshot = JSON.parse(json);
    expect(restored.servos).toHaveLength(2);
    expect(restored.positions).toHaveLength(1);
    expect(restored.motions).toHaveLength(1);
    expect(restored.constraints).toHaveLength(2);
    expect(restored.animations).toHaveLength(1);
    expect(restored.servos[0].servoId).toBe(original.servos[0].servoId);
  });

  it(`stress: ${OTHER_ITER} round-trips`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      const snap: ServoSimulationSnapshot = {
        servos: [servo(i)],
        positions: [position(i)],
        motions: [motion(i)],
        constraints: [constraint(i)],
        animations: [animation(i)],
      };
      const restored = JSON.parse(JSON.stringify(snap)) as ServoSimulationSnapshot;
      expect(restored.servos[0].servoId).toBe(`servo_${i}`);
      expect(restored.positions[0].positionId).toBe(`pos_${i}`);
      expect(restored.motions[0].motionId).toBe(`motion_${i}`);
      expect(restored.constraints[0].constraintId).toBe(`constraint_${i}`);
      expect(restored.animations[0].animationId).toBe(`anim_${i}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Phase 22B: Edge Cases', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should handle write to exact min angle', () => {
    const s = servo(0, 'min', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
    const written = writeAngle(s, 0);
    expect(written.targetAngleDeg).toBe(0);
  });

  it('should handle write to exact max angle', () => {
    const s = servo(0, 'max', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
    const written = writeAngle(s, 180);
    expect(written.targetAngleDeg).toBe(180);
  });

  it('should handle zero-speed motion', () => {
    const s = servo(0, 'zero_speed', { currentAngleDeg: 0 });
    const m = computeMotion(s, 180, 1000, 0);
    expect(m.estimatedDurationMs).toBe(0);
  });

  it('should handle very small angle delta', () => {
    const s = servo(0, 'tiny', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
    const written = writeAngle(s, 90.005);
    expect(written.servoState).toBe('HOLDING'); // Within 0.01 threshold
  });

  it('should handle negative angle clamped to 0', () => {
    const s = servo(0, 'neg', { servoState: 'IDLE', isAttached: true, currentAngleDeg: 90 });
    const written = writeAngle(s, -50);
    expect(written.targetAngleDeg).toBe(0);
  });

  it('should handle PWM duty = 0', () => {
    const s = servo(0, 'zero_duty', { servoState: 'IDLE', isAttached: true });
    const pwm = makePWMChannel(0);
    const result = simulateServoFromPWM(s, pwm, null, 1000);
    expect(result.position.angleDeg).toBe(0);
  });

  it('should handle PWM duty = max', () => {
    const s = servo(0, 'max_duty', { servoState: 'IDLE', isAttached: true });
    const pwm = makePWMChannel(65536);
    const result = simulateServoFromPWM(s, pwm, null, 1000);
    expect(result.position.angleDeg).toBe(180);
  });

  it('should handle custom angle range 0-90', () => {
    const angle = pulseWidthToAngle(500, 500, 2400, 0, 90);
    expect(angle).toBeCloseTo(0, 1);
    const angle2 = pulseWidthToAngle(2400, 500, 2400, 0, 90);
    expect(angle2).toBeCloseTo(90, 1);
  });

  it('should handle step with 0 deltaMs', () => {
    const m = motion(0, 'zero_dt', { isComplete: false, currentAngleDeg: 45 });
    const stepped = stepMotion(m, 0);
    expect(stepped.currentAngleDeg).toBe(45);
  });

  it('should handle equal min/max pulse', () => {
    const angle = pulseWidthToAngle(500, 500, 500);
    expect(angle).toBe(0);
  });
});
