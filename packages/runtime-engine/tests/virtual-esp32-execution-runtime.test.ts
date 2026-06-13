import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  VirtualESP32Model,
  VirtualGPIOPinModel,
  VirtualPWMChannelModel,
  VirtualTimerModel,
  VirtualInterruptModel,
  VirtualExecutionSnapshot,
  GPIOPinMode,
  GPIOPinState,
  InterruptEdge,
  StageState,
} from '../src/types';
import {
  createDefaultVirtualESP32Model,
  createDefaultVirtualGPIOPinModel,
  createDefaultVirtualPWMChannelModel,
  createDefaultVirtualTimerModel,
  createDefaultVirtualInterruptModel,
  validateVirtualESP32Model,
  validateVirtualGPIOPinModel,
  validateVirtualPWMChannelModel,
  validateVirtualTimerModel,
  validateVirtualInterruptModel,
  validateDuplicateESP32Ids,
  validateDuplicateGPIOPinIds,
  validateDuplicatePWMChannelIds,
  validateDuplicateTimerIds,
  validateDuplicateInterruptIds,
  VirtualExecutionSynchronizer,
  applyPinMode,
  applyDigitalWrite,
  readDigitalPin,
  togglePin,
  shouldTriggerInterrupt,
  applyLedcAttachPin,
  applyLedcWrite,
  computeNormalizedDuty,
  advanceClock,
  tickTimers,
  ESP32_TOTAL_GPIO_PINS,
  ESP32_MAX_PWM_CHANNELS,
  ESP32_MAX_TIMERS,
  ESP32_DEFAULT_CLOCK_HZ,
  ESP32_DEFAULT_PWM_FREQUENCY,
  ESP32_DEFAULT_PWM_RESOLUTION,
  VALID_PIN_MODES,
  VALID_PIN_STATES,
  VALID_INTERRUPT_EDGES,
  VALID_EXECUTION_STATES,
  VALID_TIMER_STATES,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Helper: Stage State ─────────────────────────────────────────────────────

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    tempo: 60,
    videoState: 'off',
    ...overrides,
  };
}

// ─── Helper: Runtime Factory ──────────────────────────────────────────────────

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

// ─── Helper: Model Factories ──────────────────────────────────────────────────

function esp32(
  i: number,
  id = `esp32_${i}`,
  overrides: Partial<VirtualESP32Model> = {},
): VirtualESP32Model {
  return createDefaultVirtualESP32Model(id, {
    boardType: 'ESP32_DEVKIT_V1',
    executionState: 'IDLE',
    clockTickCount: i,
    virtualMillis: i * 10,
    virtualMicros: i * 10000,
    errorLog: [],
    futureESP32Hints: {},
    ...overrides,
  });
}

function gpioPin(
  i: number,
  id = `gpio_${i}`,
  overrides: Partial<VirtualGPIOPinModel> = {},
): VirtualGPIOPinModel {
  return createDefaultVirtualGPIOPinModel(id, {
    esp32Id: `esp32_${i}`,
    pinNumber: i % 40,
    pinMode: 'OUTPUT',
    pinState: 'LOW',
    previousState: 'LOW',
    isAnalog: false,
    analogValue: 0,
    pwmChannelId: '',
    interruptId: '',
    lastChangeTick: 0,
    futureGPIOHints: {},
    ...overrides,
  });
}

function pwmChannel(
  i: number,
  id = `pwm_${i}`,
  overrides: Partial<VirtualPWMChannelModel> = {},
): VirtualPWMChannelModel {
  return createDefaultVirtualPWMChannelModel(id, {
    esp32Id: `esp32_${i}`,
    channelNumber: i % 16,
    attachedPinNumber: i % 40,
    dutyCycle: 0,
    frequency: 5000,
    resolution: 8,
    maxDutyValue: 255,
    isActive: false,
    futurePWMHints: {},
    ...overrides,
  });
}

function timer(
  i: number,
  id = `timer_${i}`,
  overrides: Partial<VirtualTimerModel> = {},
): VirtualTimerModel {
  return createDefaultVirtualTimerModel(id, {
    esp32Id: `esp32_${i}`,
    timerState: 'IDLE',
    intervalMs: i * 100,
    isRepeating: false,
    elapsedMs: 0,
    triggerCount: 0,
    callbackId: `cb_${i}`,
    lastTriggerTick: 0,
    futureTimerHints: {},
    ...overrides,
  });
}

function interrupt(
  i: number,
  id = `int_${i}`,
  overrides: Partial<VirtualInterruptModel> = {},
): VirtualInterruptModel {
  return createDefaultVirtualInterruptModel(id, {
    esp32Id: `esp32_${i}`,
    pinNumber: i % 40,
    edge: 'RISING',
    isEnabled: true,
    triggerCount: 0,
    lastTriggerTick: 0,
    callbackId: `int_cb_${i}`,
    futureInterruptHints: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 21A -- Virtual ESP32 Execution Runtime
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 21A -- Virtual ESP32 Execution Runtime', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Model CRUD for all 5 model types
  // ═══════════════════════════════════════════════════════════════

  // ─── 1A: VirtualESP32Model CRUD ─────────────────────────────────────
  describe('1A -- VirtualESP32Model CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves ESP32 model ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i));
          const stored = rt.getVirtualESP32Model(`esp32_${i}`)!;
          expect(stored.esp32Id).toBe(`esp32_${i}`);
          expect(stored.boardType).toBe('ESP32_DEVKIT_V1');
          expect(stored.clockTickCount).toBe(i);
          expect(stored.virtualMillis).toBe(i * 10);
          expect(stored.executionState).toBe('IDLE');
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate ESP32 IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualESP32Model(esp32(i, `esp32_dup_${i}`, { boardType: 'Original' }));
          rt.registerVirtualESP32Model(esp32(i, `esp32_dup_${i}`, { boardType: 'Replaced' }));
          expect(rt.getVirtualESP32ModelKeys()).toEqual([`esp32_dup_${i}`]);
          expect(rt.getVirtualESP32Model(`esp32_dup_${i}`)!.boardType).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up ESP32 by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualESP32Model(`nonexistent_esp32_${i}`)).toBeUndefined();
          expect(rt.getVirtualESP32Model('')).toBeUndefined();
          expect(rt.getVirtualESP32ModelKeys()).toEqual([]);
          rt.registerVirtualESP32Model(esp32(i, `esp32_key_${i}`));
          expect(rt.getVirtualESP32ModelKeys()).toContain(`esp32_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVirtualESP32Model returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVirtualESP32Model(`esp32_present_${i}`)).toBe(false);
          rt.registerVirtualESP32Model(esp32(i, `esp32_present_${i}`));
          expect(rt.hasVirtualESP32Model(`esp32_present_${i}`)).toBe(true);
          rt.removeVirtualESP32Model(`esp32_present_${i}`);
          expect(rt.hasVirtualESP32Model(`esp32_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates ESP32 fields ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `esp32_upd_${i}`));
          rt.updateVirtualESP32Model(`esp32_upd_${i}`, { boardType: `updated_board_${i}`, clockTickCount: 999, futureESP32Hints: { updated: i } });
          const updated = rt.getVirtualESP32Model(`esp32_upd_${i}`)!;
          expect(updated.boardType).toBe(`updated_board_${i}`);
          expect(updated.clockTickCount).toBe(999);
          expect(updated.futureESP32Hints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets ESP32 deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `esp32_rm_${i}_a`));
          rt.registerVirtualESP32Model(esp32(i, `esp32_rm_${i}_b`));
          rt.removeVirtualESP32Model(`esp32_rm_${i}_a`);
          expect(rt.getVirtualESP32ModelKeys()).toEqual([`esp32_rm_${i}_b`]);
          rt.clearVirtualESP32Models();
          expect(rt.getVirtualESP32ModelKeys()).toEqual([]);
          rt.registerVirtualESP32Model(esp32(i, `esp32_rm_${i}_c`));
          rt.stop();
          expect(rt.getVirtualESP32ModelKeys()).toEqual([]);
          rt.registerVirtualESP32Model(esp32(i, `esp32_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVirtualESP32ModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty ESP32 ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVirtualESP32Model('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing ESP32 ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVirtualESP32Model(`esp32_missing_${i}`, { boardType: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('ESP32 validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed ESP32 ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVirtualESP32Model({ esp32Id: `esp32_bad_${i}` });
          expect(rt.getVirtualESP32Model(`esp32_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1B: VirtualGPIOPinModel CRUD ──────────────────────────────────────
  describe('1B -- VirtualGPIOPinModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves GPIO pin model ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i));
          const stored = rt.getVirtualGPIOPinModel(`gpio_${i}`)!;
          expect(stored.gpioPinId).toBe(`gpio_${i}`);
          expect(stored.esp32Id).toBe(`esp32_${i}`);
          expect(stored.pinNumber).toBe(i % 40);
          expect(stored.pinMode).toBe('OUTPUT');
          expect(stored.pinState).toBe('LOW');
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate GPIO pin IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_dup_${i}`, { esp32Id: 'Original' }));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_dup_${i}`, { esp32Id: 'Replaced' }));
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([`gpio_dup_${i}`]);
          expect(rt.getVirtualGPIOPinModel(`gpio_dup_${i}`)!.esp32Id).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up GPIO pin by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualGPIOPinModel(`nonexistent_gpio_${i}`)).toBeUndefined();
          expect(rt.getVirtualGPIOPinModel('')).toBeUndefined();
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([]);
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_key_${i}`));
          expect(rt.getVirtualGPIOPinModelKeys()).toContain(`gpio_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVirtualGPIOPinModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVirtualGPIOPinModel(`gpio_present_${i}`)).toBe(false);
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_present_${i}`));
          expect(rt.hasVirtualGPIOPinModel(`gpio_present_${i}`)).toBe(true);
          rt.removeVirtualGPIOPinModel(`gpio_present_${i}`);
          expect(rt.hasVirtualGPIOPinModel(`gpio_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates GPIO pin fields ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_upd_${i}`));
          rt.updateVirtualGPIOPinModel(`gpio_upd_${i}`, { esp32Id: `updated_esp32_${i}`, pinNumber: 39, futureGPIOHints: { updated: i } });
          const updated = rt.getVirtualGPIOPinModel(`gpio_upd_${i}`)!;
          expect(updated.esp32Id).toBe(`updated_esp32_${i}`);
          expect(updated.pinNumber).toBe(39);
          expect(updated.futureGPIOHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets GPIO pin deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_rm_${i}_a`));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_rm_${i}_b`));
          rt.removeVirtualGPIOPinModel(`gpio_rm_${i}_a`);
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([`gpio_rm_${i}_b`]);
          rt.clearVirtualGPIOPinModels();
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([]);
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_rm_${i}_c`));
          rt.stop();
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([]);
          rt.registerVirtualGPIOPinModel(gpioPin(i, `gpio_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty GPIO pin ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVirtualGPIOPinModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing GPIO pin ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVirtualGPIOPinModel(`gpio_missing_${i}`, { esp32Id: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('GPIO pin validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed GPIO pin ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVirtualGPIOPinModel({ gpioPinId: `gpio_bad_${i}` });
          expect(rt.getVirtualGPIOPinModel(`gpio_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1C: VirtualPWMChannelModel CRUD ───────────────────────────────────
  describe('1C -- VirtualPWMChannelModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves PWM channel model ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i));
          const stored = rt.getVirtualPWMChannelModel(`pwm_${i}`)!;
          expect(stored.pwmChannelId).toBe(`pwm_${i}`);
          expect(stored.esp32Id).toBe(`esp32_${i}`);
          expect(stored.channelNumber).toBe(i % 16);
          expect(stored.frequency).toBe(5000);
          expect(stored.isActive).toBe(false);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate PWM channel IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_dup_${i}`, { esp32Id: 'Original' }));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_dup_${i}`, { esp32Id: 'Replaced' }));
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([`pwm_dup_${i}`]);
          expect(rt.getVirtualPWMChannelModel(`pwm_dup_${i}`)!.esp32Id).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up PWM channel by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualPWMChannelModel(`nonexistent_pwm_${i}`)).toBeUndefined();
          expect(rt.getVirtualPWMChannelModel('')).toBeUndefined();
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([]);
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_key_${i}`));
          expect(rt.getVirtualPWMChannelModelKeys()).toContain(`pwm_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVirtualPWMChannelModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVirtualPWMChannelModel(`pwm_present_${i}`)).toBe(false);
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_present_${i}`));
          expect(rt.hasVirtualPWMChannelModel(`pwm_present_${i}`)).toBe(true);
          rt.removeVirtualPWMChannelModel(`pwm_present_${i}`);
          expect(rt.hasVirtualPWMChannelModel(`pwm_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates PWM channel fields ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_upd_${i}`));
          rt.updateVirtualPWMChannelModel(`pwm_upd_${i}`, { esp32Id: `updated_esp32_${i}`, frequency: 10000, futurePWMHints: { updated: i } });
          const updated = rt.getVirtualPWMChannelModel(`pwm_upd_${i}`)!;
          expect(updated.esp32Id).toBe(`updated_esp32_${i}`);
          expect(updated.frequency).toBe(10000);
          expect(updated.futurePWMHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets PWM channel deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_rm_${i}_a`));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_rm_${i}_b`));
          rt.removeVirtualPWMChannelModel(`pwm_rm_${i}_a`);
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([`pwm_rm_${i}_b`]);
          rt.clearVirtualPWMChannelModels();
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([]);
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_rm_${i}_c`));
          rt.stop();
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([]);
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `pwm_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty PWM channel ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVirtualPWMChannelModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing PWM channel ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVirtualPWMChannelModel(`pwm_missing_${i}`, { esp32Id: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('PWM channel validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed PWM channel ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVirtualPWMChannelModel({ pwmChannelId: `pwm_bad_${i}` });
          expect(rt.getVirtualPWMChannelModel(`pwm_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1D: VirtualTimerModel CRUD ─────────────────────────────────────
  describe('1D -- VirtualTimerModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves timer model ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i));
          const stored = rt.getVirtualTimerModel(`timer_${i}`)!;
          expect(stored.timerId).toBe(`timer_${i}`);
          expect(stored.esp32Id).toBe(`esp32_${i}`);
          expect(stored.timerState).toBe('IDLE');
          expect(stored.intervalMs).toBe(i * 100);
          expect(stored.callbackId).toBe(`cb_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate timer IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualTimerModel(timer(i, `timer_dup_${i}`, { esp32Id: 'Original' }));
          rt.registerVirtualTimerModel(timer(i, `timer_dup_${i}`, { esp32Id: 'Replaced' }));
          expect(rt.getVirtualTimerModelKeys()).toEqual([`timer_dup_${i}`]);
          expect(rt.getVirtualTimerModel(`timer_dup_${i}`)!.esp32Id).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up timer by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualTimerModel(`nonexistent_timer_${i}`)).toBeUndefined();
          expect(rt.getVirtualTimerModel('')).toBeUndefined();
          expect(rt.getVirtualTimerModelKeys()).toEqual([]);
          rt.registerVirtualTimerModel(timer(i, `timer_key_${i}`));
          expect(rt.getVirtualTimerModelKeys()).toContain(`timer_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVirtualTimerModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVirtualTimerModel(`timer_present_${i}`)).toBe(false);
          rt.registerVirtualTimerModel(timer(i, `timer_present_${i}`));
          expect(rt.hasVirtualTimerModel(`timer_present_${i}`)).toBe(true);
          rt.removeVirtualTimerModel(`timer_present_${i}`);
          expect(rt.hasVirtualTimerModel(`timer_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates timer fields ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i, `timer_upd_${i}`));
          rt.updateVirtualTimerModel(`timer_upd_${i}`, { esp32Id: `updated_esp32_${i}`, intervalMs: 9999, futureTimerHints: { updated: i } });
          const updated = rt.getVirtualTimerModel(`timer_upd_${i}`)!;
          expect(updated.esp32Id).toBe(`updated_esp32_${i}`);
          expect(updated.intervalMs).toBe(9999);
          expect(updated.futureTimerHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets timer deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i, `timer_rm_${i}_a`));
          rt.registerVirtualTimerModel(timer(i, `timer_rm_${i}_b`));
          rt.removeVirtualTimerModel(`timer_rm_${i}_a`);
          expect(rt.getVirtualTimerModelKeys()).toEqual([`timer_rm_${i}_b`]);
          rt.clearVirtualTimerModels();
          expect(rt.getVirtualTimerModelKeys()).toEqual([]);
          rt.registerVirtualTimerModel(timer(i, `timer_rm_${i}_c`));
          rt.stop();
          expect(rt.getVirtualTimerModelKeys()).toEqual([]);
          rt.registerVirtualTimerModel(timer(i, `timer_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVirtualTimerModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty timer ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVirtualTimerModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing timer ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVirtualTimerModel(`timer_missing_${i}`, { esp32Id: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('timer validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed timer ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVirtualTimerModel({ timerId: `timer_bad_${i}` });
          expect(rt.getVirtualTimerModel(`timer_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1E: VirtualInterruptModel CRUD ─────────────────────────────────────
  describe('1E -- VirtualInterruptModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves interrupt model ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i));
          const stored = rt.getVirtualInterruptModel(`int_${i}`)!;
          expect(stored.interruptId).toBe(`int_${i}`);
          expect(stored.esp32Id).toBe(`esp32_${i}`);
          expect(stored.pinNumber).toBe(i % 40);
          expect(stored.edge).toBe('RISING');
          expect(stored.isEnabled).toBe(true);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate interrupt IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVirtualInterruptModel(interrupt(i, `int_dup_${i}`, { esp32Id: 'Original' }));
          rt.registerVirtualInterruptModel(interrupt(i, `int_dup_${i}`, { esp32Id: 'Replaced' }));
          expect(rt.getVirtualInterruptModelKeys()).toEqual([`int_dup_${i}`]);
          expect(rt.getVirtualInterruptModel(`int_dup_${i}`)!.esp32Id).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up interrupt by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVirtualInterruptModel(`nonexistent_int_${i}`)).toBeUndefined();
          expect(rt.getVirtualInterruptModel('')).toBeUndefined();
          expect(rt.getVirtualInterruptModelKeys()).toEqual([]);
          rt.registerVirtualInterruptModel(interrupt(i, `int_key_${i}`));
          expect(rt.getVirtualInterruptModelKeys()).toContain(`int_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVirtualInterruptModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVirtualInterruptModel(`int_present_${i}`)).toBe(false);
          rt.registerVirtualInterruptModel(interrupt(i, `int_present_${i}`));
          expect(rt.hasVirtualInterruptModel(`int_present_${i}`)).toBe(true);
          rt.removeVirtualInterruptModel(`int_present_${i}`);
          expect(rt.hasVirtualInterruptModel(`int_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates interrupt fields ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i, `int_upd_${i}`));
          rt.updateVirtualInterruptModel(`int_upd_${i}`, { esp32Id: `updated_esp32_${i}`, edge: 'FALLING', futureInterruptHints: { updated: i } });
          const updated = rt.getVirtualInterruptModel(`int_upd_${i}`)!;
          expect(updated.esp32Id).toBe(`updated_esp32_${i}`);
          expect(updated.edge).toBe('FALLING');
          expect(updated.futureInterruptHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets interrupt deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i, `int_rm_${i}_a`));
          rt.registerVirtualInterruptModel(interrupt(i, `int_rm_${i}_b`));
          rt.removeVirtualInterruptModel(`int_rm_${i}_a`);
          expect(rt.getVirtualInterruptModelKeys()).toEqual([`int_rm_${i}_b`]);
          rt.clearVirtualInterruptModels();
          expect(rt.getVirtualInterruptModelKeys()).toEqual([]);
          rt.registerVirtualInterruptModel(interrupt(i, `int_rm_${i}_c`));
          rt.stop();
          expect(rt.getVirtualInterruptModelKeys()).toEqual([]);
          rt.registerVirtualInterruptModel(interrupt(i, `int_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVirtualInterruptModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty interrupt ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVirtualInterruptModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing interrupt ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVirtualInterruptModel(`int_missing_${i}`, { esp32Id: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('interrupt validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed interrupt ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVirtualInterruptModel({ interruptId: `int_bad_${i}` });
          expect(rt.getVirtualInterruptModel(`int_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory Defaults and Overrides
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Factory Defaults and Overrides', () => {
    it('createDefaultVirtualESP32Model returns correct defaults', () => {
      const m = createDefaultVirtualESP32Model('default_esp32');
      expect(m.esp32Id).toBe('default_esp32');
      expect(m.boardType).toBe('ESP32_DEVKIT_V1');
      expect(m.executionState).toBe('IDLE');
      expect(m.clockTickCount).toBe(0);
      expect(m.virtualMillis).toBe(0);
      expect(m.virtualMicros).toBe(0);
      expect(m.clockSpeedHz).toBe(ESP32_DEFAULT_CLOCK_HZ);
      expect(m.totalGPIOPins).toBe(ESP32_TOTAL_GPIO_PINS);
      expect(m.maxPWMChannels).toBe(ESP32_MAX_PWM_CHANNELS);
      expect(m.maxTimers).toBe(ESP32_MAX_TIMERS);
      expect(m.errorLog).toEqual([]);
      expect(m.futureESP32Hints).toBeDefined();
    });

    it('createDefaultVirtualGPIOPinModel returns correct defaults', () => {
      const m = createDefaultVirtualGPIOPinModel('default_gpio');
      expect(m.gpioPinId).toBe('default_gpio');
      expect(m.esp32Id).toBe('');
      expect(m.pinNumber).toBe(0);
      expect(m.pinMode).toBe('UNSET');
      expect(m.pinState).toBe('FLOATING');
      expect(m.previousState).toBe('FLOATING');
      expect(m.isAnalog).toBe(false);
      expect(m.analogValue).toBe(0);
      expect(m.pwmChannelId).toBe('');
      expect(m.interruptId).toBe('');
      expect(m.lastChangeTick).toBe(0);
      expect(m.futureGPIOHints).toBeDefined();
    });

    it('createDefaultVirtualPWMChannelModel returns correct defaults', () => {
      const m = createDefaultVirtualPWMChannelModel('default_pwm');
      expect(m.pwmChannelId).toBe('default_pwm');
      expect(m.esp32Id).toBe('');
      expect(m.channelNumber).toBe(0);
      expect(m.attachedPinNumber).toBe(-1);
      expect(m.dutyCycle).toBe(0);
      expect(m.frequency).toBe(ESP32_DEFAULT_PWM_FREQUENCY);
      expect(m.resolution).toBe(ESP32_DEFAULT_PWM_RESOLUTION);
      expect(m.maxDutyValue).toBe((1 << ESP32_DEFAULT_PWM_RESOLUTION) - 1);
      expect(m.isActive).toBe(false);
      expect(m.futurePWMHints).toBeDefined();
    });

    it('createDefaultVirtualTimerModel returns correct defaults', () => {
      const m = createDefaultVirtualTimerModel('default_timer');
      expect(m.timerId).toBe('default_timer');
      expect(m.esp32Id).toBe('');
      expect(m.timerState).toBe('IDLE');
      expect(m.intervalMs).toBe(0);
      expect(m.isRepeating).toBe(false);
      expect(m.elapsedMs).toBe(0);
      expect(m.triggerCount).toBe(0);
      expect(m.callbackId).toBe('');
      expect(m.lastTriggerTick).toBe(0);
      expect(m.futureTimerHints).toBeDefined();
    });

    it('createDefaultVirtualInterruptModel returns correct defaults', () => {
      const m = createDefaultVirtualInterruptModel('default_int');
      expect(m.interruptId).toBe('default_int');
      expect(m.esp32Id).toBe('');
      expect(m.pinNumber).toBe(0);
      expect(m.edge).toBe('NONE');
      expect(m.isEnabled).toBe(false);
      expect(m.triggerCount).toBe(0);
      expect(m.lastTriggerTick).toBe(0);
      expect(m.callbackId).toBe('');
      expect(m.futureInterruptHints).toBeDefined();
    });

    for (let i = 0; i < 100; i++) {
      it(`VirtualESP32Model factory override iteration ${i}`, () => {
        const states: ('IDLE' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR')[] = ['IDLE', 'RUNNING', 'PAUSED', 'HALTED', 'ERROR'];
        const es = states[i % states.length];
        const m = createDefaultVirtualESP32Model(`esp32_factory_${i}`, {
          boardType: `board_${i}`,
          executionState: es,
          clockTickCount: i * 5,
          virtualMillis: i * 50,
          virtualMicros: i * 50000,
          futureESP32Hints: { index: i },
        });
        expect(m.esp32Id).toBe(`esp32_factory_${i}`);
        expect(m.boardType).toBe(`board_${i}`);
        expect(m.executionState).toBe(es);
        expect(m.clockTickCount).toBe(i * 5);
        expect(m.futureESP32Hints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`VirtualGPIOPinModel factory override iteration ${i}`, () => {
        const modes: GPIOPinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'UNSET'];
        const mode = modes[i % modes.length];
        const m = createDefaultVirtualGPIOPinModel(`gpio_factory_${i}`, {
          esp32Id: `esp32_override_${i}`,
          pinNumber: i % 40,
          pinMode: mode,
          pinState: 'HIGH',
          futureGPIOHints: { index: i },
        });
        expect(m.gpioPinId).toBe(`gpio_factory_${i}`);
        expect(m.esp32Id).toBe(`esp32_override_${i}`);
        expect(m.pinMode).toBe(mode);
        expect(m.pinState).toBe('HIGH');
        expect(m.futureGPIOHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`VirtualPWMChannelModel factory override iteration ${i}`, () => {
        const m = createDefaultVirtualPWMChannelModel(`pwm_factory_${i}`, {
          esp32Id: `esp32_override_${i}`,
          channelNumber: i % 16,
          attachedPinNumber: i % 40,
          dutyCycle: Math.min(1, i * 0.01),
          frequency: 10000,
          resolution: 10,
          isActive: i % 2 === 0,
          futurePWMHints: { index: i },
        });
        expect(m.pwmChannelId).toBe(`pwm_factory_${i}`);
        expect(m.esp32Id).toBe(`esp32_override_${i}`);
        expect(m.frequency).toBe(10000);
        expect(m.resolution).toBe(10);
        expect(m.isActive).toBe(i % 2 === 0);
        expect(m.futurePWMHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`VirtualTimerModel factory override iteration ${i}`, () => {
        const states: ('IDLE' | 'RUNNING' | 'PAUSED' | 'EXPIRED')[] = ['IDLE', 'RUNNING', 'PAUSED', 'EXPIRED'];
        const ts = states[i % states.length];
        const m = createDefaultVirtualTimerModel(`timer_factory_${i}`, {
          esp32Id: `esp32_override_${i}`,
          timerState: ts,
          intervalMs: i * 50,
          isRepeating: i % 2 === 0,
          callbackId: `factory_cb_${i}`,
          futureTimerHints: { index: i },
        });
        expect(m.timerId).toBe(`timer_factory_${i}`);
        expect(m.esp32Id).toBe(`esp32_override_${i}`);
        expect(m.timerState).toBe(ts);
        expect(m.isRepeating).toBe(i % 2 === 0);
        expect(m.futureTimerHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`VirtualInterruptModel factory override iteration ${i}`, () => {
        const edges: InterruptEdge[] = ['RISING', 'FALLING', 'CHANGE', 'NONE'];
        const edge = edges[i % edges.length];
        const m = createDefaultVirtualInterruptModel(`int_factory_${i}`, {
          esp32Id: `esp32_override_${i}`,
          pinNumber: i % 40,
          edge,
          isEnabled: i % 2 === 0,
          callbackId: `factory_int_cb_${i}`,
          futureInterruptHints: { index: i },
        });
        expect(m.interruptId).toBe(`int_factory_${i}`);
        expect(m.esp32Id).toBe(`esp32_override_${i}`);
        expect(m.edge).toBe(edge);
        expect(m.isEnabled).toBe(i % 2 === 0);
        expect(m.futureInterruptHints.index).toBe(i);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validators
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Validators', () => {
    describe('validateVirtualESP32Model', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty esp32Id (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(
          createDefaultVirtualESP32Model('', { boardType: 'ESP32_DEVKIT_V1' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty boardType (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(
          createDefaultVirtualESP32Model('e1', { boardType: '' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid executionState (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(
          createDefaultVirtualESP32Model('e2', { executionState: 'BOGUS' as any }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid clockSpeedHz (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(
          createDefaultVirtualESP32Model('e3', { clockSpeedHz: -1 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid ESP32 model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualESP32Model(esp32(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateVirtualGPIOPinModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty gpioPinId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(
          createDefaultVirtualGPIOPinModel('', { esp32Id: 'e1', pinNumber: 0, pinMode: 'OUTPUT', pinState: 'LOW' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty esp32Id (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(
          createDefaultVirtualGPIOPinModel('g1', { esp32Id: '', pinNumber: 0, pinMode: 'OUTPUT', pinState: 'LOW' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid pinNumber (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(
          createDefaultVirtualGPIOPinModel('g2', { esp32Id: 'e1', pinNumber: -1, pinMode: 'OUTPUT', pinState: 'LOW' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid pinMode (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(
          createDefaultVirtualGPIOPinModel('g3', { esp32Id: 'e1', pinNumber: 0, pinMode: 'BOGUS' as any, pinState: 'LOW' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid pinState (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(
          createDefaultVirtualGPIOPinModel('g4', { esp32Id: 'e1', pinNumber: 0, pinMode: 'OUTPUT', pinState: 'BOGUS' as any }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid GPIO pin model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualGPIOPinModel(gpioPin(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateVirtualPWMChannelModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty pwmChannelId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(
          createDefaultVirtualPWMChannelModel('', { esp32Id: 'e1', channelNumber: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty esp32Id (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(
          createDefaultVirtualPWMChannelModel('p1', { esp32Id: '', channelNumber: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid channelNumber (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(
          createDefaultVirtualPWMChannelModel('p2', { esp32Id: 'e1', channelNumber: -1 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid frequency (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(
          createDefaultVirtualPWMChannelModel('p3', { esp32Id: 'e1', channelNumber: 0, frequency: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid resolution (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(
          createDefaultVirtualPWMChannelModel('p4', { esp32Id: 'e1', channelNumber: 0, resolution: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid PWM channel model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualPWMChannelModel(pwmChannel(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateVirtualTimerModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty timerId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(
          createDefaultVirtualTimerModel('', { esp32Id: 'e1', timerState: 'IDLE', intervalMs: 100 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty esp32Id (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(
          createDefaultVirtualTimerModel('t1', { esp32Id: '', timerState: 'IDLE', intervalMs: 100 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid timerState (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(
          createDefaultVirtualTimerModel('t2', { esp32Id: 'e1', timerState: 'BOGUS' as any, intervalMs: 100 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for negative intervalMs (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(
          createDefaultVirtualTimerModel('t3', { esp32Id: 'e1', timerState: 'IDLE', intervalMs: -1 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid timer model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualTimerModel(timer(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateVirtualInterruptModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty interruptId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(
          createDefaultVirtualInterruptModel('', { esp32Id: 'e1', pinNumber: 0, edge: 'RISING' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty esp32Id (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(
          createDefaultVirtualInterruptModel('i1', { esp32Id: '', pinNumber: 0, edge: 'RISING' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid pinNumber (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(
          createDefaultVirtualInterruptModel('i2', { esp32Id: 'e1', pinNumber: -1, edge: 'RISING' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid edge (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(
          createDefaultVirtualInterruptModel('i3', { esp32Id: 'e1', pinNumber: 0, edge: 'BOGUS' as any }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid interrupt model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVirtualInterruptModel(interrupt(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('duplicate ID validators', () => {
      it('validateDuplicateESP32Ids warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [esp32(1, 'dup_esp32'), esp32(2, 'dup_esp32')];
        const warnings = validateDuplicateESP32Ids(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateGPIOPinIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [gpioPin(1, 'dup_gpio'), gpioPin(2, 'dup_gpio')];
        const warnings = validateDuplicateGPIOPinIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicatePWMChannelIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [pwmChannel(1, 'dup_pwm'), pwmChannel(2, 'dup_pwm')];
        const warnings = validateDuplicatePWMChannelIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateTimerIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [timer(1, 'dup_timer'), timer(2, 'dup_timer')];
        const warnings = validateDuplicateTimerIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateInterruptIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [interrupt(1, 'dup_int'), interrupt(2, 'dup_int')];
        const warnings = validateDuplicateInterruptIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: VirtualExecutionSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- VirtualExecutionSynchronizer', () => {
    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 100; i++) {
        it(`builds snapshot with all 5 model types ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const esp32Models = [esp32(i, `s_esp32_${i}`)];
          const gpioPins = [gpioPin(i, `s_gpio_${i}`)];
          const pwmChannels = [pwmChannel(i, `s_pwm_${i}`)];
          const timers = [timer(i, `s_timer_${i}`)];
          const interrupts = [interrupt(i, `s_int_${i}`)];

          const snap = ss.buildSnapshot(esp32Models, gpioPins, pwmChannels, timers, interrupts);

          expect(snap.esp32Models).toHaveLength(1);
          expect(snap.gpioPins).toHaveLength(1);
          expect(snap.pwmChannels).toHaveLength(1);
          expect(snap.timers).toHaveLength(1);
          expect(snap.interrupts).toHaveLength(1);

          expect(snap.esp32Models![0].esp32Id).toBe(`s_esp32_${i}`);
          expect(snap.gpioPins![0].gpioPinId).toBe(`s_gpio_${i}`);
          expect(snap.pwmChannels![0].pwmChannelId).toBe(`s_pwm_${i}`);
          expect(snap.timers![0].timerId).toBe(`s_timer_${i}`);
          expect(snap.interrupts![0].interruptId).toBe(`s_int_${i}`);

          ss.clear();
          expect(ss.esp32s.getAll()).toHaveLength(0);
          expect(ss.gpioPins.getAll()).toHaveLength(0);
          expect(ss.pwmChannels.getAll()).toHaveLength(0);
          expect(ss.timers.getAll()).toHaveLength(0);
          expect(ss.interrupts.getAll()).toHaveLength(0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate ESP32 IDs ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [esp32(i, `dup_e_${i}`), esp32(i, `dup_e_${i}`)];
          ss.buildSnapshot(duplicate, [], [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate GPIO pin IDs ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [gpioPin(i, `dup_g_${i}`), gpioPin(i, `dup_g_${i}`)];
          ss.buildSnapshot([], duplicate, [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate PWM channel IDs ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [pwmChannel(i, `dup_p_${i}`), pwmChannel(i, `dup_p_${i}`)];
          ss.buildSnapshot([], [], duplicate, [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate timer IDs ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [timer(i, `dup_t_${i}`), timer(i, `dup_t_${i}`)];
          ss.buildSnapshot([], [], [], duplicate, []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate interrupt IDs ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [interrupt(i, `dup_i_${i}`), interrupt(i, `dup_i_${i}`)];
          ss.buildSnapshot([], [], [], [], duplicate);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('synchronizer cloning and serialization', () => {
      for (let i = 0; i < 100; i++) {
        it(`clones VirtualExecutionSynchronizer state accurately ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          ss.buildSnapshot(
            [esp32(i, `c_esp32_${i}`)],
            [gpioPin(i, `c_gpio_${i}`)],
            [pwmChannel(i, `c_pwm_${i}`)],
            [timer(i, `c_timer_${i}`)],
            [interrupt(i, `c_int_${i}`)],
          );
          const cloned = ss.clone();

          expect(cloned.esp32s.lookup(`c_esp32_${i}`)!.esp32Id).toBe(`c_esp32_${i}`);
          expect(cloned.gpioPins.lookup(`c_gpio_${i}`)!.gpioPinId).toBe(`c_gpio_${i}`);
          expect(cloned.pwmChannels.lookup(`c_pwm_${i}`)!.pwmChannelId).toBe(`c_pwm_${i}`);
          expect(cloned.timers.lookup(`c_timer_${i}`)!.timerId).toBe(`c_timer_${i}`);
          expect(cloned.interrupts.lookup(`c_int_${i}`)!.interruptId).toBe(`c_int_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`serializes and restores VirtualExecutionSynchronizer via JSON ${i}`, () => {
          const ss = new VirtualExecutionSynchronizer();
          ss.buildSnapshot(
            [esp32(i, `j_esp32_${i}`)],
            [gpioPin(i, `j_gpio_${i}`)],
            [pwmChannel(i, `j_pwm_${i}`)],
            [timer(i, `j_timer_${i}`)],
            [interrupt(i, `j_int_${i}`)],
          );
          const json = ss.toJSON();

          const restored = new VirtualExecutionSynchronizer();
          restored.fromJSON(json);

          expect(restored.esp32s.lookup(`j_esp32_${i}`)!.esp32Id).toBe(`j_esp32_${i}`);
          expect(restored.gpioPins.lookup(`j_gpio_${i}`)!.gpioPinId).toBe(`j_gpio_${i}`);
          expect(restored.pwmChannels.lookup(`j_pwm_${i}`)!.pwmChannelId).toBe(`j_pwm_${i}`);
          expect(restored.timers.lookup(`j_timer_${i}`)!.timerId).toBe(`j_timer_${i}`);
          expect(restored.interrupts.lookup(`j_int_${i}`)!.interruptId).toBe(`j_int_${i}`);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Lifecycle Integration', () => {
    describe('stop clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`stop() clears all ESP32 registries ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `lc_stop_esp32_${i}`));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `lc_stop_gpio_${i}`));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `lc_stop_pwm_${i}`));
          rt.registerVirtualTimerModel(timer(i, `lc_stop_timer_${i}`));
          rt.registerVirtualInterruptModel(interrupt(i, `lc_stop_int_${i}`));

          rt.stop();

          expect(rt.getVirtualESP32Models()).toEqual([]);
          expect(rt.getVirtualGPIOPinModels()).toEqual([]);
          expect(rt.getVirtualPWMChannelModels()).toEqual([]);
          expect(rt.getVirtualTimerModels()).toEqual([]);
          expect(rt.getVirtualInterruptModels()).toEqual([]);
        });
      }
    });

    describe('initialize clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`initialize() clears all ESP32 registries ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `lc_init_esp32_${i}`));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `lc_init_gpio_${i}`));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `lc_init_pwm_${i}`));
          rt.registerVirtualTimerModel(timer(i, `lc_init_timer_${i}`));
          rt.registerVirtualInterruptModel(interrupt(i, `lc_init_int_${i}`));

          rt.initialize();

          expect(rt.getVirtualESP32Models()).toEqual([]);
          expect(rt.getVirtualGPIOPinModels()).toEqual([]);
          expect(rt.getVirtualPWMChannelModels()).toEqual([]);
          expect(rt.getVirtualTimerModels()).toEqual([]);
          expect(rt.getVirtualInterruptModels()).toEqual([]);
        });
      }
    });

    describe('stop then initialize clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`stop()+initialize() clears all ESP32 registries ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `lc_reset_esp32_${i}`));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `lc_reset_gpio_${i}`));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `lc_reset_pwm_${i}`));
          rt.registerVirtualTimerModel(timer(i, `lc_reset_timer_${i}`));
          rt.registerVirtualInterruptModel(interrupt(i, `lc_reset_int_${i}`));

          rt.stop();
          rt.initialize();

          expect(rt.getVirtualESP32Models()).toEqual([]);
          expect(rt.getVirtualGPIOPinModels()).toEqual([]);
          expect(rt.getVirtualPWMChannelModels()).toEqual([]);
          expect(rt.getVirtualTimerModels()).toEqual([]);
          expect(rt.getVirtualInterruptModels()).toEqual([]);
        });
      }
    });

    describe('destroy via stop verifies empty keys', () => {
      for (let i = 0; i < 100; i++) {
        it(`after stop(), all ESP32 model keys are empty ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `lc_dest_esp32_${i}`));
          rt.registerVirtualGPIOPinModel(gpioPin(i, `lc_dest_gpio_${i}`));
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `lc_dest_pwm_${i}`));
          rt.registerVirtualTimerModel(timer(i, `lc_dest_timer_${i}`));
          rt.registerVirtualInterruptModel(interrupt(i, `lc_dest_int_${i}`));

          rt.stop();

          expect(rt.getVirtualESP32ModelKeys()).toEqual([]);
          expect(rt.getVirtualGPIOPinModelKeys()).toEqual([]);
          expect(rt.getVirtualPWMChannelModelKeys()).toEqual([]);
          expect(rt.getVirtualTimerModelKeys()).toEqual([]);
          expect(rt.getVirtualInterruptModelKeys()).toEqual([]);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Stage Snapshot Synchronization', () => {
    describe('virtualESP32Models in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`ESP32 model appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `snap_esp32_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.virtualESP32Models).toBeDefined();
          expect(stage.virtualESP32Models!.length).toBeGreaterThan(0);
          expect(stage.virtualESP32Models![0].esp32Id).toBe(`snap_esp32_${i}`);
        });
      }
    });

    describe('virtualGPIOPins in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`GPIO pin appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i, `snap_gpio_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.virtualGPIOPins).toBeDefined();
          expect(stage.virtualGPIOPins!.length).toBeGreaterThan(0);
          expect(stage.virtualGPIOPins![0].gpioPinId).toBe(`snap_gpio_${i}`);
        });
      }
    });

    describe('virtualPWMChannels in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`PWM channel appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `snap_pwm_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.virtualPWMChannels).toBeDefined();
          expect(stage.virtualPWMChannels!.length).toBeGreaterThan(0);
          expect(stage.virtualPWMChannels![0].pwmChannelId).toBe(`snap_pwm_${i}`);
        });
      }
    });

    describe('virtualTimers in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`timer appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i, `snap_timer_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.virtualTimers).toBeDefined();
          expect(stage.virtualTimers!.length).toBeGreaterThan(0);
          expect(stage.virtualTimers![0].timerId).toBe(`snap_timer_${i}`);
        });
      }
    });

    describe('virtualInterrupts in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`interrupt appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i, `snap_int_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.virtualInterrupts).toBeDefined();
          expect(stage.virtualInterrupts!.length).toBeGreaterThan(0);
          expect(stage.virtualInterrupts![0].interruptId).toBe(`snap_int_${i}`);
        });
      }
    });

    describe('empty registries produce no snapshot data', () => {
      for (let i = 0; i < 100; i++) {
        it(`empty registries produce empty or undefined snapshot fields ${i}`, () => {
          const rt = runtime();
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          const esp32Len = stage.virtualESP32Models?.length ?? 0;
          const gpioLen = stage.virtualGPIOPins?.length ?? 0;
          const pwmLen = stage.virtualPWMChannels?.length ?? 0;
          const timerLen = stage.virtualTimers?.length ?? 0;
          const intLen = stage.virtualInterrupts?.length ?? 0;
          expect(esp32Len).toBe(0);
          expect(gpioLen).toBe(0);
          expect(pwmLen).toBe(0);
          expect(timerLen).toBe(0);
          expect(intLen).toBe(0);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization + Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Snapshot Serialization and Clone Safety', () => {
    describe('round-trip export/import preserves virtualESP32Models', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves ESP32 with futureESP32Hints ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `ser_esp32_${i}`, { futureESP32Hints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.virtualESP32Models).toBeDefined();
          expect(stage.virtualESP32Models![0].esp32Id).toBe(`ser_esp32_${i}`);
          expect(stage.virtualESP32Models![0].futureESP32Hints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVirtualESP32Model(`ser_esp32_${i}`)!.esp32Id).toBe(`ser_esp32_${i}`);
          expect(imported.getVirtualESP32Model(`ser_esp32_${i}`)!.futureESP32Hints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves virtualGPIOPins', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves GPIO pin with futureGPIOHints ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i, `ser_gpio_${i}`, { futureGPIOHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.virtualGPIOPins).toBeDefined();
          expect(stage.virtualGPIOPins![0].gpioPinId).toBe(`ser_gpio_${i}`);
          expect(stage.virtualGPIOPins![0].futureGPIOHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVirtualGPIOPinModel(`ser_gpio_${i}`)!.gpioPinId).toBe(`ser_gpio_${i}`);
          expect(imported.getVirtualGPIOPinModel(`ser_gpio_${i}`)!.futureGPIOHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves virtualPWMChannels', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves PWM channel with futurePWMHints ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `ser_pwm_${i}`, { futurePWMHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.virtualPWMChannels).toBeDefined();
          expect(stage.virtualPWMChannels![0].pwmChannelId).toBe(`ser_pwm_${i}`);
          expect(stage.virtualPWMChannels![0].futurePWMHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVirtualPWMChannelModel(`ser_pwm_${i}`)!.pwmChannelId).toBe(`ser_pwm_${i}`);
          expect(imported.getVirtualPWMChannelModel(`ser_pwm_${i}`)!.futurePWMHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves virtualTimers', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves timer with futureTimerHints ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i, `ser_timer_${i}`, { futureTimerHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.virtualTimers).toBeDefined();
          expect(stage.virtualTimers![0].timerId).toBe(`ser_timer_${i}`);
          expect(stage.virtualTimers![0].futureTimerHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVirtualTimerModel(`ser_timer_${i}`)!.timerId).toBe(`ser_timer_${i}`);
          expect(imported.getVirtualTimerModel(`ser_timer_${i}`)!.futureTimerHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves virtualInterrupts', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves interrupt with futureInterruptHints ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i, `ser_int_${i}`, { futureInterruptHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.virtualInterrupts).toBeDefined();
          expect(stage.virtualInterrupts![0].interruptId).toBe(`ser_int_${i}`);
          expect(stage.virtualInterrupts![0].futureInterruptHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVirtualInterruptModel(`ser_int_${i}`)!.interruptId).toBe(`ser_int_${i}`);
          expect(imported.getVirtualInterruptModel(`ser_int_${i}`)!.futureInterruptHints.hint).toBe(i);
        });
      }
    });

    describe('clone safety — mutation does not bleed back', () => {
      for (let i = 0; i < 100; i++) {
        it(`ESP32 clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(i, `clone_esp32_${i}`));
          const direct = rt.getVirtualESP32Model(`clone_esp32_${i}`)!;
          const originalTick = direct.clockTickCount;
          (direct as any).clockTickCount = 9999;
          const check = rt.getVirtualESP32Model(`clone_esp32_${i}`)!;
          expect(check.clockTickCount).toBe(originalTick);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`GPIO pin clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualGPIOPinModel(gpioPin(i, `clone_gpio_${i}`));
          const direct = rt.getVirtualGPIOPinModel(`clone_gpio_${i}`)!;
          const originalPin = direct.pinNumber;
          (direct as any).pinNumber = 9999;
          const check = rt.getVirtualGPIOPinModel(`clone_gpio_${i}`)!;
          expect(check.pinNumber).toBe(originalPin);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`PWM channel clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualPWMChannelModel(pwmChannel(i, `clone_pwm_${i}`));
          const direct = rt.getVirtualPWMChannelModel(`clone_pwm_${i}`)!;
          const originalFreq = direct.frequency;
          (direct as any).frequency = 9999;
          const check = rt.getVirtualPWMChannelModel(`clone_pwm_${i}`)!;
          expect(check.frequency).toBe(originalFreq);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`timer clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualTimerModel(timer(i, `clone_timer_${i}`));
          const direct = rt.getVirtualTimerModel(`clone_timer_${i}`)!;
          const originalInterval = direct.intervalMs;
          (direct as any).intervalMs = 9999;
          const check = rt.getVirtualTimerModel(`clone_timer_${i}`)!;
          expect(check.intervalMs).toBe(originalInterval);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`interrupt clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualInterruptModel(interrupt(i, `clone_int_${i}`));
          const direct = rt.getVirtualInterruptModel(`clone_int_${i}`)!;
          const originalPin = direct.pinNumber;
          (direct as any).pinNumber = 9999;
          const check = rt.getVirtualInterruptModel(`clone_int_${i}`)!;
          expect(check.pinNumber).toBe(originalPin);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Simulation Helpers
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- Simulation Helpers', () => {
    describe('applyPinMode', () => {
      for (let i = 0; i < 100; i++) {
        it(`applyPinMode sets mode correctly ${i}`, () => {
          const modes: GPIOPinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'UNSET'];
          const mode = modes[i % modes.length];
          const pin = gpioPin(i, `apm_${i}`, { pinMode: 'UNSET', pinState: 'FLOATING' });
          const result = applyPinMode(pin, mode);
          expect(result.pinMode).toBe(mode);
          if (mode === 'OUTPUT') expect(result.pinState).toBe('LOW');
          else if (mode === 'INPUT_PULLUP') expect(result.pinState).toBe('HIGH');
          else if (mode === 'INPUT' || mode === 'INPUT_PULLDOWN') expect(result.pinState).toBe('LOW');
          else expect(result.pinState).toBe('FLOATING');
        });
      }
    });

    describe('applyDigitalWrite', () => {
      for (let i = 0; i < 100; i++) {
        it(`applyDigitalWrite changes pin state ${i}`, () => {
          const pin = gpioPin(i, `adw_${i}`, { pinMode: 'OUTPUT', pinState: 'LOW' });
          const states: GPIOPinState[] = ['HIGH', 'LOW'];
          const state = states[i % 2];
          const result = applyDigitalWrite(pin, state, i);
          expect(result.pinState).toBe(state);
          if (state !== 'LOW') {
            expect(result.lastChangeTick).toBe(i);
          }
        });
      }
    });

    describe('readDigitalPin', () => {
      for (let i = 0; i < 100; i++) {
        it(`readDigitalPin returns correct state ${i}`, () => {
          const states: GPIOPinState[] = ['HIGH', 'LOW', 'FLOATING'];
          const state = states[i % 3];
          const pin = gpioPin(i, `rdp_${i}`, { pinState: state });
          expect(readDigitalPin(pin)).toBe(state);
        });
      }
    });

    describe('togglePin', () => {
      for (let i = 0; i < 100; i++) {
        it(`togglePin flips state ${i}`, () => {
          const startState: GPIOPinState = i % 2 === 0 ? 'HIGH' : 'LOW';
          const expectedState: GPIOPinState = startState === 'HIGH' ? 'LOW' : 'HIGH';
          const pin = gpioPin(i, `tp_${i}`, { pinMode: 'OUTPUT', pinState: startState });
          const result = togglePin(pin, i);
          expect(result.pinState).toBe(expectedState);
        });
      }
    });

    describe('shouldTriggerInterrupt', () => {
      for (let i = 0; i < 100; i++) {
        it(`shouldTriggerInterrupt detects edges ${i}`, () => {
          // Test RISING edge: LOW->HIGH = true
          if (i % 5 === 0) {
            expect(shouldTriggerInterrupt('LOW', 'HIGH', 'RISING')).toBe(true);
          }
          // Test FALLING edge: HIGH->LOW = true
          if (i % 5 === 1) {
            expect(shouldTriggerInterrupt('HIGH', 'LOW', 'FALLING')).toBe(true);
          }
          // Test CHANGE edge: any change = true
          if (i % 5 === 2) {
            expect(shouldTriggerInterrupt('LOW', 'HIGH', 'CHANGE')).toBe(true);
          }
          // Test NONE edge: no trigger
          if (i % 5 === 3) {
            expect(shouldTriggerInterrupt('LOW', 'HIGH', 'NONE')).toBe(false);
          }
          // Test same state: no trigger
          if (i % 5 === 4) {
            expect(shouldTriggerInterrupt('HIGH', 'HIGH', 'RISING')).toBe(false);
          }
        });
      }
    });

    describe('applyLedcAttachPin', () => {
      for (let i = 0; i < 100; i++) {
        it(`applyLedcAttachPin links channel to pin ${i}`, () => {
          const channel = pwmChannel(i, `lap_${i}`);
          const pinNum = i % 40;
          const result = applyLedcAttachPin(channel, pinNum);
          expect(result.attachedPinNumber).toBe(pinNum);
          expect(result.isActive).toBe(true);
        });
      }
    });

    describe('applyLedcWrite', () => {
      for (let i = 0; i < 100; i++) {
        it(`applyLedcWrite updates duty cycle ${i}`, () => {
          const channel = pwmChannel(i, `alw_${i}`, { maxDutyValue: 255 });
          const dutyValue = i % 256;
          const result = applyLedcWrite(channel, dutyValue);
          expect(result.dutyCycle).toBeCloseTo(dutyValue / 255, 5);
        });
      }
    });

    describe('computeNormalizedDuty', () => {
      for (let i = 0; i < 100; i++) {
        it(`computeNormalizedDuty normalizes correctly ${i}`, () => {
          const duty = Math.min(1, i * 0.01);
          const channel = pwmChannel(i, `cnd_${i}`, { dutyCycle: duty });
          const result = computeNormalizedDuty(channel);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
          expect(result).toBeCloseTo(duty, 5);
        });
      }
    });

    describe('advanceClock', () => {
      for (let i = 0; i < 100; i++) {
        it(`advanceClock increments tick and millis ${i}`, () => {
          const e = esp32(i, `ac_${i}`);
          const deltaMs = (i + 1) * 10;
          const result = advanceClock(e, deltaMs);
          expect(result.clockTickCount).toBe(i + 1);
          expect(result.virtualMillis).toBe(i * 10 + deltaMs);
          expect(result.virtualMicros).toBe(i * 10000 + deltaMs * 1000);
        });
      }
    });

    describe('tickTimers', () => {
      for (let i = 0; i < 100; i++) {
        it(`tickTimers fires timers at interval ${i}`, () => {
          const intervalMs = (i + 1) * 10;
          const t = timer(i, `tt_${i}`, { timerState: 'RUNNING', intervalMs, elapsedMs: 0, isRepeating: false });
          const { updatedTimers, expiredTimerIds } = tickTimers([t], intervalMs, i + 1);
          expect(updatedTimers).toHaveLength(1);
          expect(updatedTimers[0].triggerCount).toBe(1);
          expect(expiredTimerIds).toContain(`tt_${i}`);
          expect(updatedTimers[0].timerState).toBe('EXPIRED');
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: High-level Runtime APIs
  // ═══════════════════════════════════════════════════════════════
  describe('9 -- High-level Runtime APIs', () => {
    describe('virtualPinMode', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualPinMode creates pin and sets mode ${i}`, () => {
          const rt = runtime();
          const e = esp32(0, 'board_0');
          rt.registerVirtualESP32Model(e);
          const modes: GPIOPinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'UNSET'];
          const mode = modes[i % modes.length];
          rt.virtualPinMode('board_0', i % 40, mode);
          const pinId = `gpio_board_0_${i % 40}`;
          const pin = rt.getVirtualGPIOPinModel(pinId);
          expect(pin).toBeDefined();
          expect(pin!.pinMode).toBe(mode);
        });
      }
    });

    describe('virtualDigitalWrite', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualDigitalWrite changes pin state ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'OUTPUT');
          const state: GPIOPinState = i % 2 === 0 ? 'HIGH' : 'LOW';
          rt.virtualDigitalWrite('board_0', i % 40, state);
          const pinId = `gpio_board_0_${i % 40}`;
          const pin = rt.getVirtualGPIOPinModel(pinId);
          expect(pin).toBeDefined();
          expect(pin!.pinState).toBe(state);
        });
      }
    });

    describe('virtualDigitalRead', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualDigitalRead returns correct state ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'OUTPUT');
          const state: GPIOPinState = i % 2 === 0 ? 'HIGH' : 'LOW';
          rt.virtualDigitalWrite('board_0', i % 40, state);
          const read = rt.virtualDigitalRead('board_0', i % 40);
          expect(read).toBe(state);
        });
      }
    });

    describe('virtualLedcAttachPin', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualLedcAttachPin links PWM to pin ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'OUTPUT');
          rt.virtualLedcAttachPin('board_0', i % 16, i % 40);
          const channelId = `pwm_board_0_${i % 16}`;
          const channel = rt.getVirtualPWMChannelModel(channelId);
          expect(channel).toBeDefined();
          expect(channel!.attachedPinNumber).toBe(i % 40);
          expect(channel!.isActive).toBe(true);
        });
      }
    });

    describe('virtualLedcWrite', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualLedcWrite sets duty cycle ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualLedcAttachPin('board_0', i % 16, i % 40);
          const dutyValue = i % 256;
          rt.virtualLedcWrite('board_0', i % 16, dutyValue);
          const channelId = `pwm_board_0_${i % 16}`;
          const channel = rt.getVirtualPWMChannelModel(channelId);
          expect(channel).toBeDefined();
          expect(channel!.dutyCycle).toBeGreaterThanOrEqual(0);
          expect(channel!.dutyCycle).toBeLessThanOrEqual(1);
        });
      }
    });

    describe('virtualAttachInterrupt', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualAttachInterrupt creates interrupt ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'INPUT');
          const edges: InterruptEdge[] = ['RISING', 'FALLING', 'CHANGE', 'NONE'];
          const edge = edges[i % edges.length];
          rt.virtualAttachInterrupt('board_0', i % 40, edge);
          const intId = `int_board_0_${i % 40}`;
          const int = rt.getVirtualInterruptModel(intId);
          expect(int).toBeDefined();
          expect(int!.edge).toBe(edge);
          expect(int!.isEnabled).toBe(true);
        });
      }
    });

    describe('virtualDetachInterrupt', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualDetachInterrupt removes interrupt ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'INPUT');
          rt.virtualAttachInterrupt('board_0', i % 40, 'RISING');
          const intId = `int_board_0_${i % 40}`;
          expect(rt.hasVirtualInterruptModel(intId)).toBe(true);
          rt.virtualDetachInterrupt('board_0', i % 40);
          expect(rt.hasVirtualInterruptModel(intId)).toBe(false);
        });
      }
    });

    describe('virtualTick', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualTick advances clock ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0', { clockTickCount: 0, virtualMillis: 0, virtualMicros: 0 }));
          const deltaMs = (i + 1) * 5;
          rt.virtualTick('board_0', deltaMs);
          const e = rt.getVirtualESP32Model('board_0')!;
          expect(e.clockTickCount).toBe(1);
          expect(e.virtualMillis).toBe(deltaMs);
          expect(e.virtualMicros).toBe(deltaMs * 1000);
        });
      }
    });

    describe('virtualTogglePin', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualTogglePin toggles pin state ${i}`, () => {
          const rt = runtime();
          rt.registerVirtualESP32Model(esp32(0, 'board_0'));
          rt.virtualPinMode('board_0', i % 40, 'OUTPUT');
          // After OUTPUT mode, pin is LOW
          rt.virtualTogglePin('board_0', i % 40);
          const pinId = `gpio_board_0_${i % 40}`;
          const pin = rt.getVirtualGPIOPinModel(pinId)!;
          expect(pin.pinState).toBe('HIGH');
          // Toggle again
          rt.virtualTogglePin('board_0', i % 40);
          const pin2 = rt.getVirtualGPIOPinModel(pinId)!;
          expect(pin2.pinState).toBe('LOW');
        });
      }
    });

    describe('virtualDigitalRead returns FLOATING for nonexistent pin', () => {
      for (let i = 0; i < 100; i++) {
        it(`virtualDigitalRead returns FLOATING for missing pin ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const state = rt.virtualDigitalRead('nonexistent_board', i % 40);
          expect(state).toBe('FLOATING');
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Constants
  // ═══════════════════════════════════════════════════════════════
  describe('10 -- Constants', () => {
    describe('VALID_PIN_MODES array', () => {
      it('VALID_PIN_MODES contains INPUT', () => {
        expect(VALID_PIN_MODES).toContain('INPUT');
      });

      it('VALID_PIN_MODES contains OUTPUT', () => {
        expect(VALID_PIN_MODES).toContain('OUTPUT');
      });

      it('VALID_PIN_MODES contains INPUT_PULLUP', () => {
        expect(VALID_PIN_MODES).toContain('INPUT_PULLUP');
      });

      it('VALID_PIN_MODES contains INPUT_PULLDOWN', () => {
        expect(VALID_PIN_MODES).toContain('INPUT_PULLDOWN');
      });

      it('VALID_PIN_MODES contains UNSET', () => {
        expect(VALID_PIN_MODES).toContain('UNSET');
      });

      it('VALID_PIN_MODES has exactly 5 entries', () => {
        expect(VALID_PIN_MODES).toHaveLength(5);
      });
    });

    describe('VALID_PIN_STATES array', () => {
      it('VALID_PIN_STATES contains HIGH', () => {
        expect(VALID_PIN_STATES).toContain('HIGH');
      });

      it('VALID_PIN_STATES contains LOW', () => {
        expect(VALID_PIN_STATES).toContain('LOW');
      });

      it('VALID_PIN_STATES contains FLOATING', () => {
        expect(VALID_PIN_STATES).toContain('FLOATING');
      });

      it('VALID_PIN_STATES has exactly 3 entries', () => {
        expect(VALID_PIN_STATES).toHaveLength(3);
      });
    });

    describe('VALID_INTERRUPT_EDGES array', () => {
      it('VALID_INTERRUPT_EDGES contains RISING', () => {
        expect(VALID_INTERRUPT_EDGES).toContain('RISING');
      });

      it('VALID_INTERRUPT_EDGES contains FALLING', () => {
        expect(VALID_INTERRUPT_EDGES).toContain('FALLING');
      });

      it('VALID_INTERRUPT_EDGES contains CHANGE', () => {
        expect(VALID_INTERRUPT_EDGES).toContain('CHANGE');
      });

      it('VALID_INTERRUPT_EDGES contains NONE', () => {
        expect(VALID_INTERRUPT_EDGES).toContain('NONE');
      });

      it('VALID_INTERRUPT_EDGES has exactly 4 entries', () => {
        expect(VALID_INTERRUPT_EDGES).toHaveLength(4);
      });
    });

    describe('VALID_EXECUTION_STATES array', () => {
      it('VALID_EXECUTION_STATES contains IDLE', () => {
        expect(VALID_EXECUTION_STATES).toContain('IDLE');
      });

      it('VALID_EXECUTION_STATES contains RUNNING', () => {
        expect(VALID_EXECUTION_STATES).toContain('RUNNING');
      });

      it('VALID_EXECUTION_STATES contains PAUSED', () => {
        expect(VALID_EXECUTION_STATES).toContain('PAUSED');
      });

      it('VALID_EXECUTION_STATES contains HALTED', () => {
        expect(VALID_EXECUTION_STATES).toContain('HALTED');
      });

      it('VALID_EXECUTION_STATES contains ERROR', () => {
        expect(VALID_EXECUTION_STATES).toContain('ERROR');
      });

      it('VALID_EXECUTION_STATES has exactly 5 entries', () => {
        expect(VALID_EXECUTION_STATES).toHaveLength(5);
      });
    });

    describe('VALID_TIMER_STATES array', () => {
      it('VALID_TIMER_STATES contains IDLE', () => {
        expect(VALID_TIMER_STATES).toContain('IDLE');
      });

      it('VALID_TIMER_STATES contains RUNNING', () => {
        expect(VALID_TIMER_STATES).toContain('RUNNING');
      });

      it('VALID_TIMER_STATES contains PAUSED', () => {
        expect(VALID_TIMER_STATES).toContain('PAUSED');
      });

      it('VALID_TIMER_STATES contains EXPIRED', () => {
        expect(VALID_TIMER_STATES).toContain('EXPIRED');
      });

      it('VALID_TIMER_STATES has exactly 4 entries', () => {
        expect(VALID_TIMER_STATES).toHaveLength(4);
      });
    });

    describe('ESP32 numeric constants', () => {
      it('ESP32_TOTAL_GPIO_PINS is 40', () => {
        expect(ESP32_TOTAL_GPIO_PINS).toBe(40);
      });

      it('ESP32_MAX_PWM_CHANNELS is 16', () => {
        expect(ESP32_MAX_PWM_CHANNELS).toBe(16);
      });

      it('ESP32_MAX_TIMERS is 4', () => {
        expect(ESP32_MAX_TIMERS).toBe(4);
      });

      it('ESP32_DEFAULT_CLOCK_HZ is 240000000', () => {
        expect(ESP32_DEFAULT_CLOCK_HZ).toBe(240_000_000);
      });

      it('ESP32_DEFAULT_PWM_FREQUENCY is 5000', () => {
        expect(ESP32_DEFAULT_PWM_FREQUENCY).toBe(5000);
      });

      it('ESP32_DEFAULT_PWM_RESOLUTION is 8', () => {
        expect(ESP32_DEFAULT_PWM_RESOLUTION).toBe(8);
      });
    });
  });
});
