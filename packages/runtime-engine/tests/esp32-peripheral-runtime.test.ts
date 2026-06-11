import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32ADCExecutionState, ESP32PWMExecutionState, ESP32ServoExecutionState, ESP32TouchExecutionState, SpriteState, StageState } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function pwm(i: number, id = `pwm_${i}`, overrides: Partial<ESP32PWMExecutionState> = {}): ESP32PWMExecutionState {
  return { pwmId: id, runtimeId: `esp32_${i}`, channelId: `ch_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, frequencyHz: 1000 + i, resolutionBits: 8 + (i % 8), dutyCycle: (i % 100) / 100, targetId: 'stage', componentId: `component_${i}`, metadata: { nested: { value: i } }, ...overrides };
}

function servo(i: number, id = `servo_${i}`, overrides: Partial<ESP32ServoExecutionState> = {}): ESP32ServoExecutionState {
  return { servoId: id, runtimeId: `esp32_${i}`, angle: i % 181, attachedPinId: `GPIO${i % 40}`, attachedGPIO: i % 40, pulseWidth: { minPulseWidthUs: 500, maxPulseWidthUs: 2500, neutralPulseWidthUs: 1500 }, targetId: 'stage', componentId: `component_${i}`, metadata: { nested: { value: i } }, ...overrides };
}

function adc(i: number, id = `adc_${i}`, overrides: Partial<ESP32ADCExecutionState> = {}): ESP32ADCExecutionState {
  return { adcId: id, runtimeId: `esp32_${i}`, channelId: `adc_ch_${i}`, currentValue: i % 4096, minValue: 0, maxValue: 4095, resolutionBits: 12, pinId: `GPIO${i % 40}`, gpio: i % 40, targetId: 'stage', componentId: `component_${i}`, metadata: { nested: { value: i } }, ...overrides };
}

function touch(i: number, id = `touch_${i}`, overrides: Partial<ESP32TouchExecutionState> = {}): ESP32TouchExecutionState {
  return { touchId: id, runtimeId: `esp32_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, touchCapable: true, touched: i % 2 === 0, threshold: 20 + i, targetId: 'stage', componentId: `component_${i}`, metadata: { nested: { value: i } }, ...overrides };
}

describe('Phase 8F: ESP32 Peripheral Execution Foundation', () => {
  describe('PWM registry metadata', () => {
    for (let i = 0; i < 130; i++) {
      it(`creates looks up updates serializes and isolates PWM state ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        expect(rt.getPWMExecutionState(`pwm_${i}`)!.frequencyHz).toBe(1000 + i);
        rt.updatePWMDutyCycle(`pwm_${i}`, 0.75);
        expect(rt.getPWMExecutionState(`pwm_${i}`)!.dutyCycle).toBe(0.75);
        expect(rt.getPWMChannels()[0].channelId).toBe(`ch_${i}`);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:pwm`)!.signal.pwmValue).toBe(0.75);
        const exported = rt.exportProject();
        exported.targets.find(t => t.isStage)!.pwmRegistry![0].metadata.nested = { mutated: true };
        expect(rt.exportProject().targets.find(t => t.isStage)!.pwmRegistry![0].metadata.nested).toEqual({ value: i });
        const imported = runtime();
        imported.importProject(rt.exportProject());
        expect(imported.getPWMExecutionState(`pwm_${i}`)!.resolutionBits).toBe(8 + (i % 8));
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`warns only for duplicate malformed frequency and duty PWM state ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerPWMExecutionState(pwm(i, `dup_pwm_${i}`, { dutyCycle: 0.1 }));
        rt.registerPWMExecutionState(pwm(i, `dup_pwm_${i}`, { dutyCycle: 0.2 }));
        expect(rt.getPWMExecutionStates()).toHaveLength(1);
        expect(() => rt.registerPWMExecutionState(pwm(i, `bad_pwm_freq_${i}`, { frequencyHz: -1 }))).not.toThrow();
        expect(() => rt.registerPWMExecutionState(pwm(i, `bad_pwm_duty_${i}`, { dutyCycle: 2 }))).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('Servo registry metadata', () => {
    for (let i = 0; i < 120; i++) {
      it(`creates updates serializes and preserves clone-safe servo state ${i}`, () => {
        const rt = runtime();
        rt.registerServoExecutionState(servo(i));
        rt.updateServoAngle(`servo_${i}`, 90);
        expect(rt.getServoExecutionState(`servo_${i}`)!.angle).toBe(90);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:servo`)!.signal.pwmValue).toBe(0.5);
        const snap = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        snap.servoRegistry![0].pulseWidth.minPulseWidthUs = 1;
        expect(rt.getStageSnapshot().find(s => s.targetId === 'stage')!.servoRegistry![0].pulseWidth.minPulseWidthUs).toBe(500);
        const imported = runtime();
        imported.importProject(rt.exportProject());
        expect(imported.getServoExecutionState(`servo_${i}`)!.pulseWidth.maxPulseWidthUs).toBe(2500);
      });
    }

    for (let i = 0; i < 50; i++) {
      it(`warns only for invalid duplicate servo angle and pulse metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerServoExecutionState(servo(i, `dup_servo_${i}`, { angle: 10 }));
        rt.registerServoExecutionState(servo(i, `dup_servo_${i}`, { angle: 20 }));
        expect(rt.getServoExecutionState(`dup_servo_${i}`)!.angle).toBe(20);
        expect(() => rt.registerServoExecutionState(servo(i, `bad_servo_angle_${i}`, { angle: 181 }))).not.toThrow();
        expect(() => rt.registerServoExecutionState(servo(i, `bad_servo_pulse_${i}`, { pulseWidth: { minPulseWidthUs: 2500, maxPulseWidthUs: 500 } }))).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('ADC registry metadata', () => {
    for (let i = 0; i < 110; i++) {
      it(`stores ADC values validates range and round-trips ${i}`, () => {
        const rt = runtime();
        rt.registerADCExecutionState(adc(i));
        rt.updateADCValue(`adc_${i}`, 1234);
        expect(rt.getADCExecutionState(`adc_${i}`)!.currentValue).toBe(1234);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:adc`)!.signal.analogValue).toBe(1234);
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getADCExecutionState(`adc_${i}`)!.maxValue).toBe(4095);
        exported.targets.find(t => t.isStage)!.adcRegistry![0].metadata.nested = { mutated: true };
        expect(imported.getADCExecutionState(`adc_${i}`)!.metadata.nested).toEqual({ value: i });
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`warns only for invalid ADC ranges values and ids ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerADCExecutionState(adc(i, '', {}))).not.toThrow();
        expect(() => rt.registerADCExecutionState(adc(i, `bad_adc_range_${i}`, { minValue: 10, maxValue: 1 }))).not.toThrow();
        expect(() => rt.registerADCExecutionState(adc(i, `bad_adc_value_${i}`, { currentValue: 5000 }))).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('Touch registry metadata', () => {
    for (let i = 0; i < 100; i++) {
      it(`preserves touch capability state threshold snapshots and transport ${i}`, () => {
        const rt = runtime();
        rt.registerTouchExecutionState(touch(i));
        expect(rt.getTouchExecutionState(`touch_${i}`)!.touchCapable).toBe(true);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:touch`)!.metadata!.threshold).toBe(20 + i);
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        snapshot.find(s => s.targetId === 'stage')!.touchRegistry![0].metadata.nested = { mutated: true };
        expect(rt.getStageSnapshot().find(s => s.targetId === 'stage')!.touchRegistry![0].metadata.nested).toEqual({ value: i });
        const imported = runtime();
        imported.importProject(rt.exportProject());
        expect(imported.getTouchExecutionState(`touch_${i}`)!.threshold).toBe(20 + i);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`warns only for invalid touch threshold capability and duplicate metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerTouchExecutionState(touch(i, `dup_touch_${i}`, { threshold: 1 }));
        rt.registerTouchExecutionState(touch(i, `dup_touch_${i}`, { threshold: 2 }));
        expect(rt.getTouchExecutionState(`dup_touch_${i}`)!.threshold).toBe(2);
        expect(() => rt.registerTouchExecutionState(touch(i, `bad_touch_threshold_${i}`, { threshold: -1 }))).not.toThrow();
        expect(() => rt.registerTouchExecutionState(touch(i, `bad_touch_flags_${i}`, { touchCapable: 'yes' as any }))).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('Runtime ordering cleanup and deep-copy guarantees', () => {
    for (let i = 0; i < 30; i++) {
      it(`keeps deterministic registry ordering across all peripherals ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i, `pwm_${i}_a`));
        rt.registerServoExecutionState(servo(i, `servo_${i}_a`));
        rt.registerADCExecutionState(adc(i, `adc_${i}_a`));
        rt.registerTouchExecutionState(touch(i, `touch_${i}_a`));
        rt.registerPWMExecutionState(pwm(i, `pwm_${i}_b`));
        rt.registerServoExecutionState(servo(i, `servo_${i}_b`));
        rt.registerADCExecutionState(adc(i, `adc_${i}_b`));
        rt.registerTouchExecutionState(touch(i, `touch_${i}_b`));
        expect(rt.getPWMExecutionStates().map(s => s.pwmId)).toEqual([`pwm_${i}_a`, `pwm_${i}_b`]);
        expect(rt.getServoExecutionStates().map(s => s.servoId)).toEqual([`servo_${i}_a`, `servo_${i}_b`]);
        expect(rt.getADCExecutionStates().map(s => s.adcId)).toEqual([`adc_${i}_a`, `adc_${i}_b`]);
        expect(rt.getTouchExecutionStates().map(s => s.touchId)).toEqual([`touch_${i}_a`, `touch_${i}_b`]);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`cleans peripheral registries on target removal ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        rt.registerServoExecutionState(servo(i));
        rt.registerADCExecutionState(adc(i));
        rt.registerTouchExecutionState(touch(i));
        rt.removeTarget('stage');
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getServoExecutionStates()).toEqual([]);
        expect(rt.getADCExecutionStates()).toEqual([]);
        expect(rt.getTouchExecutionStates()).toEqual([]);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`cleans clone-owned peripheral registries on clone removal ${i}`, () => {
        const rt = runtime();
        const sprite: SpriteState = { id: `sprite_${i}`, name: 'Sprite', isStage: false, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' };
        rt.addTarget(sprite);
        rt.createCloneOf(`sprite_${i}`);
        const cloneId = `sprite_${i}_clone_0`;
        rt.registerPWMExecutionState(pwm(i, `clone_pwm_${i}`, { targetId: cloneId }));
        rt.registerServoExecutionState(servo(i, `clone_servo_${i}`, { targetId: cloneId }));
        rt.registerADCExecutionState(adc(i, `clone_adc_${i}`, { targetId: cloneId }));
        rt.registerTouchExecutionState(touch(i, `clone_touch_${i}`, { targetId: cloneId }));
        rt.deleteClone(cloneId);
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getServoExecutionStates()).toEqual([]);
        expect(rt.getADCExecutionStates()).toEqual([]);
        expect(rt.getTouchExecutionStates()).toEqual([]);
      });
    }
  });
});
