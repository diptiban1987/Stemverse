/**
 * Phase 23B: Virtual Logic Analyzer & Oscilloscope Foundation
 *
 * Architecture: Pure functions + Synchronizer pattern.
 * All operations are clone-safe, deterministic, and JSON-serializable.
 *
 * Models:
 *   LogicAnalyzerChannelModel  — one digital signal channel
 *   LogicCaptureModel          — one logic capture session
 *   LogicSampleModel           — one sample data point
 *   OscilloscopeChannelModel   — one analog/PWM channel
 *   OscilloscopeCaptureModel   — one oscilloscope capture session
 *   WaveformBufferModel        — voltage sample storage
 *   LogicAnalyzerSnapshot      — complete snapshot of all state
 */

import type {
  LogicAnalyzerChannelModel,
  LogicCaptureModel,
  LogicSampleModel,
  OscilloscopeChannelModel,
  OscilloscopeCaptureModel,
  WaveformBufferModel,
  LogicAnalyzerSnapshot,
  LogicLevel,
  TriggerMode,
  CaptureState,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_SAMPLE_RATE_HZ = 1000000;
export const DEFAULT_MAX_SAMPLES = 10000;
export const DEFAULT_MAX_WAVEFORM_SIZE = 10000;
export const DEFAULT_ZOOM_LEVEL = 1.0;
export const DEFAULT_HORIZONTAL_SCALE = 1.0;
export const DEFAULT_VERTICAL_SCALE = 1.0;
export const DEFAULT_TRIGGER_LEVEL = 1.65;
export const VALID_LOGIC_LEVELS: LogicLevel[] = ['HIGH', 'LOW', 'UNKNOWN', 'Z'];
export const VALID_TRIGGER_MODES: TriggerMode[] = ['RISING', 'FALLING', 'CHANGE', 'HIGH', 'LOW', 'NONE'];
export const VALID_CAPTURE_STATES: CaptureState[] = ['IDLE', 'ARMED', 'CAPTURING', 'STOPPED', 'COMPLETE'];
export const LOGIC_CHANNEL_COLORS = ['#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#8000FF', '#FF0080', '#80FF00'];

// ═══════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════

interface ValidationWarning {
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultLogicAnalyzerChannelModel(channelId: string, overrides?: Partial<LogicAnalyzerChannelModel>): LogicAnalyzerChannelModel {
  const defaults: LogicAnalyzerChannelModel = {
    channelId,
    esp32Id: '',
    pinNumber: 0,
    channelLabel: `CH${channelId}`,
    triggerMode: 'NONE',
    isEnabled: true,
    colorHex: '#00FF00',
    positionY: 0,
    futureLogicChannelHints: {},
  };
  return Object.assign(defaults, overrides, { channelId });
}

export function createDefaultLogicCaptureModel(captureId: string, overrides?: Partial<LogicCaptureModel>): LogicCaptureModel {
  const defaults: LogicCaptureModel = {
    captureId,
    esp32Id: '',
    state: 'IDLE',
    sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
    maxSamples: DEFAULT_MAX_SAMPLES,
    startTimestamp: 0,
    endTimestamp: 0,
    channelIds: [],
    zoomLevel: DEFAULT_ZOOM_LEVEL,
    horizontalScale: DEFAULT_HORIZONTAL_SCALE,
    triggerChannelId: '',
    triggerMode: 'NONE',
    cursorAPosition: 0,
    cursorBPosition: 0,
    futureLogicCaptureHints: {},
  };
  return Object.assign(defaults, overrides, { captureId });
}

export function createDefaultLogicSampleModel(sampleId: string, overrides?: Partial<LogicSampleModel>): LogicSampleModel {
  const defaults: LogicSampleModel = {
    sampleId,
    captureId: '',
    channelId: '',
    timestamp: 0,
    logicLevel: 'LOW',
    sampleIndex: 0,
    pulseWidthUs: 0,
    futureLogicSampleHints: {},
  };
  return Object.assign(defaults, overrides, { sampleId });
}

export function createDefaultOscilloscopeChannelModel(channelId: string, overrides?: Partial<OscilloscopeChannelModel>): OscilloscopeChannelModel {
  const defaults: OscilloscopeChannelModel = {
    channelId,
    esp32Id: '',
    pinNumber: 0,
    channelLabel: `OSC${channelId}`,
    isEnabled: true,
    colorHex: '#FFFF00',
    verticalScale: DEFAULT_VERTICAL_SCALE,
    offsetVoltage: 0,
    positionY: 0,
    futureOscChannelHints: {},
  };
  return Object.assign(defaults, overrides, { channelId });
}

export function createDefaultOscilloscopeCaptureModel(captureId: string, overrides?: Partial<OscilloscopeCaptureModel>): OscilloscopeCaptureModel {
  const defaults: OscilloscopeCaptureModel = {
    captureId,
    esp32Id: '',
    state: 'IDLE',
    sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
    maxSamples: DEFAULT_MAX_SAMPLES,
    startTimestamp: 0,
    endTimestamp: 0,
    channelIds: [],
    zoomLevel: DEFAULT_ZOOM_LEVEL,
    horizontalScale: DEFAULT_HORIZONTAL_SCALE,
    verticalScale: DEFAULT_VERTICAL_SCALE,
    triggerChannelId: '',
    triggerLevel: DEFAULT_TRIGGER_LEVEL,
    triggerMode: 'NONE',
    cursorAPosition: 0,
    cursorBPosition: 0,
    futureOscCaptureHints: {},
  };
  return Object.assign(defaults, overrides, { captureId });
}

export function createDefaultWaveformBufferModel(bufferId: string, overrides?: Partial<WaveformBufferModel>): WaveformBufferModel {
  const defaults: WaveformBufferModel = {
    bufferId,
    captureId: '',
    channelId: '',
    timestamps: [],
    voltages: [],
    sampleCount: 0,
    maxSize: DEFAULT_MAX_WAVEFORM_SIZE,
    futureWaveformHints: {},
  };
  return Object.assign(defaults, overrides, { bufferId });
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateLogicAnalyzerChannelModel(model: LogicAnalyzerChannelModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_LOGIC_CHANNEL', message: 'LogicAnalyzerChannelModel is null or not an object.' }); return w; }
  if (!model.channelId || typeof model.channelId !== 'string' || model.channelId.trim() === '') {
    w.push({ code: 'EMPTY_CHANNEL_ID', message: 'LogicAnalyzerChannelModel.channelId is empty.' });
  }
  if (!model.esp32Id || typeof model.esp32Id !== 'string' || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'LogicAnalyzerChannelModel.esp32Id is empty.' });
  }
  if (typeof model.pinNumber !== 'number' || model.pinNumber < 0) {
    w.push({ code: 'INVALID_PIN_NUMBER', message: 'LogicAnalyzerChannelModel.pinNumber must be non-negative.' });
  }
  if (!VALID_TRIGGER_MODES.includes(model.triggerMode)) {
    w.push({ code: 'INVALID_TRIGGER_MODE', message: `LogicAnalyzerChannelModel.triggerMode "${model.triggerMode}" is not valid.` });
  }
  return w;
}

export function validateLogicCaptureModel(model: LogicCaptureModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_LOGIC_CAPTURE', message: 'LogicCaptureModel is null or not an object.' }); return w; }
  if (!model.captureId || typeof model.captureId !== 'string' || model.captureId.trim() === '') {
    w.push({ code: 'EMPTY_CAPTURE_ID', message: 'LogicCaptureModel.captureId is empty.' });
  }
  if (!VALID_CAPTURE_STATES.includes(model.state)) {
    w.push({ code: 'INVALID_CAPTURE_STATE', message: `LogicCaptureModel.state "${model.state}" is not valid.` });
  }
  if (typeof model.sampleRateHz !== 'number' || model.sampleRateHz <= 0) {
    w.push({ code: 'INVALID_SAMPLE_RATE', message: 'LogicCaptureModel.sampleRateHz must be positive.' });
  }
  if (typeof model.maxSamples !== 'number' || model.maxSamples <= 0) {
    w.push({ code: 'INVALID_MAX_SAMPLES', message: 'LogicCaptureModel.maxSamples must be positive.' });
  }
  return w;
}

export function validateLogicSampleModel(model: LogicSampleModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_LOGIC_SAMPLE', message: 'LogicSampleModel is null or not an object.' }); return w; }
  if (!model.sampleId || typeof model.sampleId !== 'string' || model.sampleId.trim() === '') {
    w.push({ code: 'EMPTY_SAMPLE_ID', message: 'LogicSampleModel.sampleId is empty.' });
  }
  if (!VALID_LOGIC_LEVELS.includes(model.logicLevel)) {
    w.push({ code: 'INVALID_LOGIC_LEVEL', message: `LogicSampleModel.logicLevel "${model.logicLevel}" is not valid.` });
  }
  if (typeof model.timestamp !== 'number' || model.timestamp < 0) {
    w.push({ code: 'INVALID_TIMESTAMP', message: 'LogicSampleModel.timestamp must be non-negative.' });
  }
  return w;
}

export function validateOscilloscopeChannelModel(model: OscilloscopeChannelModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_OSC_CHANNEL', message: 'OscilloscopeChannelModel is null or not an object.' }); return w; }
  if (!model.channelId || typeof model.channelId !== 'string' || model.channelId.trim() === '') {
    w.push({ code: 'EMPTY_CHANNEL_ID', message: 'OscilloscopeChannelModel.channelId is empty.' });
  }
  if (!model.esp32Id || typeof model.esp32Id !== 'string' || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'OscilloscopeChannelModel.esp32Id is empty.' });
  }
  if (typeof model.pinNumber !== 'number' || model.pinNumber < 0) {
    w.push({ code: 'INVALID_PIN_NUMBER', message: 'OscilloscopeChannelModel.pinNumber must be non-negative.' });
  }
  if (typeof model.verticalScale !== 'number' || model.verticalScale <= 0) {
    w.push({ code: 'INVALID_VERTICAL_SCALE', message: 'OscilloscopeChannelModel.verticalScale must be positive.' });
  }
  return w;
}

export function validateOscilloscopeCaptureModel(model: OscilloscopeCaptureModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_OSC_CAPTURE', message: 'OscilloscopeCaptureModel is null or not an object.' }); return w; }
  if (!model.captureId || typeof model.captureId !== 'string' || model.captureId.trim() === '') {
    w.push({ code: 'EMPTY_CAPTURE_ID', message: 'OscilloscopeCaptureModel.captureId is empty.' });
  }
  if (!VALID_CAPTURE_STATES.includes(model.state)) {
    w.push({ code: 'INVALID_CAPTURE_STATE', message: `OscilloscopeCaptureModel.state "${model.state}" is not valid.` });
  }
  if (typeof model.sampleRateHz !== 'number' || model.sampleRateHz <= 0) {
    w.push({ code: 'INVALID_SAMPLE_RATE', message: 'OscilloscopeCaptureModel.sampleRateHz must be positive.' });
  }
  if (typeof model.triggerLevel !== 'number') {
    w.push({ code: 'INVALID_TRIGGER_LEVEL', message: 'OscilloscopeCaptureModel.triggerLevel must be a number.' });
  }
  return w;
}

export function validateWaveformBufferModel(model: WaveformBufferModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_WAVEFORM_BUFFER', message: 'WaveformBufferModel is null or not an object.' }); return w; }
  if (!model.bufferId || typeof model.bufferId !== 'string' || model.bufferId.trim() === '') {
    w.push({ code: 'EMPTY_BUFFER_ID', message: 'WaveformBufferModel.bufferId is empty.' });
  }
  if (typeof model.maxSize !== 'number' || model.maxSize <= 0) {
    w.push({ code: 'INVALID_MAX_SIZE', message: 'WaveformBufferModel.maxSize must be positive.' });
  }
  if (!Array.isArray(model.timestamps) || !Array.isArray(model.voltages)) {
    w.push({ code: 'INVALID_ARRAYS', message: 'WaveformBufferModel.timestamps and voltages must be arrays.' });
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateLogicAnalyzerChannelIds(models: LogicAnalyzerChannelModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.channelId)) { w.push({ code: 'DUPLICATE_LOGIC_CHANNEL_ID', message: `Duplicate logic analyzer channel ID: "${m.channelId}".` }); }
    seen.add(m.channelId);
  }
  return w;
}

export function validateDuplicateLogicCaptureIds(models: LogicCaptureModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.captureId)) { w.push({ code: 'DUPLICATE_LOGIC_CAPTURE_ID', message: `Duplicate logic capture ID: "${m.captureId}".` }); }
    seen.add(m.captureId);
  }
  return w;
}

export function validateDuplicateLogicSampleIds(models: LogicSampleModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.sampleId)) { w.push({ code: 'DUPLICATE_LOGIC_SAMPLE_ID', message: `Duplicate logic sample ID: "${m.sampleId}".` }); }
    seen.add(m.sampleId);
  }
  return w;
}

export function validateDuplicateOscilloscopeChannelIds(models: OscilloscopeChannelModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.channelId)) { w.push({ code: 'DUPLICATE_OSC_CHANNEL_ID', message: `Duplicate oscilloscope channel ID: "${m.channelId}".` }); }
    seen.add(m.channelId);
  }
  return w;
}

export function validateDuplicateOscilloscopeCaptureIds(models: OscilloscopeCaptureModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.captureId)) { w.push({ code: 'DUPLICATE_OSC_CAPTURE_ID', message: `Duplicate oscilloscope capture ID: "${m.captureId}".` }); }
    seen.add(m.captureId);
  }
  return w;
}

export function validateDuplicateWaveformBufferIds(models: WaveformBufferModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.bufferId)) { w.push({ code: 'DUPLICATE_WAVEFORM_BUFFER_ID', message: `Duplicate waveform buffer ID: "${m.bufferId}".` }); }
    seen.add(m.bufferId);
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// PURE LOGIC ANALYZER OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a logic analyzer channel for monitoring a digital pin.
 */
export function logicCreateChannel(
  esp32Id: string,
  channelId: string,
  pinNumber: number,
  label: string,
  colorIndex: number = 0,
): LogicAnalyzerChannelModel {
  return createDefaultLogicAnalyzerChannelModel(channelId, {
    esp32Id,
    pinNumber,
    channelLabel: label,
    colorHex: LOGIC_CHANNEL_COLORS[colorIndex % LOGIC_CHANNEL_COLORS.length],
  });
}

/**
 * Arm a capture — transition from IDLE → ARMED.
 */
export function logicArmCapture(capture: LogicCaptureModel, triggerChannelId: string, triggerMode: TriggerMode): LogicCaptureModel {
  return {
    ...capture,
    state: 'ARMED',
    triggerChannelId,
    triggerMode,
  };
}

/**
 * Start capturing — transition from ARMED → CAPTURING.
 */
export function logicStartCapture(capture: LogicCaptureModel, timestamp: number): LogicCaptureModel {
  return {
    ...capture,
    state: 'CAPTURING',
    startTimestamp: timestamp,
  };
}

/**
 * Stop capturing — transition to STOPPED.
 */
export function logicStopCapture(capture: LogicCaptureModel, timestamp: number): LogicCaptureModel {
  return {
    ...capture,
    state: 'STOPPED',
    endTimestamp: timestamp,
  };
}

/**
 * Clear a capture — reset to IDLE with no data.
 */
export function logicClearCapture(capture: LogicCaptureModel): LogicCaptureModel {
  return {
    ...capture,
    state: 'IDLE',
    startTimestamp: 0,
    endTimestamp: 0,
  };
}

/**
 * Export capture data as JSON-safe object.
 */
export function logicExportCapture(capture: LogicCaptureModel, samples: LogicSampleModel[]): { capture: LogicCaptureModel; samples: LogicSampleModel[] } {
  return {
    capture: JSON.parse(JSON.stringify(capture)),
    samples: samples
      .filter(s => s.captureId === capture.captureId)
      .map(s => JSON.parse(JSON.stringify(s))),
  };
}

/**
 * Record a logic sample — captures a HIGH/LOW transition.
 */
export function logicRecordSample(
  captureId: string,
  channelId: string,
  logicLevel: LogicLevel,
  timestamp: number,
  sampleIndex: number,
  pulseWidthUs: number = 0,
): LogicSampleModel {
  return createDefaultLogicSampleModel(`${captureId}_${channelId}_${sampleIndex}`, {
    captureId,
    channelId,
    logicLevel,
    timestamp,
    sampleIndex,
    pulseWidthUs,
  });
}

/**
 * Check if a trigger condition is met on a logic transition.
 */
export function checkTrigger(triggerMode: TriggerMode, prevLevel: LogicLevel, newLevel: LogicLevel): boolean {
  switch (triggerMode) {
    case 'RISING': return prevLevel === 'LOW' && newLevel === 'HIGH';
    case 'FALLING': return prevLevel === 'HIGH' && newLevel === 'LOW';
    case 'CHANGE': return prevLevel !== newLevel;
    case 'HIGH': return newLevel === 'HIGH';
    case 'LOW': return newLevel === 'LOW';
    case 'NONE': return true;
    default: return false;
  }
}

/**
 * Record a GPIO digital write transition for the logic analyzer.
 * Returns the sample and updated capture if trigger fires.
 */
export function logicRecordDigitalWrite(
  capture: LogicCaptureModel,
  channelId: string,
  logicLevel: LogicLevel,
  prevLevel: LogicLevel,
  timestamp: number,
  sampleIndex: number,
  pulseWidthUs: number = 0,
): { sample: LogicSampleModel; capture: LogicCaptureModel } {
  const sample = logicRecordSample(capture.captureId, channelId, logicLevel, timestamp, sampleIndex, pulseWidthUs);

  let updatedCapture = { ...capture };
  // If capture is ARMED and trigger fires, start capturing
  if (capture.state === 'ARMED' && capture.triggerChannelId === channelId) {
    if (checkTrigger(capture.triggerMode, prevLevel, logicLevel)) {
      updatedCapture = logicStartCapture(updatedCapture, timestamp);
    }
  }

  return { sample, capture: updatedCapture };
}

/**
 * Get all samples for a specific channel from a capture, ordered by sampleIndex.
 */
export function getChannelSamples(samples: LogicSampleModel[], captureId: string, channelId: string): LogicSampleModel[] {
  return samples
    .filter(s => s.captureId === captureId && s.channelId === channelId)
    .sort((a, b) => a.sampleIndex - b.sampleIndex);
}

/**
 * Get all samples for a capture, ordered by timestamp.
 */
export function getCaptureSamples(samples: LogicSampleModel[], captureId: string): LogicSampleModel[] {
  return samples
    .filter(s => s.captureId === captureId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Trim samples to maxSamples — keeps most recent.
 */
export function trimLogicSamples(samples: LogicSampleModel[], captureId: string, maxSamples: number): LogicSampleModel[] {
  const captureSamples = samples.filter(s => s.captureId === captureId);
  const otherSamples = samples.filter(s => s.captureId !== captureId);
  if (captureSamples.length <= maxSamples) return samples;
  const trimmed = captureSamples.slice(captureSamples.length - maxSamples);
  return [...otherSamples, ...trimmed];
}

// ═══════════════════════════════════════════════════════════════
// PURE OSCILLOSCOPE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Sample a voltage value — add to waveform buffer.
 */
export function sampleVoltage(
  buffer: WaveformBufferModel,
  timestamp: number,
  voltage: number,
): WaveformBufferModel {
  const timestamps = [...buffer.timestamps, timestamp];
  const voltages = [...buffer.voltages, voltage];
  let count = buffer.sampleCount + 1;

  // Ring buffer — trim to maxSize
  if (timestamps.length > buffer.maxSize) {
    const excess = timestamps.length - buffer.maxSize;
    timestamps.splice(0, excess);
    voltages.splice(0, excess);
    count = buffer.maxSize;
  }

  return {
    ...buffer,
    timestamps,
    voltages,
    sampleCount: count,
  };
}

/**
 * Start oscilloscope capture.
 */
export function oscilloscopeStartCapture(capture: OscilloscopeCaptureModel, timestamp: number): OscilloscopeCaptureModel {
  return {
    ...capture,
    state: 'CAPTURING',
    startTimestamp: timestamp,
  };
}

/**
 * Stop oscilloscope capture.
 */
export function oscilloscopeStopCapture(capture: OscilloscopeCaptureModel, timestamp: number): OscilloscopeCaptureModel {
  return {
    ...capture,
    state: 'STOPPED',
    endTimestamp: timestamp,
  };
}

/**
 * Clear waveform buffer.
 */
export function clearWaveform(buffer: WaveformBufferModel): WaveformBufferModel {
  return {
    ...buffer,
    timestamps: [],
    voltages: [],
    sampleCount: 0,
  };
}

/**
 * Export waveform data.
 */
export function exportWaveform(capture: OscilloscopeCaptureModel, buffers: WaveformBufferModel[]): { capture: OscilloscopeCaptureModel; buffers: WaveformBufferModel[] } {
  return {
    capture: JSON.parse(JSON.stringify(capture)),
    buffers: buffers
      .filter(b => b.captureId === capture.captureId)
      .map(b => JSON.parse(JSON.stringify(b))),
  };
}

/**
 * Convert PWM duty cycle to voltage level.
 * ESP32 operates at 3.3V logic.
 */
export function pwmDutyToVoltage(dutyCycle: number, maxDuty: number = 255, vcc: number = 3.3): number {
  if (maxDuty === 0) return 0;
  return (dutyCycle / maxDuty) * vcc;
}

/**
 * Convert digital HIGH/LOW to voltage.
 */
export function digitalToVoltage(level: LogicLevel, vcc: number = 3.3): number {
  return level === 'HIGH' ? vcc : 0;
}

/**
 * Record an HC-SR04 trigger pulse into logic analyzer samples.
 */
export function recordTrigPulse(
  captureId: string,
  channelId: string,
  startTimestamp: number,
  pulseWidthUs: number,
  sampleIndexBase: number,
): LogicSampleModel[] {
  return [
    logicRecordSample(captureId, channelId, 'HIGH', startTimestamp, sampleIndexBase, pulseWidthUs),
    logicRecordSample(captureId, channelId, 'LOW', startTimestamp + pulseWidthUs, sampleIndexBase + 1, 0),
  ];
}

/**
 * Record an HC-SR04 echo pulse into logic analyzer samples.
 */
export function recordEchoPulse(
  captureId: string,
  channelId: string,
  startTimestamp: number,
  echoWidthUs: number,
  sampleIndexBase: number,
): LogicSampleModel[] {
  return [
    logicRecordSample(captureId, channelId, 'HIGH', startTimestamp, sampleIndexBase, echoWidthUs),
    logicRecordSample(captureId, channelId, 'LOW', startTimestamp + echoWidthUs, sampleIndexBase + 1, 0),
  ];
}

/**
 * Record a servo PWM pulse train into waveform buffer.
 * Generates a standard 50Hz (20ms) servo signal with given duty.
 */
export function recordServoPWM(
  buffer: WaveformBufferModel,
  startTimestamp: number,
  pulseWidthUs: number,
  periodUs: number = 20000,
  cycles: number = 1,
  vcc: number = 3.3,
): WaveformBufferModel {
  let result = { ...buffer, timestamps: [...buffer.timestamps], voltages: [...buffer.voltages], sampleCount: buffer.sampleCount };
  for (let c = 0; c < cycles; c++) {
    const cycleStart = startTimestamp + c * periodUs;
    // Rising edge
    result = sampleVoltage(result, cycleStart, vcc);
    // Falling edge (end of pulse)
    result = sampleVoltage(result, cycleStart + pulseWidthUs, 0);
    // Period end
    result = sampleVoltage(result, cycleStart + periodUs, 0);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// RENDER REGISTRY (reusable deep-copy registry, same pattern)
// ═══════════════════════════════════════════════════════════════

class RenderRegistry<T> {
  private data = new Map<string, T>();
  private order: string[] = [];

  get size(): number { return this.data.size; }

  register(id: string, model: T): void {
    this.data.set(id, JSON.parse(JSON.stringify(model)));
    if (!this.order.includes(id)) this.order.push(id);
  }

  lookup(id: string): T | undefined {
    const m = this.data.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : undefined;
  }

  getAll(): T[] {
    return this.order
      .map(id => this.data.get(id))
      .filter((m): m is T => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this.data.get(id);
    if (!existing) return;
    this.data.set(id, JSON.parse(JSON.stringify({ ...existing, ...partial })));
  }

  remove(id: string): void {
    this.data.delete(id);
    this.order = this.order.filter(e => e !== id);
  }

  clear(): void { this.data.clear(); this.order = []; }
  has(id: string): boolean { return this.data.has(id); }
  keys(): string[] { return [...this.order]; }
}

// ═══════════════════════════════════════════════════════════════
// LOGIC ANALYZER SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * LogicAnalyzerSynchronizer — manages all 6 logic analyzer & oscilloscope registries.
 */
export class LogicAnalyzerSynchronizer {
  public logicAnalyzerChannels = new RenderRegistry<LogicAnalyzerChannelModel>();
  public logicCaptures = new RenderRegistry<LogicCaptureModel>();
  public logicSamples = new RenderRegistry<LogicSampleModel>();
  public oscilloscopeChannels = new RenderRegistry<OscilloscopeChannelModel>();
  public oscilloscopeCaptures = new RenderRegistry<OscilloscopeCaptureModel>();
  public waveformBuffers = new RenderRegistry<WaveformBufferModel>();

  buildSnapshot(
    laChannels: LogicAnalyzerChannelModel[],
    lCaptures: LogicCaptureModel[],
    lSamples: LogicSampleModel[],
    oscChannels: OscilloscopeChannelModel[],
    oscCaptures: OscilloscopeCaptureModel[],
    wfBuffers: WaveformBufferModel[],
  ): LogicAnalyzerSnapshot {
    this.clear();
    for (const m of laChannels) { if (validateLogicAnalyzerChannelModel(m).length === 0) this.logicAnalyzerChannels.register(m.channelId, m); }
    for (const m of lCaptures) { if (validateLogicCaptureModel(m).length === 0) this.logicCaptures.register(m.captureId, m); }
    for (const m of lSamples) { if (validateLogicSampleModel(m).length === 0) this.logicSamples.register(m.sampleId, m); }
    for (const m of oscChannels) { if (validateOscilloscopeChannelModel(m).length === 0) this.oscilloscopeChannels.register(m.channelId, m); }
    for (const m of oscCaptures) { if (validateOscilloscopeCaptureModel(m).length === 0) this.oscilloscopeCaptures.register(m.captureId, m); }
    for (const m of wfBuffers) { if (validateWaveformBufferModel(m).length === 0) this.waveformBuffers.register(m.bufferId, m); }

    return this.toJSON();
  }

  clear(): void {
    this.logicAnalyzerChannels.clear();
    this.logicCaptures.clear();
    this.logicSamples.clear();
    this.oscilloscopeChannels.clear();
    this.oscilloscopeCaptures.clear();
    this.waveformBuffers.clear();
  }

  clone(): LogicAnalyzerSynchronizer {
    const c = new LogicAnalyzerSynchronizer();
    c.buildSnapshot(
      this.logicAnalyzerChannels.getAll(), this.logicCaptures.getAll(), this.logicSamples.getAll(),
      this.oscilloscopeChannels.getAll(), this.oscilloscopeCaptures.getAll(), this.waveformBuffers.getAll(),
    );
    return c;
  }

  toJSON(): LogicAnalyzerSnapshot {
    return {
      logicAnalyzerChannels: this.logicAnalyzerChannels.getAll(),
      logicCaptures: this.logicCaptures.getAll(),
      logicSamples: this.logicSamples.getAll(),
      oscilloscopeChannels: this.oscilloscopeChannels.getAll(),
      oscilloscopeCaptures: this.oscilloscopeCaptures.getAll(),
      waveformBuffers: this.waveformBuffers.getAll(),
    };
  }

  fromJSON(json: LogicAnalyzerSnapshot | null | undefined): void {
    this.clear();
    if (!json || typeof json !== 'object') return;
    if (Array.isArray(json.logicAnalyzerChannels)) for (const m of json.logicAnalyzerChannels) this.logicAnalyzerChannels.register(m.channelId, m);
    if (Array.isArray(json.logicCaptures)) for (const m of json.logicCaptures) this.logicCaptures.register(m.captureId, m);
    if (Array.isArray(json.logicSamples)) for (const m of json.logicSamples) this.logicSamples.register(m.sampleId, m);
    if (Array.isArray(json.oscilloscopeChannels)) for (const m of json.oscilloscopeChannels) this.oscilloscopeChannels.register(m.channelId, m);
    if (Array.isArray(json.oscilloscopeCaptures)) for (const m of json.oscilloscopeCaptures) this.oscilloscopeCaptures.register(m.captureId, m);
    if (Array.isArray(json.waveformBuffers)) for (const m of json.waveformBuffers) this.waveformBuffers.register(m.bufferId, m);
  }
}
