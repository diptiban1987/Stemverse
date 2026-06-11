import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32ADCExecutionState, ESP32PWMExecutionState, ESP32ServoExecutionState, ESP32TouchExecutionState, SpriteState, StageState } from '../src/types';
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
  return { pwmId: id, runtimeId: `esp32_${i}`, channelId: `ch_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, frequencyHz: 1000 + i, resolutionBits: 8, dutyCycle: 0.5, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function servo(i: number, id = `servo_${i}`, overrides: Partial<ESP32ServoExecutionState> = {}): ESP32ServoExecutionState {
  return { servoId: id, runtimeId: `esp32_${i}`, angle: 90, attachedPinId: `GPIO${i % 40}`, attachedGPIO: i % 40, pulseWidth: { minPulseWidthUs: 500, maxPulseWidthUs: 2500 }, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function adc(i: number, id = `adc_${i}`, overrides: Partial<ESP32ADCExecutionState> = {}): ESP32ADCExecutionState {
  return { adcId: id, runtimeId: `esp32_${i}`, channelId: `adc_ch_${i}`, currentValue: 100, minValue: 0, maxValue: 4095, resolutionBits: 12, pinId: `GPIO${i % 40}`, gpio: i % 40, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function touch(i: number, id = `touch_${i}`, overrides: Partial<ESP32TouchExecutionState> = {}): ESP32TouchExecutionState {
  return { touchId: id, runtimeId: `esp32_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, touchCapable: true, touched: false, threshold: 40, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

describe('Phase 8F.1: Peripheral Registry Ownership Hardening', () => {
  describe('updateTouchState accessor', () => {
    for (let i = 0; i < 50; i++) {
      it(`updates touched state and refreshes HAL ${i}`, () => {
        const rt = runtime();
        rt.registerTouchExecutionState(touch(i));
        expect(rt.getTouchExecutionState(`touch_${i}`)!.touched).toBe(false);
        rt.updateTouchState(`touch_${i}`, true);
        expect(rt.getTouchExecutionState(`touch_${i}`)!.touched).toBe(true);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:touch`)!.signal.digitalValue).toBe(true);
        rt.updateTouchState(`touch_${i}`, false);
        expect(rt.getTouchExecutionState(`touch_${i}`)!.touched).toBe(false);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:touch`)!.signal.digitalValue).toBe(false);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`warns only for missing touch id on update ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.updateTouchState(`missing_${i}`, true)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('HAL cleanup on individual remove', () => {
    for (let i = 0; i < 30; i++) {
      it(`removeServoExecutionState removes HAL state ${i}`, () => {
        const rt = runtime();
        rt.registerServoExecutionState(servo(i));
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:servo`)).toBeDefined();
        rt.removeServoExecutionState(`servo_${i}`);
        expect(rt.getServoExecutionState(`servo_${i}`)).toBeUndefined();
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:servo`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`removeADCExecutionState removes HAL state ${i}`, () => {
        const rt = runtime();
        rt.registerADCExecutionState(adc(i));
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:adc`)).toBeDefined();
        rt.removeADCExecutionState(`adc_${i}`);
        expect(rt.getADCExecutionState(`adc_${i}`)).toBeUndefined();
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:adc`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`removeTouchExecutionState removes HAL state ${i}`, () => {
        const rt = runtime();
        rt.registerTouchExecutionState(touch(i));
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:touch`)).toBeDefined();
        rt.removeTouchExecutionState(`touch_${i}`);
        expect(rt.getTouchExecutionState(`touch_${i}`)).toBeUndefined();
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:touch`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`removePWMExecutionState removes HAL state and protocol state ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:pwm`)).toBeDefined();
        expect(rt.getProtocolState(`pwm_${i}`)).toBeDefined();
        rt.removePWMExecutionState(`pwm_${i}`);
        expect(rt.getPWMExecutionState(`pwm_${i}`)).toBeUndefined();
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:pwm`)).toBeUndefined();
        expect(rt.getProtocolState(`pwm_${i}`)).toBeUndefined();
      });
    }
  });

  describe('bulk clear cleanup consistency', () => {
    for (let i = 0; i < 20; i++) {
      it(`clearServoExecutionStates removes all HAL entries ${i}`, () => {
        const rt = runtime();
        for (let j = 0; j < 5; j++) rt.registerServoExecutionState(servo(i * 10 + j, `servo_${i}_${j}`, { runtimeId: `esp32_${i}` }));
        const halBefore = rt.getHALStates().filter(h => h.id.includes(':servo'));
        expect(halBefore.length).toBe(5);
        rt.clearServoExecutionStates();
        expect(rt.getServoExecutionStates()).toEqual([]);
        expect(rt.getHALStates().filter(h => h.id.includes(':servo'))).toEqual([]);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`clearADCExecutionStates removes all HAL entries ${i}`, () => {
        const rt = runtime();
        for (let j = 0; j < 5; j++) rt.registerADCExecutionState(adc(i * 10 + j, `adc_${i}_${j}`, { runtimeId: `esp32_${i}` }));
        const halBefore = rt.getHALStates().filter(h => h.id.includes(':adc'));
        expect(halBefore.length).toBe(5);
        rt.clearADCExecutionStates();
        expect(rt.getADCExecutionStates()).toEqual([]);
        expect(rt.getHALStates().filter(h => h.id.includes(':adc'))).toEqual([]);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`clearTouchExecutionStates removes all HAL entries ${i}`, () => {
        const rt = runtime();
        for (let j = 0; j < 5; j++) rt.registerTouchExecutionState(touch(i * 10 + j, `touch_${i}_${j}`, { runtimeId: `esp32_${i}` }));
        const halBefore = rt.getHALStates().filter(h => h.id.includes(':touch'));
        expect(halBefore.length).toBe(5);
        rt.clearTouchExecutionStates();
        expect(rt.getTouchExecutionStates()).toEqual([]);
        expect(rt.getHALStates().filter(h => h.id.includes(':touch'))).toEqual([]);
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`clearPWMExecutionStates removes all HAL and protocol entries ${i}`, () => {
        const rt = runtime();
        for (let j = 0; j < 5; j++) rt.registerPWMExecutionState(pwm(i * 10 + j, `pwm_${i}_${j}`, { runtimeId: `esp32_${i}` }));
        expect(rt.getPWMExecutionStates().length).toBe(5);
        rt.clearPWMExecutionStates();
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getHALStates().filter(h => h.id.includes(':pwm'))).toEqual([]);
        expect(rt.getPWMChannels()).toEqual([]);
      });
    }
  });

  describe('initialize cleanup', () => {
    for (let i = 0; i < 20; i++) {
      it(`initialize clears all peripheral and HAL state ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        rt.registerServoExecutionState(servo(i));
        rt.registerADCExecutionState(adc(i));
        rt.registerTouchExecutionState(touch(i));
        expect(rt.getPWMExecutionStates().length).toBe(1);
        expect(rt.getServoExecutionStates().length).toBe(1);
        expect(rt.getADCExecutionStates().length).toBe(1);
        expect(rt.getTouchExecutionStates().length).toBe(1);
        rt.initialize();
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getServoExecutionStates()).toEqual([]);
        expect(rt.getADCExecutionStates()).toEqual([]);
        expect(rt.getTouchExecutionStates()).toEqual([]);
        expect(rt.getHALStates()).toEqual([]);
      });
    }
  });

  describe('stop cleanup', () => {
    for (let i = 0; i < 15; i++) {
      it(`stop clears all peripheral state ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        rt.registerServoExecutionState(servo(i));
        rt.registerADCExecutionState(adc(i));
        rt.registerTouchExecutionState(touch(i));
        rt.start();
        rt.stop();
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getServoExecutionStates()).toEqual([]);
        expect(rt.getADCExecutionStates()).toEqual([]);
        expect(rt.getTouchExecutionStates()).toEqual([]);
      });
    }
  });

  describe('target removal cleanup', () => {
    for (let i = 0; i < 20; i++) {
      it(`removeTarget clears owned peripheral and HAL state ${i}`, () => {
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
        expect(rt.getHALStates().filter(h => h.id.includes(':pwm') || h.id.includes(':servo') || h.id.includes(':adc') || h.id.includes(':touch'))).toEqual([]);
      });
    }
  });

  describe('clone deletion cleanup', () => {
    for (let i = 0; i < 15; i++) {
      it(`deleteClone clears clone-owned peripheral and HAL state ${i}`, () => {
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
        expect(rt.getHALStates().filter(h => h.metadata?.pwmId === `clone_pwm_${i}` || h.metadata?.servoId === `clone_servo_${i}` || h.metadata?.adcId === `clone_adc_${i}` || h.metadata?.touchId === `clone_touch_${i}`)).toEqual([]);
      });
    }
  });

  describe('registry ownership invariants', () => {
    for (let i = 0; i < 10; i++) {
      it(`peripheral registries maintain deterministic ordering after mixed add/remove ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i, `pwm_a_${i}`));
        rt.registerPWMExecutionState(pwm(i, `pwm_b_${i}`));
        rt.registerServoExecutionState(servo(i, `servo_a_${i}`));
        rt.registerServoExecutionState(servo(i, `servo_b_${i}`));
        rt.registerADCExecutionState(adc(i, `adc_a_${i}`));
        rt.registerADCExecutionState(adc(i, `adc_b_${i}`));
        rt.registerTouchExecutionState(touch(i, `touch_a_${i}`));
        rt.registerTouchExecutionState(touch(i, `touch_b_${i}`));
        rt.removePWMExecutionState(`pwm_a_${i}`);
        rt.removeServoExecutionState(`servo_a_${i}`);
        rt.removeADCExecutionState(`adc_a_${i}`);
        rt.removeTouchExecutionState(`touch_a_${i}`);
        expect(rt.getPWMExecutionStates().map(s => s.pwmId)).toEqual([`pwm_b_${i}`]);
        expect(rt.getServoExecutionStates().map(s => s.servoId)).toEqual([`servo_b_${i}`]);
        expect(rt.getADCExecutionStates().map(s => s.adcId)).toEqual([`adc_b_${i}`]);
        expect(rt.getTouchExecutionStates().map(s => s.touchId)).toEqual([`touch_b_${i}`]);
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`no orphan HAL entries after full peripheral removal ${i}`, () => {
        const rt = runtime();
        rt.registerPWMExecutionState(pwm(i));
        rt.registerServoExecutionState(servo(i));
        rt.registerADCExecutionState(adc(i));
        rt.registerTouchExecutionState(touch(i));
        const halCount = rt.getHALStates().length;
        expect(halCount).toBeGreaterThan(0);
        rt.removePWMExecutionState(`pwm_${i}`);
        rt.removeServoExecutionState(`servo_${i}`);
        rt.removeADCExecutionState(`adc_${i}`);
        rt.removeTouchExecutionState(`touch_${i}`);
        expect(rt.getHALStates().filter(h => h.id.includes(':pwm') || h.id.includes(':servo') || h.id.includes(':adc') || h.id.includes(':touch'))).toEqual([]);
      });
    }
  });
});
