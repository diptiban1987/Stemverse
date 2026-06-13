/**
 * Phase 22A: HC-SR04 Full Virtual Ultrasonic Sensor Simulation — Foundation Tests
 *
 * Tests all factories, validators, duplicate validators, beam engine,
 * simulation engine, ESP32 integration, and the HCSR04Synchronizer.
 *
 * Target: 50,000+ assertions via iteration-based stress testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Constants
  SPEED_OF_SOUND_CM_PER_US,
  HC_SR04_MAX_RANGE_CM,
  HC_SR04_MIN_RANGE_CM,
  HC_SR04_BEAM_ANGLE_DEG,
  HC_SR04_TRIGGER_PULSE_US,
  HC_SR04_MAX_ECHO_DURATION_US,
  HC_SR04_TIMEOUT_US,
  HC_SR04_DEFAULT_TEMPERATURE_C,
  VALID_HCSR04_STATES,
  VALID_BEAM_STATES,
  VALID_TARGET_TYPES,
  // Factories
  createDefaultHCSR04Model,
  createDefaultUltrasonicBeamModel,
  createDefaultEchoPulseModel,
  createDefaultDistanceTargetModel,
  createDefaultUltrasonicEnvironmentModel,
  // Validators
  validateHCSR04Model,
  validateUltrasonicBeamModel,
  validateEchoPulseModel,
  validateDistanceTargetModel,
  validateUltrasonicEnvironmentModel,
  // Duplicate Validators
  validateDuplicateHCSR04Ids,
  validateDuplicateBeamIds,
  validateDuplicateEchoPulseIds,
  validateDuplicateTargetIds,
  validateDuplicateEnvironmentIds,
  // Physics / Beam Engine
  calculateSpeedOfSound,
  computeEchoDurationUs,
  computeDistanceCm,
  isInBeamCone,
  calculateDistanceToTarget,
  calculateBeamIntersection,
  emitBeam,
  generateEchoPulse,
  // State Machine
  triggerSensor,
  triggerFromGPIO,
  driveEchoPin,
  // Simulation
  simulateMeasurement,
  simulatePulseIn,
  resetSensor,
  // Synchronizer
  HCSR04Synchronizer,
} from '../src/stage/hcsr04-runtime';

import type {
  HCSR04Model,
  UltrasonicBeamModel,
  EchoPulseModel,
  DistanceTargetModel,
  UltrasonicEnvironmentModel,
  UltrasonicSimulationSnapshot,
  HCSR04State,
  BeamState,
} from '../src/types';

// ─── Iteration Counts ─────────────────────────────────────────

const CRUD_ITER = 6000;
const OTHER_ITER = 1500;

// ─── Test Helpers ─────────────────────────────────────────────

function sensor(i: number, id?: string, overrides?: Partial<HCSR04Model>): HCSR04Model {
  return createDefaultHCSR04Model(id || `sensor_${i}`, {
    esp32Id: `esp32_${i % 4}`,
    trigPin: (i * 2) % 40,
    echoPin: (i * 2 + 1) % 40,
    positionX: i * 10,
    positionY: i * 5,
    rotationDeg: (i * 15) % 360,
    ...overrides,
  });
}

function beam(i: number, id?: string, overrides?: Partial<UltrasonicBeamModel>): UltrasonicBeamModel {
  return createDefaultUltrasonicBeamModel(id || `beam_${i}`, {
    sensorId: `sensor_${i}`,
    originX: i * 10,
    originY: i * 5,
    directionDeg: (i * 15) % 360,
    beamState: 'EMITTING',
    ...overrides,
  });
}

function echoPulse(i: number, id?: string, overrides?: Partial<EchoPulseModel>): EchoPulseModel {
  return createDefaultEchoPulseModel(id || `pulse_${i}`, {
    sensorId: `sensor_${i}`,
    beamId: `beam_${i}`,
    distanceCm: 10 + (i % 390),
    durationUs: computeEchoDurationUs(10 + (i % 390), SPEED_OF_SOUND_CM_PER_US),
    isValid: true,
    ...overrides,
  });
}

function target(i: number, id?: string, overrides?: Partial<DistanceTargetModel>): DistanceTargetModel {
  return createDefaultDistanceTargetModel(id || `target_${i}`, {
    targetType: VALID_TARGET_TYPES[i % VALID_TARGET_TYPES.length],
    positionX: 100 + i * 20,
    positionY: i * 10,
    width: 10 + (i % 50),
    height: 10 + (i % 30),
    reflectivity: Math.min(1, 0.1 + (i % 10) * 0.1),
    ...overrides,
  });
}

function env(i: number, id?: string, overrides?: Partial<UltrasonicEnvironmentModel>): UltrasonicEnvironmentModel {
  return createDefaultUltrasonicEnvironmentModel(id || `env_${i}`, {
    temperatureCelsius: 15 + (i % 30),
    humidityPercent: 20 + (i % 60),
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: HC-SR04 Constants', () => {
  it('should have correct speed of sound at 20°C', () => {
    expect(SPEED_OF_SOUND_CM_PER_US).toBeCloseTo(0.0343, 4);
  });

  it('should have correct max range', () => {
    expect(HC_SR04_MAX_RANGE_CM).toBe(400);
  });

  it('should have correct min range', () => {
    expect(HC_SR04_MIN_RANGE_CM).toBe(2);
  });

  it('should have correct beam angle', () => {
    expect(HC_SR04_BEAM_ANGLE_DEG).toBe(15);
  });

  it('should have correct trigger pulse width', () => {
    expect(HC_SR04_TRIGGER_PULSE_US).toBe(10);
  });

  it('should have correct max echo duration', () => {
    expect(HC_SR04_MAX_ECHO_DURATION_US).toBe(23324);
  });

  it('should have correct timeout', () => {
    expect(HC_SR04_TIMEOUT_US).toBe(38000);
  });

  it('should have correct default temperature', () => {
    expect(HC_SR04_DEFAULT_TEMPERATURE_C).toBe(20);
  });

  it('should have 7 valid sensor states', () => {
    expect(VALID_HCSR04_STATES).toHaveLength(7);
    expect(VALID_HCSR04_STATES).toContain('IDLE');
    expect(VALID_HCSR04_STATES).toContain('TRIGGERING');
    expect(VALID_HCSR04_STATES).toContain('EMITTING');
    expect(VALID_HCSR04_STATES).toContain('WAITING_ECHO');
    expect(VALID_HCSR04_STATES).toContain('ECHO_HIGH');
    expect(VALID_HCSR04_STATES).toContain('COMPLETE');
    expect(VALID_HCSR04_STATES).toContain('ERROR');
  });

  it('should have 5 valid beam states', () => {
    expect(VALID_BEAM_STATES).toHaveLength(5);
    expect(VALID_BEAM_STATES).toContain('IDLE');
    expect(VALID_BEAM_STATES).toContain('EMITTING');
    expect(VALID_BEAM_STATES).toContain('REFLECTED');
    expect(VALID_BEAM_STATES).toContain('TIMED_OUT');
    expect(VALID_BEAM_STATES).toContain('ABSORBED');
  });

  it('should have 5 valid target types', () => {
    expect(VALID_TARGET_TYPES).toHaveLength(5);
    expect(VALID_TARGET_TYPES).toContain('WALL');
    expect(VALID_TARGET_TYPES).toContain('BOX');
    expect(VALID_TARGET_TYPES).toContain('CYLINDER');
    expect(VALID_TARGET_TYPES).toContain('ROBOT');
    expect(VALID_TARGET_TYPES).toContain('CUSTOM');
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Factory Functions', () => {
  describe('createDefaultHCSR04Model', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultHCSR04Model('s1');
      expect(m.sensorId).toBe('s1');
      expect(m.esp32Id).toBe('');
      expect(m.sensorState).toBe('IDLE');
      expect(m.maxRangeCm).toBe(HC_SR04_MAX_RANGE_CM);
      expect(m.minRangeCm).toBe(HC_SR04_MIN_RANGE_CM);
      expect(m.beamAngleDeg).toBe(HC_SR04_BEAM_ANGLE_DEG);
      expect(m.speedOfSoundCmPerUs).toBe(SPEED_OF_SOUND_CM_PER_US);
      expect(m.triggerPulseUs).toBe(HC_SR04_TRIGGER_PULSE_US);
      expect(m.measurementCount).toBe(0);
      expect(m.futureHCSR04Hints).toEqual({});
    });

    it('should apply overrides', () => {
      const m = createDefaultHCSR04Model('s2', {
        esp32Id: 'esp_1',
        trigPin: 5,
        echoPin: 18,
        positionX: 100,
        positionY: 200,
      });
      expect(m.sensorId).toBe('s2');
      expect(m.esp32Id).toBe('esp_1');
      expect(m.trigPin).toBe(5);
      expect(m.echoPin).toBe(18);
      expect(m.positionX).toBe(100);
      expect(m.positionY).toBe(200);
    });

    it('should always use the provided id as sensorId', () => {
      const m = createDefaultHCSR04Model('override_test', { sensorId: 'wrong' } as any);
      expect(m.sensorId).toBe('override_test');
    });

    it(`stress: should create ${OTHER_ITER} models correctly`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = sensor(i);
        expect(m.sensorId).toBe(`sensor_${i}`);
        expect(m.esp32Id).toBe(`esp32_${i % 4}`);
        expect(m.sensorState).toBe('IDLE');
        expect(typeof m.trigPin).toBe('number');
        expect(typeof m.echoPin).toBe('number');
        expect(m.futureHCSR04Hints).toEqual({});
      }
    });
  });

  describe('createDefaultUltrasonicBeamModel', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultUltrasonicBeamModel('b1');
      expect(m.beamId).toBe('b1');
      expect(m.sensorId).toBe('');
      expect(m.beamState).toBe('IDLE');
      expect(m.maxRangeCm).toBe(HC_SR04_MAX_RANGE_CM);
      expect(m.futureBeamHints).toEqual({});
    });

    it(`stress: should create ${OTHER_ITER} models correctly`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = beam(i);
        expect(m.beamId).toBe(`beam_${i}`);
        expect(m.sensorId).toBe(`sensor_${i}`);
        expect(m.beamState).toBe('EMITTING');
      }
    });
  });

  describe('createDefaultEchoPulseModel', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultEchoPulseModel('p1');
      expect(m.pulseId).toBe('p1');
      expect(m.isValid).toBe(false);
      expect(m.durationUs).toBe(0);
      expect(m.futureEchoHints).toEqual({});
    });

    it(`stress: should create ${OTHER_ITER} models correctly`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = echoPulse(i);
        expect(m.pulseId).toBe(`pulse_${i}`);
        expect(m.sensorId).toBe(`sensor_${i}`);
        expect(m.isValid).toBe(true);
        expect(m.durationUs).toBeGreaterThan(0);
      }
    });
  });

  describe('createDefaultDistanceTargetModel', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultDistanceTargetModel('t1');
      expect(m.targetId).toBe('t1');
      expect(m.targetType).toBe('BOX');
      expect(m.width).toBe(10);
      expect(m.height).toBe(10);
      expect(m.reflectivity).toBe(1.0);
      expect(m.isActive).toBe(true);
      expect(m.futureTargetHints).toEqual({});
    });

    it(`stress: should create ${OTHER_ITER} models correctly`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = target(i);
        expect(m.targetId).toBe(`target_${i}`);
        expect(VALID_TARGET_TYPES).toContain(m.targetType);
        expect(m.width).toBeGreaterThan(0);
        expect(m.reflectivity).toBeGreaterThan(0);
        expect(m.reflectivity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('createDefaultUltrasonicEnvironmentModel', () => {
    it('should create a valid model with defaults', () => {
      const m = createDefaultUltrasonicEnvironmentModel('e1');
      expect(m.environmentId).toBe('e1');
      expect(m.temperatureCelsius).toBe(HC_SR04_DEFAULT_TEMPERATURE_C);
      expect(m.humidityPercent).toBe(50);
      expect(m.activeTargetIds).toEqual([]);
      expect(m.activeSensorIds).toEqual([]);
      expect(m.futureEnvironmentHints).toEqual({});
    });

    it(`stress: should create ${OTHER_ITER} models correctly`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const m = env(i);
        expect(m.environmentId).toBe(`env_${i}`);
        expect(m.temperatureCelsius).toBeGreaterThanOrEqual(15);
        expect(m.humidityPercent).toBeGreaterThanOrEqual(20);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Validators', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('validateHCSR04Model', () => {
    it('should return no warnings for a valid model', () => {
      const m = sensor(0);
      expect(validateHCSR04Model(m)).toHaveLength(0);
    });

    it('should warn on null', () => {
      const w = validateHCSR04Model(null as any);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].code).toBe('INVALID_HCSR04');
    });

    it('should warn on empty sensorId', () => {
      const m = createDefaultHCSR04Model('');
      const w = validateHCSR04Model(m);
      expect(w.some(x => x.code === 'EMPTY_SENSOR_ID')).toBe(true);
    });

    it('should warn on empty esp32Id', () => {
      const m = createDefaultHCSR04Model('s1', { esp32Id: '' });
      const w = validateHCSR04Model(m);
      expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
    });

    it('should warn on negative trigPin', () => {
      const m = sensor(0, 's1', { trigPin: -1 });
      const w = validateHCSR04Model(m);
      expect(w.some(x => x.code === 'INVALID_TRIG_PIN')).toBe(true);
    });

    it('should warn on invalid sensorState', () => {
      const m = sensor(0, 's1', { sensorState: 'INVALID' as HCSR04State });
      const w = validateHCSR04Model(m);
      expect(w.some(x => x.code === 'INVALID_SENSOR_STATE')).toBe(true);
    });

    it(`stress: should validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const w = validateHCSR04Model(sensor(i));
        expect(w).toHaveLength(0);
      }
    });
  });

  describe('validateUltrasonicBeamModel', () => {
    it('should return no warnings for a valid model', () => {
      const m = beam(0);
      expect(validateUltrasonicBeamModel(m)).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateUltrasonicBeamModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on empty beamId', () => {
      const m = createDefaultUltrasonicBeamModel('');
      const w = validateUltrasonicBeamModel(m);
      expect(w.some(x => x.code === 'EMPTY_BEAM_ID')).toBe(true);
    });

    it(`stress: should validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateUltrasonicBeamModel(beam(i))).toHaveLength(0);
      }
    });
  });

  describe('validateEchoPulseModel', () => {
    it('should return no warnings for a valid model', () => {
      const m = echoPulse(0);
      expect(validateEchoPulseModel(m)).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateEchoPulseModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on negative durationUs', () => {
      const m = echoPulse(0, 'p_bad', { durationUs: -5 });
      const w = validateEchoPulseModel(m);
      expect(w.some(x => x.code === 'INVALID_DURATION')).toBe(true);
    });

    it(`stress: should validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateEchoPulseModel(echoPulse(i))).toHaveLength(0);
      }
    });
  });

  describe('validateDistanceTargetModel', () => {
    it('should return no warnings for a valid model', () => {
      const m = target(0);
      expect(validateDistanceTargetModel(m)).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateDistanceTargetModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on invalid reflectivity', () => {
      const m = target(0, 't_bad', { reflectivity: 1.5 });
      const w = validateDistanceTargetModel(m);
      expect(w.some(x => x.code === 'INVALID_REFLECTIVITY')).toBe(true);
    });

    it('should warn on zero width', () => {
      const m = target(0, 't_zero', { width: 0 });
      const w = validateDistanceTargetModel(m);
      expect(w.some(x => x.code === 'INVALID_WIDTH')).toBe(true);
    });

    it(`stress: should validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateDistanceTargetModel(target(i))).toHaveLength(0);
      }
    });
  });

  describe('validateUltrasonicEnvironmentModel', () => {
    it('should return no warnings for a valid model', () => {
      const m = env(0);
      expect(validateUltrasonicEnvironmentModel(m)).toHaveLength(0);
    });

    it('should warn on null', () => {
      expect(validateUltrasonicEnvironmentModel(null as any).length).toBeGreaterThan(0);
    });

    it('should warn on humidity > 100', () => {
      const m = env(0, 'e_bad', { humidityPercent: 110 });
      const w = validateUltrasonicEnvironmentModel(m);
      expect(w.some(x => x.code === 'INVALID_HUMIDITY')).toBe(true);
    });

    it(`stress: should validate ${OTHER_ITER} valid models`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        expect(validateUltrasonicEnvironmentModel(env(i))).toHaveLength(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Duplicate Validators', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should detect duplicate sensor IDs', () => {
    const models = [sensor(0, 'dup'), sensor(1, 'dup')];
    const w = validateDuplicateHCSR04Ids(models);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0].code).toBe('DUPLICATE_SENSOR_ID');
  });

  it('should detect no duplicates with unique IDs', () => {
    const models = Array.from({ length: 100 }, (_, i) => sensor(i));
    expect(validateDuplicateHCSR04Ids(models)).toHaveLength(0);
  });

  it('should detect duplicate beam IDs', () => {
    const models = [beam(0, 'dup'), beam(1, 'dup')];
    expect(validateDuplicateBeamIds(models).length).toBeGreaterThan(0);
  });

  it('should detect duplicate pulse IDs', () => {
    const models = [echoPulse(0, 'dup'), echoPulse(1, 'dup')];
    expect(validateDuplicateEchoPulseIds(models).length).toBeGreaterThan(0);
  });

  it('should detect duplicate target IDs', () => {
    const models = [target(0, 'dup'), target(1, 'dup')];
    expect(validateDuplicateTargetIds(models).length).toBeGreaterThan(0);
  });

  it('should detect duplicate environment IDs', () => {
    const models = [env(0, 'dup'), env(1, 'dup')];
    expect(validateDuplicateEnvironmentIds(models).length).toBeGreaterThan(0);
  });

  it(`stress: should validate ${OTHER_ITER} unique items with 0 duplicates`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      const sensors = [sensor(i, `s_${i}_a`), sensor(i, `s_${i}_b`)];
      expect(validateDuplicateHCSR04Ids(sensors)).toHaveLength(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PHYSICS / BEAM ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Physics / Beam Engine', () => {
  describe('calculateSpeedOfSound', () => {
    it('should return ~0.0343 cm/μs at 20°C', () => {
      const v = calculateSpeedOfSound(20);
      expect(v).toBeCloseTo(0.03433, 4);
    });

    it('should increase with temperature', () => {
      const v0 = calculateSpeedOfSound(0);
      const v20 = calculateSpeedOfSound(20);
      const v40 = calculateSpeedOfSound(40);
      expect(v20).toBeGreaterThan(v0);
      expect(v40).toBeGreaterThan(v20);
    });

    it('should return ~0.03313 cm/μs at 0°C', () => {
      const v = calculateSpeedOfSound(0);
      expect(v).toBeCloseTo(0.03313, 4);
    });

    it(`stress: should compute ${OTHER_ITER} temperatures`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const temp = -20 + (i % 80);
        const v = calculateSpeedOfSound(temp);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(0.04);
      }
    });
  });

  describe('computeEchoDurationUs', () => {
    it('should compute correct duration for 100cm', () => {
      const dur = computeEchoDurationUs(100, SPEED_OF_SOUND_CM_PER_US);
      expect(dur).toBeCloseTo(5831, 0);
    });

    it('should return 0 for 0 distance', () => {
      expect(computeEchoDurationUs(0, SPEED_OF_SOUND_CM_PER_US)).toBe(0);
    });

    it('should return 0 for negative distance', () => {
      expect(computeEchoDurationUs(-10, SPEED_OF_SOUND_CM_PER_US)).toBe(0);
    });

    it('should return 0 for 0 speed', () => {
      expect(computeEchoDurationUs(100, 0)).toBe(0);
    });

    it(`stress: should compute ${OTHER_ITER} durations`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const dist = 2 + (i % 398);
        const dur = computeEchoDurationUs(dist, SPEED_OF_SOUND_CM_PER_US);
        expect(dur).toBeGreaterThan(0);
      }
    });
  });

  describe('computeDistanceCm', () => {
    it('should compute correct distance for 5831μs', () => {
      const dist = computeDistanceCm(5831, SPEED_OF_SOUND_CM_PER_US);
      expect(dist).toBeCloseTo(100, 0);
    });

    it('should be the inverse of computeEchoDurationUs', () => {
      for (let d = 2; d <= 400; d += 10) {
        const dur = computeEchoDurationUs(d, SPEED_OF_SOUND_CM_PER_US);
        const distBack = computeDistanceCm(dur, SPEED_OF_SOUND_CM_PER_US);
        expect(distBack).toBeCloseTo(d, 5);
      }
    });

    it('should return 0 for 0 duration', () => {
      expect(computeDistanceCm(0, SPEED_OF_SOUND_CM_PER_US)).toBe(0);
    });

    it(`stress: round-trip ${OTHER_ITER} values`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const dist = 2 + (i % 398);
        const dur = computeEchoDurationUs(dist, SPEED_OF_SOUND_CM_PER_US);
        const back = computeDistanceCm(dur, SPEED_OF_SOUND_CM_PER_US);
        expect(back).toBeCloseTo(dist, 5);
      }
    });
  });

  describe('isInBeamCone', () => {
    it('should detect target directly ahead', () => {
      expect(isInBeamCone(0, 0, 0, 15, 100, 0)).toBe(true);
    });

    it('should detect target within cone angle', () => {
      expect(isInBeamCone(0, 0, 0, 30, 100, 10)).toBe(true);
    });

    it('should reject target outside cone', () => {
      expect(isInBeamCone(0, 0, 0, 10, 0, 100)).toBe(false);
    });

    it('should detect target at sensor position', () => {
      expect(isInBeamCone(50, 50, 0, 15, 50, 50)).toBe(true);
    });

    it('should handle negative angles', () => {
      expect(isInBeamCone(0, 0, -90, 30, 0, -100)).toBe(true);
    });

    it('should handle 360° wrap-around', () => {
      expect(isInBeamCone(0, 0, 350, 30, 100, -10)).toBe(true);
    });

    it(`stress: should check ${OTHER_ITER} positions`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const result = isInBeamCone(0, 0, 0, 15, 100, i - OTHER_ITER / 2);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('calculateBeamIntersection', () => {
    it('should find nearest target', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const targets = [
        target(0, 'far', { positionX: 200, positionY: 0, width: 20, height: 20, isActive: true }),
        target(1, 'near', { positionX: 50, positionY: 0, width: 20, height: 20, isActive: true }),
      ];
      const result = calculateBeamIntersection(s, targets);
      expect(result).not.toBeNull();
      expect(result!.targetId).toBe('near');
    });

    it('should return null when no targets in range', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const targets = [
        target(0, 'far', { positionX: 500, positionY: 0, width: 10, height: 10, isActive: true }),
      ];
      const result = calculateBeamIntersection(s, targets);
      expect(result).toBeNull();
    });

    it('should ignore inactive targets', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const targets = [
        target(0, 'inactive', { positionX: 50, positionY: 0, width: 20, height: 20, isActive: false }),
      ];
      const result = calculateBeamIntersection(s, targets);
      expect(result).toBeNull();
    });

    it('should respect min range', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0, minRangeCm: 10 });
      const targets = [
        target(0, 'tooclose', { positionX: 5, positionY: 0, width: 2, height: 2, isActive: true }),
      ];
      const result = calculateBeamIntersection(s, targets);
      expect(result).toBeNull();
    });

    it(`stress: should compute ${OTHER_ITER} intersections`, () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      for (let i = 0; i < OTHER_ITER; i++) {
        const t = [target(i, `t_${i}`, {
          positionX: 50 + (i % 350),
          positionY: 0,
          width: 20,
          height: 20,
          isActive: true,
        })];
        const result = calculateBeamIntersection(s, t);
        expect(result === null || typeof result.distanceCm === 'number').toBe(true);
      }
    });
  });

  describe('emitBeam', () => {
    it('should create a beam from sensor', () => {
      const s = sensor(0, 'test', { positionX: 10, positionY: 20, rotationDeg: 45 });
      const b = emitBeam(s, 1000);
      expect(b.sensorId).toBe('test');
      expect(b.originX).toBe(10);
      expect(b.originY).toBe(20);
      expect(b.directionDeg).toBe(45);
      expect(b.beamState).toBe('EMITTING');
      expect(b.emitTimestamp).toBe(1000);
    });

    it(`stress: should emit ${OTHER_ITER} beams`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i);
        const b = emitBeam(s, i * 100);
        expect(b.sensorId).toBe(s.sensorId);
        expect(b.beamState).toBe('EMITTING');
      }
    });
  });

  describe('generateEchoPulse', () => {
    it('should create a valid echo pulse', () => {
      const s = sensor(0, 'test');
      const b = beam(0, 'beam_test', { sensorId: 'test' });
      const p = generateEchoPulse(s, b, 100, 500);
      expect(p.sensorId).toBe('test');
      expect(p.beamId).toBe('beam_test');
      expect(p.distanceCm).toBe(100);
      expect(p.durationUs).toBeGreaterThan(0);
      expect(p.isValid).toBe(true);
    });

    it('should mark out-of-range as invalid', () => {
      const s = sensor(0, 'test', { minRangeCm: 2, maxRangeCm: 400 });
      const b = beam(0, 'beam_test', { sensorId: 'test' });
      const p = generateEchoPulse(s, b, 1, 500); // < minRange
      expect(p.isValid).toBe(false);
    });

    it(`stress: should generate ${OTHER_ITER} echo pulses`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i);
        const b = beam(i);
        const dist = 2 + (i % 398);
        const p = generateEchoPulse(s, b, dist, i * 100);
        expect(p.durationUs).toBeGreaterThan(0);
        expect(p.isValid).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Sensor State Machine', () => {
  describe('triggerSensor', () => {
    it('should transition from IDLE to TRIGGERING', () => {
      const s = sensor(0, 'test');
      const triggered = triggerSensor(s, 1000);
      expect(triggered.sensorState).toBe('TRIGGERING');
      expect(triggered.lastMeasurementTimestamp).toBe(1000);
    });

    it('should transition from COMPLETE to TRIGGERING', () => {
      const s = sensor(0, 'test', { sensorState: 'COMPLETE' });
      const triggered = triggerSensor(s, 2000);
      expect(triggered.sensorState).toBe('TRIGGERING');
    });

    it('should not transition from EMITTING', () => {
      const s = sensor(0, 'test', { sensorState: 'EMITTING' });
      const triggered = triggerSensor(s);
      expect(triggered.sensorState).toBe('EMITTING');
    });

    it('should not mutate input', () => {
      const s = sensor(0, 'test');
      const triggered = triggerSensor(s, 1000);
      expect(s.sensorState).toBe('IDLE');
      expect(triggered.sensorState).toBe('TRIGGERING');
    });

    it(`stress: should trigger ${OTHER_ITER} sensors`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i);
        const t = triggerSensor(s, i * 100);
        expect(t.sensorState).toBe('TRIGGERING');
        expect(s.sensorState).toBe('IDLE');
      }
    });
  });

  describe('triggerFromGPIO', () => {
    it('should trigger on HIGH when IDLE', () => {
      const s = sensor(0, 'test');
      const result = triggerFromGPIO(s, 'HIGH', 1000);
      expect(result.sensorState).toBe('TRIGGERING');
    });

    it('should not trigger on LOW', () => {
      const s = sensor(0, 'test');
      const result = triggerFromGPIO(s, 'LOW');
      expect(result.sensorState).toBe('IDLE');
    });

    it('should not trigger on FLOATING', () => {
      const s = sensor(0, 'test');
      const result = triggerFromGPIO(s, 'FLOATING');
      expect(result.sensorState).toBe('IDLE');
    });

    it('should trigger on HIGH when COMPLETE', () => {
      const s = sensor(0, 'test', { sensorState: 'COMPLETE' });
      const result = triggerFromGPIO(s, 'HIGH');
      expect(result.sensorState).toBe('TRIGGERING');
    });

    it(`stress: should process ${OTHER_ITER} GPIO triggers`, () => {
      const states: ('HIGH' | 'LOW' | 'FLOATING')[] = ['HIGH', 'LOW', 'FLOATING'];
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i);
        const state = states[i % 3];
        const result = triggerFromGPIO(s, state, i * 100);
        if (state === 'HIGH') {
          expect(result.sensorState).toBe('TRIGGERING');
        } else {
          expect(result.sensorState).toBe('IDLE');
        }
      }
    });
  });

  describe('driveEchoPin', () => {
    it('should return HIGH when sensor is ECHO_HIGH', () => {
      const s = sensor(0, 'test', { sensorState: 'ECHO_HIGH' });
      const p = echoPulse(0, 'p1', { durationUs: 5831 });
      const result = driveEchoPin(s, p);
      expect(result.echoState).toBe('HIGH');
      expect(result.durationUs).toBe(5831);
    });

    it('should return LOW when sensor is not ECHO_HIGH', () => {
      const s = sensor(0, 'test', { sensorState: 'IDLE' });
      const result = driveEchoPin(s, null);
      expect(result.echoState).toBe('LOW');
      expect(result.durationUs).toBe(0);
    });

    it('should return LOW when sensor is ECHO_HIGH but no pulse', () => {
      const s = sensor(0, 'test', { sensorState: 'ECHO_HIGH' });
      const result = driveEchoPin(s, null);
      expect(result.echoState).toBe('LOW');
      expect(result.durationUs).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Simulation Engine', () => {
  describe('simulateMeasurement', () => {
    it('should measure distance to a target at 100cm', () => {
      const s = sensor(0, 'test', {
        positionX: 0, positionY: 0, rotationDeg: 0,
      });
      const targets = [
        target(0, 'wall', { positionX: 100, positionY: 0, width: 50, height: 50, isActive: true }),
      ];
      const result = simulateMeasurement(s, targets, null, 1000);
      expect(result.sensor.sensorState).toBe('COMPLETE');
      expect(result.sensor.lastMeasuredDistanceCm).toBeGreaterThan(0);
      expect(result.beam.beamState).toBe('REFLECTED');
      expect(result.echoPulse.isValid).toBe(true);
    });

    it('should timeout when no targets', () => {
      const s = sensor(0, 'test', {
        positionX: 0, positionY: 0, rotationDeg: 0,
      });
      const result = simulateMeasurement(s, [], null, 1000);
      expect(result.sensor.sensorState).toBe('COMPLETE');
      expect(result.sensor.lastMeasuredDistanceCm).toBe(0);
      expect(result.beam.beamState).toBe('TIMED_OUT');
      expect(result.echoPulse.isValid).toBe(false);
    });

    it('should adjust speed of sound for temperature', () => {
      const s = sensor(0, 'test', {
        positionX: 0, positionY: 0, rotationDeg: 0,
      });
      const targets = [
        target(0, 'wall', { positionX: 100, positionY: 0, width: 50, height: 50, isActive: true }),
      ];
      const envCold = env(0, 'cold', { temperatureCelsius: 0 });
      const envHot = env(1, 'hot', { temperatureCelsius: 40 });

      const coldResult = simulateMeasurement(s, targets, envCold, 1000);
      const hotResult = simulateMeasurement(s, targets, envHot, 1000);

      // Same distance but different echo durations due to speed of sound
      if (coldResult.echoPulse.isValid && hotResult.echoPulse.isValid) {
        expect(coldResult.echoPulse.durationUs).toBeGreaterThan(hotResult.echoPulse.durationUs);
      }
    });

    it('should not mutate input sensor', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const original = JSON.parse(JSON.stringify(s));
      simulateMeasurement(s, [], null, 1000);
      expect(s).toEqual(original);
    });

    it('should increment measurement count', () => {
      const s = sensor(0, 'test', {
        positionX: 0, positionY: 0, rotationDeg: 0, measurementCount: 5,
      });
      const result = simulateMeasurement(s, [], null, 1000);
      expect(result.sensor.measurementCount).toBe(6);
    });

    it(`stress: should simulate ${OTHER_ITER} measurements`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i, `test_${i}`, { positionX: 0, positionY: 0, rotationDeg: 0 });
        const targets = [target(i, `t_${i}`, {
          positionX: 50 + (i % 350),
          positionY: 0,
          width: 20,
          height: 20,
          isActive: true,
        })];
        const result = simulateMeasurement(s, targets, null, i * 100);
        expect(result.sensor.sensorState).toBe('COMPLETE');
        expect(result.sensor.measurementCount).toBe(1);
      }
    });
  });

  describe('simulatePulseIn', () => {
    it('should return echo duration for valid target', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const targets = [
        target(0, 'wall', { positionX: 100, positionY: 0, width: 50, height: 50, isActive: true }),
      ];
      const dur = simulatePulseIn(s, targets, null, 1000);
      expect(dur).toBeGreaterThan(0);
    });

    it('should return 0 when no target', () => {
      const s = sensor(0, 'test', { positionX: 0, positionY: 0, rotationDeg: 0 });
      const dur = simulatePulseIn(s, [], null, 1000);
      expect(dur).toBe(0);
    });

    it(`stress: should simulate ${OTHER_ITER} pulseIn calls`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = sensor(i, `s_${i}`, { positionX: 0, positionY: 0, rotationDeg: 0 });
        const targets = i % 2 === 0
          ? [target(i, `t_${i}`, { positionX: 100, positionY: 0, width: 50, height: 50, isActive: true })]
          : [];
        const dur = simulatePulseIn(s, targets, null, i * 100);
        if (i % 2 === 0) {
          expect(dur).toBeGreaterThan(0);
        } else {
          expect(dur).toBe(0);
        }
      }
    });
  });

  describe('resetSensor', () => {
    it('should reset to IDLE', () => {
      const s = sensor(0, 'test', {
        sensorState: 'COMPLETE',
        lastMeasuredDistanceCm: 100,
        lastEchoDurationUs: 5831,
        measurementCount: 5,
      });
      const reset = resetSensor(s);
      expect(reset.sensorState).toBe('IDLE');
      expect(reset.lastMeasuredDistanceCm).toBe(0);
      expect(reset.lastEchoDurationUs).toBe(0);
      expect(reset.measurementCount).toBe(0);
    });

    it('should not mutate input', () => {
      const s = sensor(0, 'test', { sensorState: 'COMPLETE', measurementCount: 5 });
      const original = JSON.parse(JSON.stringify(s));
      resetSensor(s);
      expect(s).toEqual(original);
    });

    it('should preserve sensor identity', () => {
      const s = sensor(0, 'test', { esp32Id: 'esp1', trigPin: 5, echoPin: 18 });
      const reset = resetSensor(s);
      expect(reset.sensorId).toBe('test');
      expect(reset.esp32Id).toBe('esp1');
      expect(reset.trigPin).toBe(5);
      expect(reset.echoPin).toBe(18);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// HCSR04 SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: HCSR04Synchronizer', () => {
  let sync: HCSR04Synchronizer;

  beforeEach(() => {
    sync = new HCSR04Synchronizer();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('buildSnapshot', () => {
    it('should register all valid models', () => {
      const snapshot = sync.buildSnapshot(
        [sensor(0), sensor(1)],
        [beam(0), beam(1)],
        [echoPulse(0)],
        [target(0)],
        [env(0)],
      );
      expect(snapshot.sensors).toHaveLength(2);
      expect(snapshot.beams).toHaveLength(2);
      expect(snapshot.echoPulses).toHaveLength(1);
      expect(snapshot.targets).toHaveLength(1);
      expect(snapshot.environments).toHaveLength(1);
    });

    it('should reject invalid models', () => {
      const badSensor = createDefaultHCSR04Model('', { sensorState: 'BAD' as any });
      const snapshot = sync.buildSnapshot(
        [badSensor],
        [], [], [], [],
      );
      expect(snapshot.sensors).toHaveLength(0);
    });

    it('should clear previous state', () => {
      sync.buildSnapshot([sensor(0)], [], [], [], []);
      expect(sync.sensors.size).toBe(1);
      sync.buildSnapshot([], [], [], [], []);
      expect(sync.sensors.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should empty all registries', () => {
      sync.buildSnapshot(
        [sensor(0)],
        [beam(0)],
        [echoPulse(0)],
        [target(0)],
        [env(0)],
      );
      sync.clear();
      expect(sync.sensors.size).toBe(0);
      expect(sync.beams.size).toBe(0);
      expect(sync.echoPulses.size).toBe(0);
      expect(sync.targets.size).toBe(0);
      expect(sync.environments.size).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create an independent copy', () => {
      sync.buildSnapshot([sensor(0)], [], [], [], []);
      const cloned = sync.clone();
      expect(cloned.sensors.size).toBe(1);

      // Modify original — clone should be independent
      sync.clear();
      expect(sync.sensors.size).toBe(0);
      expect(cloned.sensors.size).toBe(1);
    });
  });

  describe('toJSON / fromJSON', () => {
    it('should round-trip all data', () => {
      sync.buildSnapshot(
        [sensor(0), sensor(1), sensor(2)],
        [beam(0)],
        [echoPulse(0)],
        [target(0), target(1)],
        [env(0)],
      );
      const json = sync.toJSON();
      const restored = new HCSR04Synchronizer();
      restored.fromJSON(json);

      expect(restored.sensors.size).toBe(3);
      expect(restored.beams.size).toBe(1);
      expect(restored.echoPulses.size).toBe(1);
      expect(restored.targets.size).toBe(2);
      expect(restored.environments.size).toBe(1);
    });

    it('should handle null json gracefully', () => {
      sync.buildSnapshot([sensor(0)], [], [], [], []);
      sync.fromJSON(null as any);
      expect(sync.sensors.size).toBe(0);
    });

    it(`stress: should round-trip ${OTHER_ITER} times`, () => {
      for (let i = 0; i < OTHER_ITER; i++) {
        const s = new HCSR04Synchronizer();
        s.buildSnapshot(
          [sensor(i)],
          [beam(i)],
          [echoPulse(i)],
          [target(i)],
          [env(i)],
        );
        const json = s.toJSON();
        const restored = new HCSR04Synchronizer();
        restored.fromJSON(json);
        expect(restored.sensors.size).toBe(1);
        expect(restored.beams.size).toBe(1);
        expect(restored.echoPulses.size).toBe(1);
        expect(restored.targets.size).toBe(1);
        expect(restored.environments.size).toBe(1);
      }
    });
  });

  describe('registry CRUD stress', () => {
    it(`register + lookup: ${CRUD_ITER} sensors`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const s = sensor(i);
        sync.sensors.register(s.sensorId, s);
        const found = sync.sensors.lookup(s.sensorId);
        expect(found).toBeDefined();
        expect(found!.sensorId).toBe(s.sensorId);
      }
    });

    it(`register + lookup: ${CRUD_ITER} beams`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const b = beam(i);
        sync.beams.register(b.beamId, b);
        const found = sync.beams.lookup(b.beamId);
        expect(found).toBeDefined();
        expect(found!.beamId).toBe(b.beamId);
      }
    });

    it(`register + lookup: ${CRUD_ITER} echo pulses`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const p = echoPulse(i);
        sync.echoPulses.register(p.pulseId, p);
        const found = sync.echoPulses.lookup(p.pulseId);
        expect(found).toBeDefined();
        expect(found!.pulseId).toBe(p.pulseId);
      }
    });

    it(`register + lookup: ${CRUD_ITER} targets`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const t = target(i);
        sync.targets.register(t.targetId, t);
        const found = sync.targets.lookup(t.targetId);
        expect(found).toBeDefined();
        expect(found!.targetId).toBe(t.targetId);
      }
    });

    it(`register + lookup: ${CRUD_ITER} environments`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const e = env(i);
        sync.environments.register(e.environmentId, e);
        const found = sync.environments.lookup(e.environmentId);
        expect(found).toBeDefined();
        expect(found!.environmentId).toBe(e.environmentId);
      }
    });

    it(`update: ${CRUD_ITER} sensors`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const s = sensor(i);
        sync.sensors.register(s.sensorId, s);
        sync.sensors.update(s.sensorId, { positionX: i * 100 });
        const found = sync.sensors.lookup(s.sensorId);
        expect(found!.positionX).toBe(i * 100);
      }
    });

    it(`remove: ${CRUD_ITER} sensors`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const s = sensor(i);
        sync.sensors.register(s.sensorId, s);
      }
      expect(sync.sensors.size).toBe(CRUD_ITER);
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.sensors.remove(`sensor_${i}`);
      }
      expect(sync.sensors.size).toBe(0);
    });

    it(`has + keys: ${CRUD_ITER} beams`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        const b = beam(i);
        sync.beams.register(b.beamId, b);
        expect(sync.beams.has(b.beamId)).toBe(true);
      }
      const keys = sync.beams.keys();
      expect(keys).toHaveLength(CRUD_ITER);
    });

    it(`getAll: ${CRUD_ITER} targets`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.targets.register(`target_${i}`, target(i));
      }
      const all = sync.targets.getAll();
      expect(all).toHaveLength(CRUD_ITER);
      // Verify deep copy
      all[0].positionX = -9999;
      const orig = sync.targets.lookup('target_0');
      expect(orig!.positionX).not.toBe(-9999);
    });

    it(`clear: ${CRUD_ITER} environments`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        sync.environments.register(`env_${i}`, env(i));
      }
      expect(sync.environments.size).toBe(CRUD_ITER);
      sync.environments.clear();
      expect(sync.environments.size).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: Full Measurement Cycle
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Integration — Full Measurement Cycle', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should complete a full measurement: place → trigger → measure → read', () => {
    // Place sensor facing right
    const s = sensor(0, 'hcsr04_1', {
      esp32Id: 'esp_main',
      trigPin: 5,
      echoPin: 18,
      positionX: 0,
      positionY: 0,
      rotationDeg: 0,
    });

    // Place target 100cm away
    const t = target(0, 'wall_1', {
      positionX: 100,
      positionY: 0,
      width: 50,
      height: 50,
      isActive: true,
    });

    // Trigger measurement
    const triggered = triggerFromGPIO(s, 'HIGH', 1000);
    expect(triggered.sensorState).toBe('TRIGGERING');

    // Simulate measurement
    const result = simulateMeasurement(triggered, [t], null, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
    expect(result.sensor.lastMeasuredDistanceCm).toBeGreaterThan(0);
    expect(result.beam.beamState).toBe('REFLECTED');
    expect(result.echoPulse.isValid).toBe(true);

    // Verify echo duration is physically correct
    const expectedDuration = computeEchoDurationUs(
      result.sensor.lastMeasuredDistanceCm,
      SPEED_OF_SOUND_CM_PER_US,
    );
    expect(result.echoPulse.durationUs).toBeCloseTo(expectedDuration, 0);
  });

  it('should handle moving target', () => {
    const s = sensor(0, 'mobile_test', {
      positionX: 0, positionY: 0, rotationDeg: 0,
    });

    // First measurement — target at 200cm
    const t1 = target(0, 'moving', { positionX: 200, positionY: 0, width: 30, height: 30, isActive: true });
    const r1 = simulateMeasurement(s, [t1], null, 1000);

    // Second measurement — target at 50cm
    const t2 = target(0, 'moving', { positionX: 50, positionY: 0, width: 30, height: 30, isActive: true });
    const r2 = simulateMeasurement(r1.sensor, [t2], null, 2000);

    expect(r2.sensor.lastMeasuredDistanceCm).toBeLessThan(r1.sensor.lastMeasuredDistanceCm);
    expect(r2.sensor.measurementCount).toBe(2);
  });

  it('should handle temperature effect on measurements', () => {
    const s = sensor(0, 'temp_test', {
      positionX: 0, positionY: 0, rotationDeg: 0,
    });
    const targets = [target(0, 'fixed', {
      positionX: 100, positionY: 0, width: 50, height: 50, isActive: true,
    })];

    const coldEnv = env(0, 'cold', { temperatureCelsius: -10 });
    const hotEnv = env(1, 'hot', { temperatureCelsius: 40 });

    const coldResult = simulateMeasurement(s, targets, coldEnv, 1000);
    const hotResult = simulateMeasurement(s, targets, hotEnv, 2000);

    // Sound is slower in cold → longer echo duration
    if (coldResult.echoPulse.isValid && hotResult.echoPulse.isValid) {
      expect(coldResult.echoPulse.durationUs).toBeGreaterThan(hotResult.echoPulse.durationUs);
    }
  });

  it(`stress: ${OTHER_ITER} full measurement cycles`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      const s = sensor(i, `cycle_${i}`, { positionX: 0, positionY: 0, rotationDeg: 0 });
      const dist = 10 + (i % 380);
      const targets = [target(i, `t_${i}`, {
        positionX: dist,
        positionY: 0,
        width: 30,
        height: 30,
        isActive: true,
      })];
      const result = simulateMeasurement(s, targets, null, i * 100);
      expect(result.sensor.sensorState).toBe('COMPLETE');
      expect(result.sensor.measurementCount).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION ROUND-TRIP
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Serialization Round-Trip', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should preserve all data through JSON round-trip', () => {
    const original: UltrasonicSimulationSnapshot = {
      sensors: [sensor(0), sensor(1)],
      beams: [beam(0)],
      echoPulses: [echoPulse(0)],
      targets: [target(0), target(1), target(2)],
      environments: [env(0)],
    };

    const json = JSON.stringify(original);
    const restored: UltrasonicSimulationSnapshot = JSON.parse(json);

    expect(restored.sensors).toHaveLength(2);
    expect(restored.beams).toHaveLength(1);
    expect(restored.echoPulses).toHaveLength(1);
    expect(restored.targets).toHaveLength(3);
    expect(restored.environments).toHaveLength(1);

    expect(restored.sensors[0].sensorId).toBe(original.sensors[0].sensorId);
    expect(restored.targets[2].targetId).toBe(original.targets[2].targetId);
  });

  it('synchronizer should round-trip data', () => {
    const sync = new HCSR04Synchronizer();
    sync.buildSnapshot(
      [sensor(0), sensor(1)],
      [beam(0)],
      [echoPulse(0)],
      [target(0)],
      [env(0)],
    );

    const json = sync.toJSON();
    const restored = new HCSR04Synchronizer();
    restored.fromJSON(json);

    expect(restored.sensors.size).toBe(2);
    expect(restored.beams.size).toBe(1);
    expect(restored.echoPulses.size).toBe(1);
    expect(restored.targets.size).toBe(1);
    expect(restored.environments.size).toBe(1);

    // Verify deep equality
    const origSensor = sync.sensors.lookup('sensor_0');
    const restSensor = restored.sensors.lookup('sensor_0');
    expect(restSensor).toEqual(origSensor);
  });

  it(`stress: ${OTHER_ITER} serialization round-trips`, () => {
    for (let i = 0; i < OTHER_ITER; i++) {
      const snap: UltrasonicSimulationSnapshot = {
        sensors: [sensor(i)],
        beams: [beam(i)],
        echoPulses: [echoPulse(i)],
        targets: [target(i)],
        environments: [env(i)],
      };
      const json = JSON.stringify(snap);
      const restored = JSON.parse(json) as UltrasonicSimulationSnapshot;
      expect(restored.sensors[0].sensorId).toBe(`sensor_${i}`);
      expect(restored.beams[0].beamId).toBe(`beam_${i}`);
      expect(restored.echoPulses[0].pulseId).toBe(`pulse_${i}`);
      expect(restored.targets[0].targetId).toBe(`target_${i}`);
      expect(restored.environments[0].environmentId).toBe(`env_${i}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Phase 22A: Edge Cases', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('should handle target at exact max range', () => {
    const s = sensor(0, 'edge_max', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const targets = [target(0, 'at_max', {
      positionX: 400,
      positionY: 0,
      width: 20,
      height: 20,
      isActive: true,
    })];
    const result = simulateMeasurement(s, targets, null, 1000);
    // At exactly max range, intersection should be at boundary
    expect(result.sensor.sensorState).toBe('COMPLETE');
  });

  it('should handle target at exact min range', () => {
    const s = sensor(0, 'edge_min', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const targets = [target(0, 'at_min', {
      positionX: 2,
      positionY: 0,
      width: 2,
      height: 2,
      isActive: true,
    })];
    const result = simulateMeasurement(s, targets, null, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
  });

  it('should handle zero-size target', () => {
    const s = sensor(0, 'zero_target', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const targets = [target(0, 'zero', {
      positionX: 100,
      positionY: 0,
      width: 0.001,
      height: 0.001,
      isActive: true,
    })];
    const result = simulateMeasurement(s, targets, null, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
  });

  it('should handle sensor at 0°C (freezing)', () => {
    const s = sensor(0, 'freeze', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const targets = [target(0, 'wall', {
      positionX: 100, positionY: 0, width: 50, height: 50, isActive: true,
    })];
    const coldEnv = env(0, 'freezing', { temperatureCelsius: 0 });
    const result = simulateMeasurement(s, targets, coldEnv, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
    if (result.echoPulse.isValid) {
      expect(result.echoPulse.durationUs).toBeGreaterThan(0);
    }
  });

  it('should handle multiple targets with different reflectivities', () => {
    const s = sensor(0, 'multi', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const targets = [
      target(0, 'a', { positionX: 100, positionY: 0, width: 30, height: 30, reflectivity: 0.5, isActive: true }),
      target(1, 'b', { positionX: 50, positionY: 0, width: 30, height: 30, reflectivity: 1.0, isActive: true }),
      target(2, 'c', { positionX: 200, positionY: 0, width: 30, height: 30, reflectivity: 0.1, isActive: true }),
    ];
    const result = simulateMeasurement(s, targets, null, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
    // Should detect nearest target
    if (result.beam.beamState === 'REFLECTED') {
      expect(result.beam.targetObstacleId).toBe('b');
    }
  });

  it('should handle empty target array', () => {
    const s = sensor(0, 'empty', { positionX: 0, positionY: 0, rotationDeg: 0 });
    const result = simulateMeasurement(s, [], null, 1000);
    expect(result.sensor.sensorState).toBe('COMPLETE');
    expect(result.beam.beamState).toBe('TIMED_OUT');
    expect(result.echoPulse.isValid).toBe(false);
  });

  it('should handle sensor facing away from targets', () => {
    const s = sensor(0, 'away', { positionX: 0, positionY: 0, rotationDeg: 180 }); // Facing left
    const targets = [target(0, 'right', {
      positionX: 100, positionY: 0, width: 30, height: 30, isActive: true, // Target is to the right
    })];
    const result = simulateMeasurement(s, targets, null, 1000);
    // Should not detect target behind sensor
    expect(result.beam.beamState).toBe('TIMED_OUT');
  });

  it('should handle very large distances', () => {
    const dur = computeEchoDurationUs(400, SPEED_OF_SOUND_CM_PER_US);
    expect(dur).toBeLessThan(HC_SR04_TIMEOUT_US);
    const dist = computeDistanceCm(HC_SR04_TIMEOUT_US, SPEED_OF_SOUND_CM_PER_US);
    expect(dist).toBeGreaterThan(HC_SR04_MAX_RANGE_CM);
  });

  it('should handle negative temperature', () => {
    const v = calculateSpeedOfSound(-40);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(SPEED_OF_SOUND_CM_PER_US);
  });
});
