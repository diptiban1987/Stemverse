// ═══════════════════════════════════════════════════════════════
// Phase 21A: Virtual ESP32 Execution Runtime
// Browser-side virtual ESP32 simulation — GPIO, PWM, timers, interrupts
// No hardware access. No serial ports. No cloud execution.
// ═══════════════════════════════════════════════════════════════

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
  TimerState,
  ExecutionState,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const ESP32_DEFAULT_CLOCK_HZ = 240_000_000;
export const ESP32_TOTAL_GPIO_PINS = 40;
export const ESP32_MAX_PWM_CHANNELS = 16;
export const ESP32_MAX_TIMERS = 4;
export const ESP32_DEFAULT_PWM_FREQUENCY = 5000;
export const ESP32_DEFAULT_PWM_RESOLUTION = 8;

export const VALID_PIN_MODES: GPIOPinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'UNSET'];
export const VALID_PIN_STATES: GPIOPinState[] = ['HIGH', 'LOW', 'FLOATING'];
export const VALID_INTERRUPT_EDGES: InterruptEdge[] = ['RISING', 'FALLING', 'CHANGE', 'NONE'];
export const VALID_TIMER_STATES: TimerState[] = ['IDLE', 'RUNNING', 'PAUSED', 'EXPIRED'];
export const VALID_EXECUTION_STATES: ExecutionState[] = ['IDLE', 'RUNNING', 'PAUSED', 'HALTED', 'ERROR'];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultVirtualESP32Model(
  id: string,
  overrides: Partial<VirtualESP32Model> = {},
): VirtualESP32Model {
  return {
    boardType: 'ESP32_DEVKIT_V1',
    executionState: 'IDLE',
    clockTickCount: 0,
    virtualMillis: 0,
    virtualMicros: 0,
    clockSpeedHz: ESP32_DEFAULT_CLOCK_HZ,
    totalGPIOPins: ESP32_TOTAL_GPIO_PINS,
    maxPWMChannels: ESP32_MAX_PWM_CHANNELS,
    maxTimers: ESP32_MAX_TIMERS,
    errorLog: [],
    futureESP32Hints: {},
    ...overrides,
    esp32Id: id,
  };
}

export function createDefaultVirtualGPIOPinModel(
  id: string,
  overrides: Partial<VirtualGPIOPinModel> = {},
): VirtualGPIOPinModel {
  return {
    esp32Id: '',
    pinNumber: 0,
    pinMode: 'UNSET',
    pinState: 'FLOATING',
    previousState: 'FLOATING',
    isAnalog: false,
    analogValue: 0,
    pwmChannelId: '',
    interruptId: '',
    lastChangeTick: 0,
    futureGPIOHints: {},
    ...overrides,
    gpioPinId: id,
  };
}

export function createDefaultVirtualPWMChannelModel(
  id: string,
  overrides: Partial<VirtualPWMChannelModel> = {},
): VirtualPWMChannelModel {
  return {
    esp32Id: '',
    channelNumber: 0,
    attachedPinNumber: -1,
    dutyCycle: 0,
    frequency: ESP32_DEFAULT_PWM_FREQUENCY,
    resolution: ESP32_DEFAULT_PWM_RESOLUTION,
    maxDutyValue: (1 << ESP32_DEFAULT_PWM_RESOLUTION) - 1,
    isActive: false,
    futurePWMHints: {},
    ...overrides,
    pwmChannelId: id,
  };
}

export function createDefaultVirtualTimerModel(
  id: string,
  overrides: Partial<VirtualTimerModel> = {},
): VirtualTimerModel {
  return {
    esp32Id: '',
    timerState: 'IDLE',
    intervalMs: 0,
    isRepeating: false,
    elapsedMs: 0,
    triggerCount: 0,
    callbackId: '',
    lastTriggerTick: 0,
    futureTimerHints: {},
    ...overrides,
    timerId: id,
  };
}

export function createDefaultVirtualInterruptModel(
  id: string,
  overrides: Partial<VirtualInterruptModel> = {},
): VirtualInterruptModel {
  return {
    esp32Id: '',
    pinNumber: 0,
    edge: 'NONE',
    isEnabled: false,
    triggerCount: 0,
    lastTriggerTick: 0,
    callbackId: '',
    futureInterruptHints: {},
    ...overrides,
    interruptId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS (warning-only — never throw)
// ═══════════════════════════════════════════════════════════════

export function validateVirtualESP32Model(
  model: VirtualESP32Model | null | undefined,
  warnPrefix = '[ESP32 Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_ESP32_VIZ', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (!model.boardType || model.boardType.trim() === '') {
    console.warn(`${warnPrefix} boardType is empty`);
    warnings.push({ code: 'EMPTY_BOARD_TYPE', message: `${warnPrefix} boardType is empty` });
  }
  if (!VALID_EXECUTION_STATES.includes(model.executionState)) {
    console.warn(`${warnPrefix} invalid executionState: ${model.executionState}`);
    warnings.push({ code: 'INVALID_EXECUTION_STATE', message: `${warnPrefix} invalid executionState: ${model.executionState}` });
  }
  if (typeof model.clockSpeedHz !== 'number' || model.clockSpeedHz <= 0) {
    console.warn(`${warnPrefix} invalid clockSpeedHz: ${model.clockSpeedHz}`);
    warnings.push({ code: 'INVALID_CLOCK_SPEED', message: `${warnPrefix} invalid clockSpeedHz: ${model.clockSpeedHz}` });
  }
  if (typeof model.futureESP32Hints !== 'object' || model.futureESP32Hints === null) {
    console.warn(`${warnPrefix} invalid futureESP32Hints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureESP32Hints` });
  }
  return warnings;
}

export function validateVirtualGPIOPinModel(
  model: VirtualGPIOPinModel | null | undefined,
  warnPrefix = '[GPIO Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_GPIO_VIZ', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.gpioPinId || model.gpioPinId.trim() === '') {
    console.warn(`${warnPrefix} gpioPinId is empty`);
    warnings.push({ code: 'EMPTY_GPIO_PIN_ID', message: `${warnPrefix} gpioPinId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (typeof model.pinNumber !== 'number' || model.pinNumber < 0) {
    console.warn(`${warnPrefix} invalid pinNumber: ${model.pinNumber}`);
    warnings.push({ code: 'INVALID_PIN_NUMBER', message: `${warnPrefix} invalid pinNumber: ${model.pinNumber}` });
  }
  if (!VALID_PIN_MODES.includes(model.pinMode)) {
    console.warn(`${warnPrefix} invalid pinMode: ${model.pinMode}`);
    warnings.push({ code: 'INVALID_PIN_MODE', message: `${warnPrefix} invalid pinMode: ${model.pinMode}` });
  }
  if (!VALID_PIN_STATES.includes(model.pinState)) {
    console.warn(`${warnPrefix} invalid pinState: ${model.pinState}`);
    warnings.push({ code: 'INVALID_PIN_STATE', message: `${warnPrefix} invalid pinState: ${model.pinState}` });
  }
  if (typeof model.futureGPIOHints !== 'object' || model.futureGPIOHints === null) {
    console.warn(`${warnPrefix} invalid futureGPIOHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureGPIOHints` });
  }
  return warnings;
}

export function validateVirtualPWMChannelModel(
  model: VirtualPWMChannelModel | null | undefined,
  warnPrefix = '[PWM Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_PWM_VIZ', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.pwmChannelId || model.pwmChannelId.trim() === '') {
    console.warn(`${warnPrefix} pwmChannelId is empty`);
    warnings.push({ code: 'EMPTY_PWM_CHANNEL_ID', message: `${warnPrefix} pwmChannelId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (typeof model.channelNumber !== 'number' || model.channelNumber < 0 || model.channelNumber >= ESP32_MAX_PWM_CHANNELS) {
    console.warn(`${warnPrefix} invalid channelNumber: ${model.channelNumber}`);
    warnings.push({ code: 'INVALID_CHANNEL_NUMBER', message: `${warnPrefix} invalid channelNumber: ${model.channelNumber}` });
  }
  if (typeof model.dutyCycle !== 'number' || model.dutyCycle < 0 || model.dutyCycle > 1) {
    console.warn(`${warnPrefix} invalid dutyCycle: ${model.dutyCycle}`);
    warnings.push({ code: 'INVALID_DUTY_CYCLE', message: `${warnPrefix} invalid dutyCycle: ${model.dutyCycle}` });
  }
  if (typeof model.frequency !== 'number' || model.frequency <= 0) {
    console.warn(`${warnPrefix} invalid frequency: ${model.frequency}`);
    warnings.push({ code: 'INVALID_FREQUENCY', message: `${warnPrefix} invalid frequency: ${model.frequency}` });
  }
  if (typeof model.resolution !== 'number' || model.resolution < 1 || model.resolution > 16) {
    console.warn(`${warnPrefix} invalid resolution: ${model.resolution}`);
    warnings.push({ code: 'INVALID_RESOLUTION', message: `${warnPrefix} invalid resolution: ${model.resolution}` });
  }
  if (typeof model.futurePWMHints !== 'object' || model.futurePWMHints === null) {
    console.warn(`${warnPrefix} invalid futurePWMHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futurePWMHints` });
  }
  return warnings;
}

export function validateVirtualTimerModel(
  model: VirtualTimerModel | null | undefined,
  warnPrefix = '[Timer Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_TIMER_VIZ', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.timerId || model.timerId.trim() === '') {
    console.warn(`${warnPrefix} timerId is empty`);
    warnings.push({ code: 'EMPTY_TIMER_ID', message: `${warnPrefix} timerId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (!VALID_TIMER_STATES.includes(model.timerState)) {
    console.warn(`${warnPrefix} invalid timerState: ${model.timerState}`);
    warnings.push({ code: 'INVALID_TIMER_STATE', message: `${warnPrefix} invalid timerState: ${model.timerState}` });
  }
  if (typeof model.intervalMs !== 'number' || model.intervalMs < 0) {
    console.warn(`${warnPrefix} invalid intervalMs: ${model.intervalMs}`);
    warnings.push({ code: 'INVALID_INTERVAL', message: `${warnPrefix} invalid intervalMs: ${model.intervalMs}` });
  }
  if (typeof model.futureTimerHints !== 'object' || model.futureTimerHints === null) {
    console.warn(`${warnPrefix} invalid futureTimerHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureTimerHints` });
  }
  return warnings;
}

export function validateVirtualInterruptModel(
  model: VirtualInterruptModel | null | undefined,
  warnPrefix = '[Interrupt Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model) {
    console.warn(`${warnPrefix} model is null or undefined`);
    warnings.push({ code: 'INVALID_INTERRUPT_VIZ', message: `${warnPrefix} model is null or undefined` });
    return warnings;
  }
  if (!model.interruptId || model.interruptId.trim() === '') {
    console.warn(`${warnPrefix} interruptId is empty`);
    warnings.push({ code: 'EMPTY_INTERRUPT_ID', message: `${warnPrefix} interruptId is empty` });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    console.warn(`${warnPrefix} esp32Id is empty`);
    warnings.push({ code: 'EMPTY_ESP32_ID', message: `${warnPrefix} esp32Id is empty` });
  }
  if (typeof model.pinNumber !== 'number' || model.pinNumber < 0) {
    console.warn(`${warnPrefix} invalid pinNumber: ${model.pinNumber}`);
    warnings.push({ code: 'INVALID_PIN_NUMBER', message: `${warnPrefix} invalid pinNumber: ${model.pinNumber}` });
  }
  if (!VALID_INTERRUPT_EDGES.includes(model.edge)) {
    console.warn(`${warnPrefix} invalid edge: ${model.edge}`);
    warnings.push({ code: 'INVALID_EDGE', message: `${warnPrefix} invalid edge: ${model.edge}` });
  }
  if (typeof model.futureInterruptHints !== 'object' || model.futureInterruptHints === null) {
    console.warn(`${warnPrefix} invalid futureInterruptHints`);
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `${warnPrefix} invalid futureInterruptHints` });
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateESP32Ids(
  models: VirtualESP32Model[],
  warnPrefix = '[ESP32 Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.esp32Id)) {
      console.warn(`${warnPrefix} duplicate esp32Id: "${m.esp32Id}"`);
      warnings.push({ code: 'DUPLICATE_ESP32_ID', message: `${warnPrefix} duplicate esp32Id: "${m.esp32Id}"` });
    }
    seen.add(m.esp32Id);
  }
  return warnings;
}

export function validateDuplicateGPIOPinIds(
  models: VirtualGPIOPinModel[],
  warnPrefix = '[GPIO Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.gpioPinId)) {
      console.warn(`${warnPrefix} duplicate gpioPinId: "${m.gpioPinId}"`);
      warnings.push({ code: 'DUPLICATE_GPIO_PIN_ID', message: `${warnPrefix} duplicate gpioPinId: "${m.gpioPinId}"` });
    }
    seen.add(m.gpioPinId);
  }
  return warnings;
}

export function validateDuplicatePWMChannelIds(
  models: VirtualPWMChannelModel[],
  warnPrefix = '[PWM Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.pwmChannelId)) {
      console.warn(`${warnPrefix} duplicate pwmChannelId: "${m.pwmChannelId}"`);
      warnings.push({ code: 'DUPLICATE_PWM_CHANNEL_ID', message: `${warnPrefix} duplicate pwmChannelId: "${m.pwmChannelId}"` });
    }
    seen.add(m.pwmChannelId);
  }
  return warnings;
}

export function validateDuplicateTimerIds(
  models: VirtualTimerModel[],
  warnPrefix = '[Timer Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.timerId)) {
      console.warn(`${warnPrefix} duplicate timerId: "${m.timerId}"`);
      warnings.push({ code: 'DUPLICATE_TIMER_ID', message: `${warnPrefix} duplicate timerId: "${m.timerId}"` });
    }
    seen.add(m.timerId);
  }
  return warnings;
}

export function validateDuplicateInterruptIds(
  models: VirtualInterruptModel[],
  warnPrefix = '[Interrupt Viz]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.interruptId)) {
      console.warn(`${warnPrefix} duplicate interruptId: "${m.interruptId}"`);
      warnings.push({ code: 'DUPLICATE_INTERRUPT_ID', message: `${warnPrefix} duplicate interruptId: "${m.interruptId}"` });
    }
    seen.add(m.interruptId);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// GPIO SIMULATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a pin mode to a GPIO pin model.
 * Sets default state based on mode:
 * - OUTPUT → LOW
 * - INPUT_PULLUP → HIGH
 * - INPUT / INPUT_PULLDOWN → LOW
 * - UNSET → FLOATING
 */
export function applyPinMode(pin: VirtualGPIOPinModel, mode: GPIOPinMode): VirtualGPIOPinModel {
  const updated = safeDeepCopy(pin);
  updated.previousState = updated.pinState;
  updated.pinMode = mode;
  switch (mode) {
    case 'OUTPUT':
      updated.pinState = 'LOW';
      break;
    case 'INPUT_PULLUP':
      updated.pinState = 'HIGH';
      break;
    case 'INPUT':
    case 'INPUT_PULLDOWN':
      updated.pinState = 'LOW';
      break;
    case 'UNSET':
    default:
      updated.pinState = 'FLOATING';
      break;
  }
  return updated;
}

/**
 * Apply a digital write to a GPIO pin.
 * Only works on OUTPUT pins. Non-OUTPUT pins emit a warning and return unchanged.
 */
export function applyDigitalWrite(
  pin: VirtualGPIOPinModel,
  state: GPIOPinState,
  tick: number,
): VirtualGPIOPinModel {
  const updated = safeDeepCopy(pin);
  if (updated.pinMode !== 'OUTPUT') {
    console.warn(`[ESP32 GPIO] cannot digitalWrite on non-OUTPUT pin ${updated.pinNumber} (mode: ${updated.pinMode})`);
    return updated;
  }
  updated.previousState = updated.pinState;
  updated.pinState = state;
  if (updated.previousState !== state) {
    updated.lastChangeTick = tick;
  }
  return updated;
}

/**
 * Read the current digital state of a GPIO pin.
 */
export function readDigitalPin(pin: VirtualGPIOPinModel): GPIOPinState {
  return pin.pinState;
}

/**
 * Toggle a GPIO pin between HIGH and LOW.
 * FLOATING is treated as LOW for toggle purposes.
 */
export function togglePin(pin: VirtualGPIOPinModel, tick: number): VirtualGPIOPinModel {
  const newState: GPIOPinState = pin.pinState === 'HIGH' ? 'LOW' : 'HIGH';
  return applyDigitalWrite(pin, newState, tick);
}

/**
 * Determine whether a state change should trigger an interrupt.
 */
export function shouldTriggerInterrupt(
  previousState: GPIOPinState,
  newState: GPIOPinState,
  edge: InterruptEdge,
): boolean {
  if (previousState === newState) return false;
  if (edge === 'NONE') return false;
  if (edge === 'CHANGE') return true;

  const prevHigh = previousState === 'HIGH';
  const newHigh = newState === 'HIGH';

  if (edge === 'RISING' && !prevHigh && newHigh) return true;
  if (edge === 'FALLING' && prevHigh && !newHigh) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════
// PWM SIMULATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Attach a PWM channel to a specific pin number.
 */
export function applyLedcAttachPin(
  channel: VirtualPWMChannelModel,
  pinNumber: number,
): VirtualPWMChannelModel {
  const updated = safeDeepCopy(channel);
  updated.attachedPinNumber = pinNumber;
  updated.isActive = true;
  return updated;
}

/**
 * Write a duty value to a PWM channel.
 * The dutyValue is clamped to [0, maxDutyValue] and normalized to [0, 1].
 */
export function applyLedcWrite(
  channel: VirtualPWMChannelModel,
  dutyValue: number,
): VirtualPWMChannelModel {
  const updated = safeDeepCopy(channel);
  const clamped = Math.max(0, Math.min(dutyValue, updated.maxDutyValue));
  updated.dutyCycle = updated.maxDutyValue > 0 ? clamped / updated.maxDutyValue : 0;
  return updated;
}

/**
 * Compute the normalized duty cycle (0–1) from a PWM channel.
 */
export function computeNormalizedDuty(channel: VirtualPWMChannelModel): number {
  return Math.max(0, Math.min(1, channel.dutyCycle));
}

// ═══════════════════════════════════════════════════════════════
// CLOCK HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Advance the virtual clock of an ESP32 model by deltaMs milliseconds.
 */
export function advanceClock(
  esp32: VirtualESP32Model,
  deltaMs: number,
): VirtualESP32Model {
  const updated = safeDeepCopy(esp32);
  updated.clockTickCount += 1;
  updated.virtualMillis += deltaMs;
  updated.virtualMicros += deltaMs * 1000;
  return updated;
}

/**
 * Get the current virtual millis counter.
 */
export function getMillis(esp32: VirtualESP32Model): number {
  return esp32.virtualMillis;
}

/**
 * Get the current virtual micros counter.
 */
export function getMicros(esp32: VirtualESP32Model): number {
  return esp32.virtualMicros;
}

// ═══════════════════════════════════════════════════════════════
// TIMER HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Tick all timers by deltaMs. Returns updated timers and a list of expired timer IDs.
 * - RUNNING timers accumulate elapsed time.
 * - When elapsed >= interval, the timer triggers (triggerCount++, lastTriggerTick set).
 * - Repeating timers reset elapsed; non-repeating timers go to EXPIRED.
 */
export function tickTimers(
  timers: VirtualTimerModel[],
  deltaMs: number,
  currentTick: number,
): { updatedTimers: VirtualTimerModel[]; expiredTimerIds: string[] } {
  const expiredTimerIds: string[] = [];
  const updatedTimers = timers.map(t => {
    if (t.timerState !== 'RUNNING') return safeDeepCopy(t);
    const updated = safeDeepCopy(t);
    updated.elapsedMs += deltaMs;
    if (updated.intervalMs > 0 && updated.elapsedMs >= updated.intervalMs) {
      updated.triggerCount += 1;
      updated.lastTriggerTick = currentTick;
      expiredTimerIds.push(updated.timerId);
      if (updated.isRepeating) {
        updated.elapsedMs -= updated.intervalMs;
      } else {
        updated.timerState = 'EXPIRED';
        updated.elapsedMs = updated.intervalMs;
      }
    }
    return updated;
  });
  return { updatedTimers, expiredTimerIds };
}

// ═══════════════════════════════════════════════════════════════
// VIRTUAL EXECUTION SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class VirtualExecutionSynchronizer {
  private esp32Registry = new RenderRegistry<VirtualESP32Model>();
  private gpioPinRegistry = new RenderRegistry<VirtualGPIOPinModel>();
  private pwmChannelRegistry = new RenderRegistry<VirtualPWMChannelModel>();
  private timerRegistry = new RenderRegistry<VirtualTimerModel>();
  private interruptRegistry = new RenderRegistry<VirtualInterruptModel>();

  public get esp32s(): RenderRegistry<VirtualESP32Model> { return this.esp32Registry; }
  public get gpioPins(): RenderRegistry<VirtualGPIOPinModel> { return this.gpioPinRegistry; }
  public get pwmChannels(): RenderRegistry<VirtualPWMChannelModel> { return this.pwmChannelRegistry; }
  public get timers(): RenderRegistry<VirtualTimerModel> { return this.timerRegistry; }
  public get interrupts(): RenderRegistry<VirtualInterruptModel> { return this.interruptRegistry; }

  public buildSnapshot(
    esp32Models: VirtualESP32Model[],
    gpioPins: VirtualGPIOPinModel[],
    pwmChannels: VirtualPWMChannelModel[],
    timers: VirtualTimerModel[],
    interrupts: VirtualInterruptModel[],
  ): VirtualExecutionSnapshot {
    this.clear();

    for (const m of esp32Models) {
      const warnings = validateVirtualESP32Model(m);
      if (warnings.length === 0) {
        this.esp32Registry.register(m.esp32Id, m);
      }
    }
    for (const m of gpioPins) {
      const warnings = validateVirtualGPIOPinModel(m);
      if (warnings.length === 0) {
        this.gpioPinRegistry.register(m.gpioPinId, m);
      }
    }
    for (const m of pwmChannels) {
      const warnings = validateVirtualPWMChannelModel(m);
      if (warnings.length === 0) {
        this.pwmChannelRegistry.register(m.pwmChannelId, m);
      }
    }
    for (const m of timers) {
      const warnings = validateVirtualTimerModel(m);
      if (warnings.length === 0) {
        this.timerRegistry.register(m.timerId, m);
      }
    }
    for (const m of interrupts) {
      const warnings = validateVirtualInterruptModel(m);
      if (warnings.length === 0) {
        this.interruptRegistry.register(m.interruptId, m);
      }
    }

    return {
      esp32Models: this.esp32Registry.getAll(),
      gpioPins: this.gpioPinRegistry.getAll(),
      pwmChannels: this.pwmChannelRegistry.getAll(),
      timers: this.timerRegistry.getAll(),
      interrupts: this.interruptRegistry.getAll(),
    };
  }

  public clear(): void {
    this.esp32Registry.clear();
    this.gpioPinRegistry.clear();
    this.pwmChannelRegistry.clear();
    this.timerRegistry.clear();
    this.interruptRegistry.clear();
  }

  public clone(): VirtualExecutionSynchronizer {
    const cloned = new VirtualExecutionSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  public toJSON(): VirtualExecutionSnapshot {
    return {
      esp32Models: this.esp32Registry.getAll(),
      gpioPins: this.gpioPinRegistry.getAll(),
      pwmChannels: this.pwmChannelRegistry.getAll(),
      timers: this.timerRegistry.getAll(),
      interrupts: this.interruptRegistry.getAll(),
    };
  }

  public fromJSON(json: VirtualExecutionSnapshot): void {
    this.clear();
    if (json) {
      this.buildSnapshot(
        json.esp32Models || [],
        json.gpioPins || [],
        json.pwmChannels || [],
        json.timers || [],
        json.interrupts || [],
      );
    }
  }
}
