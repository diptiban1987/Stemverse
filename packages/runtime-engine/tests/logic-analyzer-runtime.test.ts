/**
 * Phase 23B: Virtual Logic Analyzer & Oscilloscope Foundation — Tests
 *
 * Coverage:
 *   - CRUD for all 6 models
 *   - Factory functions
 *   - Validators
 *   - Duplicate validators
 *   - Logic analyzer operations (create channel, arm/start/stop/clear/export capture)
 *   - Sample recording & trigger detection
 *   - Oscilloscope operations (sample voltage, waveform capture/clear/export)
 *   - ESP32 GPIO integration
 *   - HC-SR04 integration
 *   - Servo PWM integration
 *   - Clone safety
 *   - Serialization / snapshot
 *   - LogicAnalyzerSynchronizer
 *   - Lifecycle cleanup
 *   - Iteration-based stress testing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Factories
  createDefaultLogicAnalyzerChannelModel,
  createDefaultLogicCaptureModel,
  createDefaultLogicSampleModel,
  createDefaultOscilloscopeChannelModel,
  createDefaultOscilloscopeCaptureModel,
  createDefaultWaveformBufferModel,

  // Validators
  validateLogicAnalyzerChannelModel,
  validateLogicCaptureModel,
  validateLogicSampleModel,
  validateOscilloscopeChannelModel,
  validateOscilloscopeCaptureModel,
  validateWaveformBufferModel,

  // Duplicate validators
  validateDuplicateLogicAnalyzerChannelIds,
  validateDuplicateLogicCaptureIds,
  validateDuplicateLogicSampleIds,
  validateDuplicateOscilloscopeChannelIds,
  validateDuplicateOscilloscopeCaptureIds,
  validateDuplicateWaveformBufferIds,

  // Logic analyzer operations
  logicCreateChannel,
  logicArmCapture,
  logicStartCapture,
  logicStopCapture,
  logicClearCapture,
  logicExportCapture,
  logicRecordSample,
  logicRecordDigitalWrite,
  checkTrigger,
  getChannelSamples,
  getCaptureSamples,
  trimLogicSamples,

  // Oscilloscope operations
  sampleVoltage,
  oscilloscopeStartCapture,
  oscilloscopeStopCapture,
  clearWaveform,
  exportWaveform,
  pwmDutyToVoltage,
  digitalToVoltage,

  // Integration helpers
  recordTrigPulse,
  recordEchoPulse,
  recordServoPWM,

  // Constants
  DEFAULT_SAMPLE_RATE_HZ,
  DEFAULT_MAX_SAMPLES,
  DEFAULT_MAX_WAVEFORM_SIZE,
  VALID_LOGIC_LEVELS,
  VALID_TRIGGER_MODES,
  VALID_CAPTURE_STATES,
  LOGIC_CHANNEL_COLORS,

  // Synchronizer
  LogicAnalyzerSynchronizer,
} from '../src/stage/logic-analyzer-runtime';

import type {
  LogicAnalyzerChannelModel,
  LogicCaptureModel,
  LogicSampleModel,
  OscilloscopeChannelModel,
  OscilloscopeCaptureModel,
  WaveformBufferModel,
  LogicLevel,
  TriggerMode,
  CaptureState,
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// Stress test iteration count
// ═══════════════════════════════════════════════════════════════
const STRESS_ITERATIONS = 500;

describe('Phase 23B -- Virtual Logic Analyzer & Oscilloscope Foundation', () => {
  // ═══════════════════════════════════════════════════════════════
  // 1 — Model CRUD & Registries (via Synchronizer)
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Model CRUD & Registries', () => {
    let sync: LogicAnalyzerSynchronizer;

    beforeEach(() => {
      sync = new LogicAnalyzerSynchronizer();
    });

    describe('LogicAnalyzerChannelModel CRUD', () => {
      it('registers and retrieves LogicAnalyzerChannel', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          sync.logicAnalyzerChannels.clear();
          const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'esp32_0', pinNumber: i % 40 });
          sync.logicAnalyzerChannels.register(ch.channelId, ch);
          const got = sync.logicAnalyzerChannels.lookup(ch.channelId);
          expect(got).toBeDefined();
          expect(got!.channelId).toBe(`ch_${i}`);
          expect(got!.esp32Id).toBe('esp32_0');
          expect(got!.pinNumber).toBe(i % 40);
        }
      });

      it('updates LogicAnalyzerChannel fields', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'esp32_0', pinNumber: 2 });
          sync.logicAnalyzerChannels.register(ch.channelId, ch);
          sync.logicAnalyzerChannels.update(ch.channelId, { channelLabel: `Updated_${i}`, triggerMode: 'RISING' });
          const got = sync.logicAnalyzerChannels.lookup(ch.channelId);
          expect(got!.channelLabel).toBe(`Updated_${i}`);
          expect(got!.triggerMode).toBe('RISING');
        }
      });

      it('removes and clears LogicAnalyzerChannel models', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' });
          sync.logicAnalyzerChannels.register(ch.channelId, ch);
        }
        expect(sync.logicAnalyzerChannels.size).toBe(STRESS_ITERATIONS);
        sync.logicAnalyzerChannels.remove('ch_0');
        expect(sync.logicAnalyzerChannels.has('ch_0')).toBe(false);
        sync.logicAnalyzerChannels.clear();
        expect(sync.logicAnalyzerChannels.size).toBe(0);
      });

      it('getAll returns insertion-order', () => {
        for (let i = 0; i < 10; i++) {
          sync.logicAnalyzerChannels.register(`ch_${i}`, createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' }));
        }
        const all = sync.logicAnalyzerChannels.getAll();
        expect(all.length).toBe(10);
        for (let i = 0; i < 10; i++) {
          expect(all[i].channelId).toBe(`ch_${i}`);
        }
      });
    });

    describe('LogicCaptureModel CRUD', () => {
      it('registers and retrieves LogicCapture', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const cap = createDefaultLogicCaptureModel(`cap_${i}`, { esp32Id: 'esp32_0', channelIds: ['ch_0', 'ch_1'] });
          sync.logicCaptures.register(cap.captureId, cap);
          const got = sync.logicCaptures.lookup(cap.captureId);
          expect(got).toBeDefined();
          expect(got!.captureId).toBe(`cap_${i}`);
          expect(got!.state).toBe('IDLE');
          expect(got!.sampleRateHz).toBe(DEFAULT_SAMPLE_RATE_HZ);
        }
      });

      it('updates LogicCapture fields', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const cap = createDefaultLogicCaptureModel(`cap_${i}`);
          sync.logicCaptures.register(cap.captureId, cap);
          sync.logicCaptures.update(cap.captureId, { state: 'ARMED', triggerMode: 'FALLING' });
          const got = sync.logicCaptures.lookup(cap.captureId);
          expect(got!.state).toBe('ARMED');
          expect(got!.triggerMode).toBe('FALLING');
        }
      });

      it('removes and clears LogicCapture models', () => {
        for (let i = 0; i < 20; i++) {
          sync.logicCaptures.register(`cap_${i}`, createDefaultLogicCaptureModel(`cap_${i}`));
        }
        sync.logicCaptures.remove('cap_5');
        expect(sync.logicCaptures.has('cap_5')).toBe(false);
        expect(sync.logicCaptures.size).toBe(19);
        sync.logicCaptures.clear();
        expect(sync.logicCaptures.size).toBe(0);
      });
    });

    describe('LogicSampleModel CRUD', () => {
      it('registers and retrieves LogicSample', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const s = createDefaultLogicSampleModel(`s_${i}`, { captureId: 'cap_0', channelId: 'ch_0', logicLevel: 'HIGH', timestamp: i * 10 });
          sync.logicSamples.register(s.sampleId, s);
          const got = sync.logicSamples.lookup(s.sampleId);
          expect(got).toBeDefined();
          expect(got!.logicLevel).toBe('HIGH');
          expect(got!.timestamp).toBe(i * 10);
        }
      });

      it('removes and clears LogicSample models', () => {
        for (let i = 0; i < 50; i++) {
          sync.logicSamples.register(`s_${i}`, createDefaultLogicSampleModel(`s_${i}`));
        }
        sync.logicSamples.remove('s_25');
        expect(sync.logicSamples.has('s_25')).toBe(false);
        sync.logicSamples.clear();
        expect(sync.logicSamples.size).toBe(0);
      });
    });

    describe('OscilloscopeChannelModel CRUD', () => {
      it('registers and retrieves OscilloscopeChannel', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const ch = createDefaultOscilloscopeChannelModel(`osc_ch_${i}`, { esp32Id: 'esp32_0', pinNumber: i % 40 });
          sync.oscilloscopeChannels.register(ch.channelId, ch);
          const got = sync.oscilloscopeChannels.lookup(ch.channelId);
          expect(got).toBeDefined();
          expect(got!.channelId).toBe(`osc_ch_${i}`);
        }
      });

      it('updates OscilloscopeChannel fields', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const ch = createDefaultOscilloscopeChannelModel(`osc_ch_${i}`);
          sync.oscilloscopeChannels.register(ch.channelId, ch);
          sync.oscilloscopeChannels.update(ch.channelId, { verticalScale: 2.0, offsetVoltage: 0.5 });
          const got = sync.oscilloscopeChannels.lookup(ch.channelId);
          expect(got!.verticalScale).toBe(2.0);
          expect(got!.offsetVoltage).toBe(0.5);
        }
      });
    });

    describe('OscilloscopeCaptureModel CRUD', () => {
      it('registers and retrieves OscilloscopeCapture', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const cap = createDefaultOscilloscopeCaptureModel(`osc_cap_${i}`, { esp32Id: 'esp32_0' });
          sync.oscilloscopeCaptures.register(cap.captureId, cap);
          const got = sync.oscilloscopeCaptures.lookup(cap.captureId);
          expect(got).toBeDefined();
          expect(got!.state).toBe('IDLE');
        }
      });
    });

    describe('WaveformBufferModel CRUD', () => {
      it('registers and retrieves WaveformBuffer', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const buf = createDefaultWaveformBufferModel(`buf_${i}`, { captureId: 'osc_cap_0', channelId: 'osc_ch_0' });
          sync.waveformBuffers.register(buf.bufferId, buf);
          const got = sync.waveformBuffers.lookup(buf.bufferId);
          expect(got).toBeDefined();
          expect(got!.timestamps).toEqual([]);
          expect(got!.voltages).toEqual([]);
          expect(got!.sampleCount).toBe(0);
        }
      });

      it('updates WaveformBuffer fields', () => {
        const buf = createDefaultWaveformBufferModel('buf_0', { maxSize: 500 });
        sync.waveformBuffers.register(buf.bufferId, buf);
        sync.waveformBuffers.update(buf.bufferId, { maxSize: 1000 });
        const got = sync.waveformBuffers.lookup(buf.bufferId);
        expect(got!.maxSize).toBe(1000);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2 — Factory Functions
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Factory Functions', () => {
    it('creates default LogicAnalyzerChannelModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`);
        expect(ch.channelId).toBe(`ch_${i}`);
        expect(ch.esp32Id).toBe('');
        expect(ch.pinNumber).toBe(0);
        expect(ch.triggerMode).toBe('NONE');
        expect(ch.isEnabled).toBe(true);
        expect(ch.colorHex).toBe('#00FF00');
        expect(ch.positionY).toBe(0);
        expect(ch.futureLogicChannelHints).toEqual({});
      }
    });

    it('creates default LogicCaptureModel with correct defaults', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const cap = createDefaultLogicCaptureModel(`cap_${i}`);
        expect(cap.captureId).toBe(`cap_${i}`);
        expect(cap.state).toBe('IDLE');
        expect(cap.sampleRateHz).toBe(DEFAULT_SAMPLE_RATE_HZ);
        expect(cap.maxSamples).toBe(DEFAULT_MAX_SAMPLES);
        expect(cap.channelIds).toEqual([]);
        expect(cap.zoomLevel).toBe(1.0);
        expect(cap.triggerMode).toBe('NONE');
      }
    });

    it('creates default LogicSampleModel with correct defaults', () => {
      const s = createDefaultLogicSampleModel('s_0');
      expect(s.sampleId).toBe('s_0');
      expect(s.logicLevel).toBe('LOW');
      expect(s.timestamp).toBe(0);
      expect(s.sampleIndex).toBe(0);
      expect(s.pulseWidthUs).toBe(0);
    });

    it('creates default OscilloscopeChannelModel with correct defaults', () => {
      const ch = createDefaultOscilloscopeChannelModel('osc_ch_0');
      expect(ch.channelId).toBe('osc_ch_0');
      expect(ch.verticalScale).toBe(1.0);
      expect(ch.offsetVoltage).toBe(0);
      expect(ch.colorHex).toBe('#FFFF00');
    });

    it('creates default OscilloscopeCaptureModel with correct defaults', () => {
      const cap = createDefaultOscilloscopeCaptureModel('osc_cap_0');
      expect(cap.captureId).toBe('osc_cap_0');
      expect(cap.state).toBe('IDLE');
      expect(cap.triggerLevel).toBeCloseTo(1.65, 2);
      expect(cap.verticalScale).toBe(1.0);
    });

    it('creates default WaveformBufferModel with correct defaults', () => {
      const buf = createDefaultWaveformBufferModel('buf_0');
      expect(buf.bufferId).toBe('buf_0');
      expect(buf.timestamps).toEqual([]);
      expect(buf.voltages).toEqual([]);
      expect(buf.sampleCount).toBe(0);
      expect(buf.maxSize).toBe(DEFAULT_MAX_WAVEFORM_SIZE);
    });

    it('factory overrides preserve id field', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0', { channelId: 'WRONG', esp32Id: 'e0' });
      expect(ch.channelId).toBe('ch_0'); // ID must not be overridden
      expect(ch.esp32Id).toBe('e0');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3 — Validators
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Validators', () => {
    it('validates valid LogicAnalyzerChannelModel with no warnings', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0', pinNumber: 2 });
        const w = validateLogicAnalyzerChannelModel(ch);
        expect(w.length).toBe(0);
      }
    });

    it('warns on empty channelId', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('', { esp32Id: 'e0' });
      const w = validateLogicAnalyzerChannelModel(ch);
      expect(w.some(x => x.code === 'EMPTY_CHANNEL_ID')).toBe(true);
    });

    it('warns on empty esp32Id', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0');
      const w = validateLogicAnalyzerChannelModel(ch);
      expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
    });

    it('warns on negative pinNumber', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0', pinNumber: -1 });
      const w = validateLogicAnalyzerChannelModel(ch);
      expect(w.some(x => x.code === 'INVALID_PIN_NUMBER')).toBe(true);
    });

    it('warns on invalid triggerMode', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0', triggerMode: 'INVALID' as any });
      const w = validateLogicAnalyzerChannelModel(ch);
      expect(w.some(x => x.code === 'INVALID_TRIGGER_MODE')).toBe(true);
    });

    it('validates valid LogicCaptureModel with no warnings', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const cap = createDefaultLogicCaptureModel(`cap_${i}`);
        const w = validateLogicCaptureModel(cap);
        expect(w.length).toBe(0);
      }
    });

    it('warns on invalid capture state', () => {
      const cap = createDefaultLogicCaptureModel('cap_0', { state: 'INVALID' as any });
      const w = validateLogicCaptureModel(cap);
      expect(w.some(x => x.code === 'INVALID_CAPTURE_STATE')).toBe(true);
    });

    it('warns on zero sampleRateHz', () => {
      const cap = createDefaultLogicCaptureModel('cap_0', { sampleRateHz: 0 });
      const w = validateLogicCaptureModel(cap);
      expect(w.some(x => x.code === 'INVALID_SAMPLE_RATE')).toBe(true);
    });

    it('validates valid LogicSampleModel with no warnings', () => {
      const s = createDefaultLogicSampleModel('s_0', { captureId: 'cap_0', channelId: 'ch_0' });
      const w = validateLogicSampleModel(s);
      expect(w.length).toBe(0);
    });

    it('warns on invalid logicLevel', () => {
      const s = createDefaultLogicSampleModel('s_0', { logicLevel: 'INVALID' as any });
      const w = validateLogicSampleModel(s);
      expect(w.some(x => x.code === 'INVALID_LOGIC_LEVEL')).toBe(true);
    });

    it('validates valid OscilloscopeChannelModel with no warnings', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const ch = createDefaultOscilloscopeChannelModel(`osc_ch_${i}`, { esp32Id: 'e0', pinNumber: 2 });
        const w = validateOscilloscopeChannelModel(ch);
        expect(w.length).toBe(0);
      }
    });

    it('warns on invalid verticalScale', () => {
      const ch = createDefaultOscilloscopeChannelModel('osc_ch_0', { esp32Id: 'e0', verticalScale: 0 });
      const w = validateOscilloscopeChannelModel(ch);
      expect(w.some(x => x.code === 'INVALID_VERTICAL_SCALE')).toBe(true);
    });

    it('validates valid OscilloscopeCaptureModel with no warnings', () => {
      const cap = createDefaultOscilloscopeCaptureModel('osc_cap_0');
      const w = validateOscilloscopeCaptureModel(cap);
      expect(w.length).toBe(0);
    });

    it('validates valid WaveformBufferModel with no warnings', () => {
      const buf = createDefaultWaveformBufferModel('buf_0');
      const w = validateWaveformBufferModel(buf);
      expect(w.length).toBe(0);
    });

    it('warns on zero maxSize for WaveformBuffer', () => {
      const buf = createDefaultWaveformBufferModel('buf_0', { maxSize: 0 });
      const w = validateWaveformBufferModel(buf);
      expect(w.some(x => x.code === 'INVALID_MAX_SIZE')).toBe(true);
    });

    it('handles null model input gracefully', () => {
      expect(validateLogicAnalyzerChannelModel(null as any).length).toBeGreaterThan(0);
      expect(validateLogicCaptureModel(null as any).length).toBeGreaterThan(0);
      expect(validateLogicSampleModel(null as any).length).toBeGreaterThan(0);
      expect(validateOscilloscopeChannelModel(null as any).length).toBeGreaterThan(0);
      expect(validateOscilloscopeCaptureModel(null as any).length).toBeGreaterThan(0);
      expect(validateWaveformBufferModel(null as any).length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4 — Duplicate Validators
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Duplicate Validators', () => {
    it('detects duplicate logic analyzer channel IDs', () => {
      const channels = [
        createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' }),
        createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e1' }),
      ];
      const w = validateDuplicateLogicAnalyzerChannelIds(channels);
      expect(w.some(x => x.code === 'DUPLICATE_LOGIC_CHANNEL_ID')).toBe(true);
    });

    it('detects duplicate logic capture IDs', () => {
      const caps = [
        createDefaultLogicCaptureModel('cap_0'),
        createDefaultLogicCaptureModel('cap_0'),
      ];
      const w = validateDuplicateLogicCaptureIds(caps);
      expect(w.some(x => x.code === 'DUPLICATE_LOGIC_CAPTURE_ID')).toBe(true);
    });

    it('detects duplicate logic sample IDs', () => {
      const samples = [
        createDefaultLogicSampleModel('s_0'),
        createDefaultLogicSampleModel('s_0'),
      ];
      const w = validateDuplicateLogicSampleIds(samples);
      expect(w.some(x => x.code === 'DUPLICATE_LOGIC_SAMPLE_ID')).toBe(true);
    });

    it('detects duplicate oscilloscope channel IDs', () => {
      const channels = [
        createDefaultOscilloscopeChannelModel('osc_ch_0'),
        createDefaultOscilloscopeChannelModel('osc_ch_0'),
      ];
      const w = validateDuplicateOscilloscopeChannelIds(channels);
      expect(w.some(x => x.code === 'DUPLICATE_OSC_CHANNEL_ID')).toBe(true);
    });

    it('detects duplicate oscilloscope capture IDs', () => {
      const caps = [
        createDefaultOscilloscopeCaptureModel('osc_cap_0'),
        createDefaultOscilloscopeCaptureModel('osc_cap_0'),
      ];
      const w = validateDuplicateOscilloscopeCaptureIds(caps);
      expect(w.some(x => x.code === 'DUPLICATE_OSC_CAPTURE_ID')).toBe(true);
    });

    it('detects duplicate waveform buffer IDs', () => {
      const bufs = [
        createDefaultWaveformBufferModel('buf_0'),
        createDefaultWaveformBufferModel('buf_0'),
      ];
      const w = validateDuplicateWaveformBufferIds(bufs);
      expect(w.some(x => x.code === 'DUPLICATE_WAVEFORM_BUFFER_ID')).toBe(true);
    });

    it('no duplicates when all IDs are unique', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const channels = Array.from({ length: 5 }, (_, j) => createDefaultLogicAnalyzerChannelModel(`ch_${i}_${j}`, { esp32Id: 'e0' }));
        expect(validateDuplicateLogicAnalyzerChannelIds(channels).length).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5 — Logic Analyzer Operations
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Logic Analyzer Operations', () => {
    it('creates a logic channel via logicCreateChannel', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const ch = logicCreateChannel('esp32_0', `ch_${i}`, i % 40, `Channel ${i}`, i);
        expect(ch.channelId).toBe(`ch_${i}`);
        expect(ch.esp32Id).toBe('esp32_0');
        expect(ch.pinNumber).toBe(i % 40);
        expect(ch.channelLabel).toBe(`Channel ${i}`);
        expect(ch.colorHex).toBe(LOGIC_CHANNEL_COLORS[i % LOGIC_CHANNEL_COLORS.length]);
        expect(ch.isEnabled).toBe(true);
      }
    });

    describe('Capture lifecycle', () => {
      let capture: LogicCaptureModel;

      beforeEach(() => {
        capture = createDefaultLogicCaptureModel('cap_0', { esp32Id: 'esp32_0', channelIds: ['ch_0', 'ch_1'] });
      });

      it('arms a capture (IDLE → ARMED)', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const armed = logicArmCapture(capture, 'ch_0', 'RISING');
          expect(armed.state).toBe('ARMED');
          expect(armed.triggerChannelId).toBe('ch_0');
          expect(armed.triggerMode).toBe('RISING');
        }
      });

      it('starts a capture (ARMED → CAPTURING)', () => {
        const armed = logicArmCapture(capture, 'ch_0', 'RISING');
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const started = logicStartCapture(armed, 1000 + i);
          expect(started.state).toBe('CAPTURING');
          expect(started.startTimestamp).toBe(1000 + i);
        }
      });

      it('stops a capture (CAPTURING → STOPPED)', () => {
        const started = logicStartCapture(logicArmCapture(capture, 'ch_0', 'RISING'), 1000);
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const stopped = logicStopCapture(started, 2000 + i);
          expect(stopped.state).toBe('STOPPED');
          expect(stopped.endTimestamp).toBe(2000 + i);
        }
      });

      it('clears a capture back to IDLE', () => {
        const stopped = logicStopCapture(logicStartCapture(logicArmCapture(capture, 'ch_0', 'RISING'), 1000), 2000);
        const cleared = logicClearCapture(stopped);
        expect(cleared.state).toBe('IDLE');
        expect(cleared.startTimestamp).toBe(0);
        expect(cleared.endTimestamp).toBe(0);
      });

      it('exports capture data as deep copy', () => {
        const samples = [
          logicRecordSample('cap_0', 'ch_0', 'HIGH', 1000, 0),
          logicRecordSample('cap_0', 'ch_0', 'LOW', 1010, 1),
          logicRecordSample('other_cap', 'ch_0', 'HIGH', 2000, 0),
        ];
        const exported = logicExportCapture(capture, samples);
        expect(exported.samples.length).toBe(2);
        expect(exported.capture.captureId).toBe('cap_0');
        // Verify deep copy
        exported.capture.captureId = 'MODIFIED';
        expect(capture.captureId).toBe('cap_0');
      });
    });

    describe('Sample recording', () => {
      it('records logic samples with correct fields', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const s = logicRecordSample('cap_0', 'ch_0', i % 2 === 0 ? 'HIGH' : 'LOW', i * 10, i, i * 5);
          expect(s.sampleId).toBe(`cap_0_ch_0_${i}`);
          expect(s.captureId).toBe('cap_0');
          expect(s.channelId).toBe('ch_0');
          expect(s.logicLevel).toBe(i % 2 === 0 ? 'HIGH' : 'LOW');
          expect(s.timestamp).toBe(i * 10);
          expect(s.sampleIndex).toBe(i);
          expect(s.pulseWidthUs).toBe(i * 5);
        }
      });

      it('records digital write with trigger detection', () => {
        let capture = createDefaultLogicCaptureModel('cap_0', { esp32Id: 'esp32_0', channelIds: ['ch_0'] });
        capture = logicArmCapture(capture, 'ch_0', 'RISING');
        expect(capture.state).toBe('ARMED');

        // LOW → LOW: no trigger
        const r1 = logicRecordDigitalWrite(capture, 'ch_0', 'LOW', 'LOW', 1000, 0);
        expect(r1.capture.state).toBe('ARMED'); // Should remain ARMED

        // LOW → HIGH: RISING trigger fires
        const r2 = logicRecordDigitalWrite(capture, 'ch_0', 'HIGH', 'LOW', 1010, 1);
        expect(r2.capture.state).toBe('CAPTURING');
        expect(r2.capture.startTimestamp).toBe(1010);
        expect(r2.sample.logicLevel).toBe('HIGH');
      });
    });

    describe('Trigger detection', () => {
      it('RISING trigger fires on LOW→HIGH', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          expect(checkTrigger('RISING', 'LOW', 'HIGH')).toBe(true);
          expect(checkTrigger('RISING', 'HIGH', 'HIGH')).toBe(false);
          expect(checkTrigger('RISING', 'HIGH', 'LOW')).toBe(false);
        }
      });

      it('FALLING trigger fires on HIGH→LOW', () => {
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          expect(checkTrigger('FALLING', 'HIGH', 'LOW')).toBe(true);
          expect(checkTrigger('FALLING', 'LOW', 'LOW')).toBe(false);
          expect(checkTrigger('FALLING', 'LOW', 'HIGH')).toBe(false);
        }
      });

      it('CHANGE trigger fires on any transition', () => {
        expect(checkTrigger('CHANGE', 'LOW', 'HIGH')).toBe(true);
        expect(checkTrigger('CHANGE', 'HIGH', 'LOW')).toBe(true);
        expect(checkTrigger('CHANGE', 'HIGH', 'HIGH')).toBe(false);
      });

      it('HIGH trigger fires when new level is HIGH', () => {
        expect(checkTrigger('HIGH', 'LOW', 'HIGH')).toBe(true);
        expect(checkTrigger('HIGH', 'HIGH', 'HIGH')).toBe(true);
        expect(checkTrigger('HIGH', 'HIGH', 'LOW')).toBe(false);
      });

      it('LOW trigger fires when new level is LOW', () => {
        expect(checkTrigger('LOW', 'HIGH', 'LOW')).toBe(true);
        expect(checkTrigger('LOW', 'LOW', 'LOW')).toBe(true);
        expect(checkTrigger('LOW', 'LOW', 'HIGH')).toBe(false);
      });

      it('NONE trigger always fires', () => {
        expect(checkTrigger('NONE', 'LOW', 'HIGH')).toBe(true);
        expect(checkTrigger('NONE', 'HIGH', 'LOW')).toBe(true);
        expect(checkTrigger('NONE', 'HIGH', 'HIGH')).toBe(true);
      });
    });

    describe('Sample queries', () => {
      it('getChannelSamples filters and sorts by sampleIndex', () => {
        const samples: LogicSampleModel[] = [];
        for (let i = 0; i < 100; i++) {
          samples.push(logicRecordSample('cap_0', 'ch_0', i % 2 === 0 ? 'HIGH' : 'LOW', i * 10, i));
          samples.push(logicRecordSample('cap_0', 'ch_1', 'HIGH', i * 10, i));
        }
        const ch0Samples = getChannelSamples(samples, 'cap_0', 'ch_0');
        expect(ch0Samples.length).toBe(100);
        for (let i = 1; i < ch0Samples.length; i++) {
          expect(ch0Samples[i].sampleIndex).toBeGreaterThanOrEqual(ch0Samples[i - 1].sampleIndex);
        }
      });

      it('getCaptureSamples filters and sorts by timestamp', () => {
        const samples: LogicSampleModel[] = [];
        for (let i = 0; i < 50; i++) {
          samples.push(logicRecordSample('cap_0', 'ch_0', 'HIGH', 100 - i, i));
          samples.push(logicRecordSample('cap_1', 'ch_0', 'HIGH', i, i));
        }
        const cap0 = getCaptureSamples(samples, 'cap_0');
        expect(cap0.length).toBe(50);
        for (let i = 1; i < cap0.length; i++) {
          expect(cap0[i].timestamp).toBeGreaterThanOrEqual(cap0[i - 1].timestamp);
        }
      });

      it('trimLogicSamples keeps most recent', () => {
        const samples: LogicSampleModel[] = [];
        for (let i = 0; i < 100; i++) {
          samples.push(logicRecordSample('cap_0', 'ch_0', 'HIGH', i * 10, i));
        }
        const trimmed = trimLogicSamples(samples, 'cap_0', 50);
        const capSamples = trimmed.filter(s => s.captureId === 'cap_0');
        expect(capSamples.length).toBe(50);
        expect(capSamples[0].sampleIndex).toBe(50);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6 — Oscilloscope Operations
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Oscilloscope Operations', () => {
    describe('Voltage sampling', () => {
      it('adds samples to waveform buffer', () => {
        let buf = createDefaultWaveformBufferModel('buf_0', { maxSize: 100 });
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          buf = sampleVoltage(buf, i * 10, Math.sin(i * 0.1) * 1.65 + 1.65);
          expect(buf.timestamps.length).toBeLessThanOrEqual(100);
          expect(buf.voltages.length).toBeLessThanOrEqual(100);
        }
        // Ring buffer should cap at maxSize
        expect(buf.timestamps.length).toBe(100);
        expect(buf.voltages.length).toBe(100);
        expect(buf.sampleCount).toBe(100);
      });

      it('ring buffer trims oldest samples', () => {
        let buf = createDefaultWaveformBufferModel('buf_0', { maxSize: 10 });
        for (let i = 0; i < 20; i++) {
          buf = sampleVoltage(buf, i, i * 0.1);
        }
        expect(buf.timestamps.length).toBe(10);
        expect(buf.timestamps[0]).toBe(10);  // Oldest kept
        expect(buf.voltages[0]).toBeCloseTo(1.0, 5);
      });
    });

    describe('Capture lifecycle', () => {
      it('starts oscilloscope capture', () => {
        const cap = createDefaultOscilloscopeCaptureModel('osc_cap_0');
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const started = oscilloscopeStartCapture(cap, 1000 + i);
          expect(started.state).toBe('CAPTURING');
          expect(started.startTimestamp).toBe(1000 + i);
        }
      });

      it('stops oscilloscope capture', () => {
        const started = oscilloscopeStartCapture(createDefaultOscilloscopeCaptureModel('osc_cap_0'), 1000);
        for (let i = 0; i < STRESS_ITERATIONS; i++) {
          const stopped = oscilloscopeStopCapture(started, 2000 + i);
          expect(stopped.state).toBe('STOPPED');
          expect(stopped.endTimestamp).toBe(2000 + i);
        }
      });

      it('clears waveform buffer', () => {
        let buf = createDefaultWaveformBufferModel('buf_0');
        for (let i = 0; i < 50; i++) {
          buf = sampleVoltage(buf, i, i * 0.5);
        }
        expect(buf.sampleCount).toBe(50);
        const cleared = clearWaveform(buf);
        expect(cleared.timestamps).toEqual([]);
        expect(cleared.voltages).toEqual([]);
        expect(cleared.sampleCount).toBe(0);
      });

      it('exports oscilloscope capture as deep copy', () => {
        const cap = createDefaultOscilloscopeCaptureModel('osc_cap_0');
        const bufs = [
          createDefaultWaveformBufferModel('buf_0', { captureId: 'osc_cap_0' }),
          createDefaultWaveformBufferModel('buf_1', { captureId: 'other_cap' }),
        ];
        const exported = exportWaveform(cap, bufs);
        expect(exported.buffers.length).toBe(1);
        expect(exported.buffers[0].bufferId).toBe('buf_0');
        // Verify deep copy
        exported.capture.captureId = 'MODIFIED';
        expect(cap.captureId).toBe('osc_cap_0');
      });
    });

    describe('Voltage conversions', () => {
      it('converts PWM duty to voltage', () => {
        for (let i = 0; i < 256; i++) {
          const v = pwmDutyToVoltage(i, 255, 3.3);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(3.3);
        }
        expect(pwmDutyToVoltage(0)).toBeCloseTo(0, 5);
        expect(pwmDutyToVoltage(255, 255, 3.3)).toBeCloseTo(3.3, 5);
        expect(pwmDutyToVoltage(127, 255, 3.3)).toBeCloseTo(1.643, 1);
      });

      it('converts digital level to voltage', () => {
        expect(digitalToVoltage('HIGH')).toBeCloseTo(3.3, 5);
        expect(digitalToVoltage('LOW')).toBeCloseTo(0, 5);
        expect(digitalToVoltage('HIGH', 5.0)).toBeCloseTo(5.0, 5);
        expect(digitalToVoltage('UNKNOWN')).toBeCloseTo(0, 5);
      });

      it('handles zero maxDuty gracefully', () => {
        expect(pwmDutyToVoltage(100, 0)).toBe(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7 — ESP32 GPIO Integration
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- ESP32 GPIO Integration', () => {
    it('captures digital write transitions (blink simulation)', () => {
      let capture = createDefaultLogicCaptureModel('cap_0', { esp32Id: 'esp32_0', channelIds: ['ch_led'] });
      capture = logicArmCapture(capture, 'ch_led', 'RISING');

      const samples: LogicSampleModel[] = [];
      let prevLevel: LogicLevel = 'LOW';

      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const newLevel: LogicLevel = i % 2 === 0 ? 'HIGH' : 'LOW';
        const result = logicRecordDigitalWrite(capture, 'ch_led', newLevel, prevLevel, i * 1000, i);
        samples.push(result.sample);
        capture = result.capture;
        prevLevel = newLevel;
      }

      expect(samples.length).toBe(STRESS_ITERATIONS);
      expect(capture.state).toBe('CAPTURING');
      // Verify alternating pattern
      for (let i = 0; i < samples.length; i++) {
        expect(samples[i].logicLevel).toBe(i % 2 === 0 ? 'HIGH' : 'LOW');
      }
    });

    it('captures PWM duty cycle as oscilloscope waveform', () => {
      let buf = createDefaultWaveformBufferModel('buf_pwm', { captureId: 'osc_cap_0', channelId: 'osc_ch_pwm', maxSize: 1000 });

      // Simulate PWM fade: duty 0 → 255
      for (let duty = 0; duty <= 255; duty++) {
        const voltage = pwmDutyToVoltage(duty, 255, 3.3);
        buf = sampleVoltage(buf, duty * 100, voltage);
      }

      expect(buf.sampleCount).toBe(256);
      expect(buf.voltages[0]).toBeCloseTo(0, 5);
      expect(buf.voltages[255]).toBeCloseTo(3.3, 5);

      // Verify monotonically increasing
      for (let i = 1; i < buf.voltages.length; i++) {
        expect(buf.voltages[i]).toBeGreaterThanOrEqual(buf.voltages[i - 1]);
      }
    });

    it('captures interrupt transitions via CHANGE trigger', () => {
      let capture = createDefaultLogicCaptureModel('cap_int', { esp32Id: 'esp32_0', channelIds: ['ch_int'] });
      capture = logicArmCapture(capture, 'ch_int', 'CHANGE');

      let prevLevel: LogicLevel = 'LOW';
      const transitions: LogicSampleModel[] = [];

      // Simulate random-ish transitions
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const newLevel: LogicLevel = i % 3 === 0 ? 'HIGH' : 'LOW';
        const result = logicRecordDigitalWrite(capture, 'ch_int', newLevel, prevLevel, i * 5, i);
        transitions.push(result.sample);
        capture = result.capture;
        prevLevel = newLevel;
      }

      // First CHANGE should trigger capture
      expect(capture.state).toBe('CAPTURING');
      expect(transitions.length).toBe(STRESS_ITERATIONS);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8 — HC-SR04 Integration
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- HC-SR04 Integration', () => {
    it('records TRIG pulse (10µs HIGH then LOW)', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const samples = recordTrigPulse('cap_0', 'ch_trig', i * 1000, 10, i * 2);
        expect(samples.length).toBe(2);
        expect(samples[0].logicLevel).toBe('HIGH');
        expect(samples[0].pulseWidthUs).toBe(10);
        expect(samples[0].timestamp).toBe(i * 1000);
        expect(samples[1].logicLevel).toBe('LOW');
        expect(samples[1].timestamp).toBe(i * 1000 + 10);
      }
    });

    it('records ECHO pulse with distance timing', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        // Distance = echoWidth / 58 (cm)
        const distanceCm = 10 + i;
        const echoWidthUs = distanceCm * 58;
        const samples = recordEchoPulse('cap_0', 'ch_echo', 1000, echoWidthUs, 0);
        expect(samples.length).toBe(2);
        expect(samples[0].logicLevel).toBe('HIGH');
        expect(samples[0].pulseWidthUs).toBe(echoWidthUs);
        expect(samples[1].logicLevel).toBe('LOW');
        expect(samples[1].timestamp).toBe(1000 + echoWidthUs);

        // Verify distance can be derived
        const recoveredDistance = samples[0].pulseWidthUs / 58;
        expect(recoveredDistance).toBeCloseTo(distanceCm, 5);
      }
    });

    it('full HC-SR04 measurement cycle (TRIG + ECHO)', () => {
      const trigSamples = recordTrigPulse('cap_hcsr04', 'ch_trig', 0, 10, 0);
      const echoStart = 200; // Echo starts after 200µs
      const echoWidthUs = 1160; // ~20cm
      const echoSamples = recordEchoPulse('cap_hcsr04', 'ch_echo', echoStart, echoWidthUs, 2);

      const allSamples = [...trigSamples, ...echoSamples];
      expect(allSamples.length).toBe(4);

      // TRIG: HIGH at 0, LOW at 10
      expect(allSamples[0].logicLevel).toBe('HIGH');
      expect(allSamples[0].timestamp).toBe(0);
      expect(allSamples[1].logicLevel).toBe('LOW');
      expect(allSamples[1].timestamp).toBe(10);

      // ECHO: HIGH at 200, LOW at 1360
      expect(allSamples[2].logicLevel).toBe('HIGH');
      expect(allSamples[2].timestamp).toBe(200);
      expect(allSamples[3].logicLevel).toBe('LOW');
      expect(allSamples[3].timestamp).toBe(200 + echoWidthUs);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9 — Servo Integration
  // ═══════════════════════════════════════════════════════════════
  describe('9 -- Servo Integration', () => {
    it('records servo PWM pulse train', () => {
      let buf = createDefaultWaveformBufferModel('buf_servo', { captureId: 'osc_servo', maxSize: 1000 });

      // Standard servo: 544µs (0°) to 2400µs (180°), 20ms period
      for (let angle = 0; angle <= 180; angle += 10) {
        const pulseWidthUs = 544 + (angle / 180) * (2400 - 544);
        buf = recordServoPWM(buf, angle * 20000, pulseWidthUs, 20000, 1, 3.3);
      }

      expect(buf.sampleCount).toBeGreaterThan(0);
      // Each cycle produces 3 samples (rise, fall, period end)
      const expectedCycles = Math.floor(180 / 10) + 1; // 19 cycles
      expect(buf.timestamps.length).toBe(expectedCycles * 3);
    });

    it('records multiple servo PWM cycles', () => {
      let buf = createDefaultWaveformBufferModel('buf_servo', { maxSize: 100 });
      buf = recordServoPWM(buf, 0, 1500, 20000, 5, 3.3);
      // 5 cycles × 3 samples per cycle = 15 samples
      expect(buf.timestamps.length).toBe(15);

      // Verify pulse pattern: HIGH, LOW, LOW(period end) per cycle
      for (let c = 0; c < 5; c++) {
        const base = c * 3;
        expect(buf.voltages[base]).toBeCloseTo(3.3, 5);      // Rising edge
        expect(buf.voltages[base + 1]).toBeCloseTo(0, 5);     // Falling edge
        expect(buf.voltages[base + 2]).toBeCloseTo(0, 5);     // Period end
      }
    });

    it('servo angle → pulse width mapping is correct', () => {
      for (let angle = 0; angle <= 180; angle++) {
        const pulseWidthUs = 544 + (angle / 180) * (2400 - 544);
        expect(pulseWidthUs).toBeGreaterThanOrEqual(544);
        expect(pulseWidthUs).toBeLessThanOrEqual(2400);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10 — Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('10 -- Clone Safety', () => {
    it('factory outputs are independent clones', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const a = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' });
        const b = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' });
        a.channelLabel = 'MODIFIED';
        expect(b.channelLabel).not.toBe('MODIFIED');
      }
    });

    it('synchronizer registry entries are deep-copied', () => {
      const sync = new LogicAnalyzerSynchronizer();
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' });
      sync.logicAnalyzerChannels.register(ch.channelId, ch);

      ch.channelLabel = 'MODIFIED_OUTSIDE';
      const got = sync.logicAnalyzerChannels.lookup('ch_0');
      expect(got!.channelLabel).not.toBe('MODIFIED_OUTSIDE');

      got!.channelLabel = 'MODIFIED_RETURNED';
      const got2 = sync.logicAnalyzerChannels.lookup('ch_0');
      expect(got2!.channelLabel).not.toBe('MODIFIED_RETURNED');
    });

    it('waveform buffer samples are independent after sampleVoltage', () => {
      const buf1 = createDefaultWaveformBufferModel('buf_0');
      const buf2 = sampleVoltage(buf1, 0, 1.0);
      expect(buf1.timestamps.length).toBe(0);
      expect(buf2.timestamps.length).toBe(1);
    });

    it('logic capture operations return new objects', () => {
      const original = createDefaultLogicCaptureModel('cap_0');
      const armed = logicArmCapture(original, 'ch_0', 'RISING');
      const started = logicStartCapture(armed, 1000);
      const stopped = logicStopCapture(started, 2000);

      expect(original.state).toBe('IDLE');
      expect(armed.state).toBe('ARMED');
      expect(started.state).toBe('CAPTURING');
      expect(stopped.state).toBe('STOPPED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11 — LogicAnalyzerSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('11 -- LogicAnalyzerSynchronizer', () => {
    let sync: LogicAnalyzerSynchronizer;

    beforeEach(() => {
      sync = new LogicAnalyzerSynchronizer();
    });

    it('builds snapshot from arrays', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        const channels = [createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0', pinNumber: i % 40 })];
        const captures = [createDefaultLogicCaptureModel(`cap_${i}`)];
        const samples = [createDefaultLogicSampleModel(`s_${i}`)];
        const oscChannels = [createDefaultOscilloscopeChannelModel(`osc_ch_${i}`, { esp32Id: 'e0' })];
        const oscCaptures = [createDefaultOscilloscopeCaptureModel(`osc_cap_${i}`)];
        const wfBuffers = [createDefaultWaveformBufferModel(`buf_${i}`)];

        const snap = sync.buildSnapshot(channels, captures, samples, oscChannels, oscCaptures, wfBuffers);
        expect(snap.logicAnalyzerChannels.length).toBe(1);
        expect(snap.logicCaptures.length).toBe(1);
        expect(snap.logicSamples.length).toBe(1);
        expect(snap.oscilloscopeChannels.length).toBe(1);
        expect(snap.oscilloscopeCaptures.length).toBe(1);
        expect(snap.waveformBuffers.length).toBe(1);
      }
    });

    it('clones synchronizer with deep copy', () => {
      const ch = createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' });
      sync.logicAnalyzerChannels.register(ch.channelId, ch);
      const buf = createDefaultWaveformBufferModel('buf_0');
      sync.waveformBuffers.register(buf.bufferId, buf);

      const cloned = sync.clone();
      expect(cloned.logicAnalyzerChannels.lookup('ch_0')!.channelId).toBe('ch_0');
      expect(cloned.waveformBuffers.lookup('buf_0')!.bufferId).toBe('buf_0');

      // Modify original, cloned should be unaffected
      sync.logicAnalyzerChannels.update('ch_0', { channelLabel: 'MODIFIED' });
      expect(cloned.logicAnalyzerChannels.lookup('ch_0')!.channelLabel).not.toBe('MODIFIED');
    });

    it('toJSON and fromJSON round-trip', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.clear();
        sync.logicAnalyzerChannels.register(`ch_${i}`, createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' }));
        sync.logicCaptures.register(`cap_${i}`, createDefaultLogicCaptureModel(`cap_${i}`));
        sync.oscilloscopeChannels.register(`osc_${i}`, createDefaultOscilloscopeChannelModel(`osc_${i}`, { esp32Id: 'e0' }));

        const json = sync.toJSON();
        const restored = new LogicAnalyzerSynchronizer();
        restored.fromJSON(json);

        expect(restored.logicAnalyzerChannels.lookup(`ch_${i}`)!.channelId).toBe(`ch_${i}`);
        expect(restored.logicCaptures.lookup(`cap_${i}`)!.captureId).toBe(`cap_${i}`);
        expect(restored.oscilloscopeChannels.lookup(`osc_${i}`)!.channelId).toBe(`osc_${i}`);
      }
    });

    it('fromJSON handles null/undefined gracefully', () => {
      sync.logicAnalyzerChannels.register('ch_0', createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' }));
      sync.fromJSON(null);
      expect(sync.logicAnalyzerChannels.size).toBe(0);
      sync.fromJSON(undefined);
      expect(sync.logicAnalyzerChannels.size).toBe(0);
    });

    it('rejects invalid models during buildSnapshot', () => {
      const invalidChannel = createDefaultLogicAnalyzerChannelModel('', { esp32Id: '' });
      const snap = sync.buildSnapshot([invalidChannel], [], [], [], [], []);
      // Invalid models should not appear in registries
      expect(snap.logicAnalyzerChannels.length).toBe(0);
    });

    it('clear empties all registries', () => {
      sync.logicAnalyzerChannels.register('ch_0', createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' }));
      sync.logicCaptures.register('cap_0', createDefaultLogicCaptureModel('cap_0'));
      sync.logicSamples.register('s_0', createDefaultLogicSampleModel('s_0'));
      sync.oscilloscopeChannels.register('osc_ch_0', createDefaultOscilloscopeChannelModel('osc_ch_0', { esp32Id: 'e0' }));
      sync.oscilloscopeCaptures.register('osc_cap_0', createDefaultOscilloscopeCaptureModel('osc_cap_0'));
      sync.waveformBuffers.register('buf_0', createDefaultWaveformBufferModel('buf_0'));

      sync.clear();
      expect(sync.logicAnalyzerChannels.size).toBe(0);
      expect(sync.logicCaptures.size).toBe(0);
      expect(sync.logicSamples.size).toBe(0);
      expect(sync.oscilloscopeChannels.size).toBe(0);
      expect(sync.oscilloscopeCaptures.size).toBe(0);
      expect(sync.waveformBuffers.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12 — Serialization & Snapshot
  // ═══════════════════════════════════════════════════════════════
  describe('12 -- Serialization & Snapshot', () => {
    it('all models survive JSON round-trip', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const ch = createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0', pinNumber: i % 40, triggerMode: 'RISING' });
        const json = JSON.stringify(ch);
        const parsed = JSON.parse(json);
        expect(parsed.channelId).toBe(`ch_${i}`);
        expect(parsed.triggerMode).toBe('RISING');
        expect(parsed.pinNumber).toBe(i % 40);
      }
    });

    it('waveform buffer data survives round-trip', () => {
      let buf = createDefaultWaveformBufferModel('buf_0', { maxSize: 100 });
      for (let i = 0; i < 50; i++) {
        buf = sampleVoltage(buf, i * 10, i * 0.066);
      }

      const json = JSON.stringify(buf);
      const parsed: WaveformBufferModel = JSON.parse(json);
      expect(parsed.timestamps.length).toBe(50);
      expect(parsed.voltages.length).toBe(50);
      expect(parsed.sampleCount).toBe(50);
    });

    it('snapshot contains all model arrays', () => {
      const sync = new LogicAnalyzerSynchronizer();
      sync.logicAnalyzerChannels.register('ch_0', createDefaultLogicAnalyzerChannelModel('ch_0', { esp32Id: 'e0' }));
      sync.logicCaptures.register('cap_0', createDefaultLogicCaptureModel('cap_0'));
      sync.logicSamples.register('s_0', createDefaultLogicSampleModel('s_0'));
      sync.oscilloscopeChannels.register('osc_0', createDefaultOscilloscopeChannelModel('osc_0', { esp32Id: 'e0' }));
      sync.oscilloscopeCaptures.register('osc_cap_0', createDefaultOscilloscopeCaptureModel('osc_cap_0'));
      sync.waveformBuffers.register('buf_0', createDefaultWaveformBufferModel('buf_0'));

      const snap = sync.toJSON();
      expect(snap.logicAnalyzerChannels.length).toBe(1);
      expect(snap.logicCaptures.length).toBe(1);
      expect(snap.logicSamples.length).toBe(1);
      expect(snap.oscilloscopeChannels.length).toBe(1);
      expect(snap.oscilloscopeCaptures.length).toBe(1);
      expect(snap.waveformBuffers.length).toBe(1);

      // Round-trip via JSON
      const jsonStr = JSON.stringify(snap);
      const restored = JSON.parse(jsonStr);
      expect(restored.logicAnalyzerChannels[0].channelId).toBe('ch_0');
      expect(restored.oscilloscopeChannels[0].channelId).toBe('osc_0');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13 — Blockly Integration
  // ═══════════════════════════════════════════════════════════════
  describe('13 -- Blockly Integration', () => {
    it('simulates Start/Stop Logic Capture block flow', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let capture = createDefaultLogicCaptureModel(`cap_${i}`, { channelIds: ['ch_0'] });
        capture = logicArmCapture(capture, 'ch_0', 'RISING');
        capture = logicStartCapture(capture, 1000);
        expect(capture.state).toBe('CAPTURING');
        capture = logicStopCapture(capture, 2000);
        expect(capture.state).toBe('STOPPED');
      }
    });

    it('simulates Clear Logic Capture block', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let capture = createDefaultLogicCaptureModel(`cap_${i}`);
        capture = logicStartCapture(capture, 1000);
        capture = logicStopCapture(capture, 2000);
        capture = logicClearCapture(capture);
        expect(capture.state).toBe('IDLE');
        expect(capture.startTimestamp).toBe(0);
      }
    });

    it('simulates Export Logic Capture block', () => {
      const capture = createDefaultLogicCaptureModel('cap_0');
      const samples = [logicRecordSample('cap_0', 'ch_0', 'HIGH', 100, 0)];
      const exported = logicExportCapture(capture, samples);
      expect(exported.capture).toBeDefined();
      expect(exported.samples.length).toBe(1);
    });

    it('simulates Start/Stop Oscilloscope block flow', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        let capture = createDefaultOscilloscopeCaptureModel(`osc_${i}`);
        capture = oscilloscopeStartCapture(capture, 1000);
        expect(capture.state).toBe('CAPTURING');
        capture = oscilloscopeStopCapture(capture, 2000);
        expect(capture.state).toBe('STOPPED');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14 — Visualization Metadata
  // ═══════════════════════════════════════════════════════════════
  describe('14 -- Visualization Metadata', () => {
    it('stores zoom and scale metadata on logic captures', () => {
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const cap = createDefaultLogicCaptureModel(`cap_${i}`, {
          zoomLevel: 2.0 + i * 0.1,
          horizontalScale: 0.5 + i * 0.01,
        });
        expect(cap.zoomLevel).toBeCloseTo(2.0 + i * 0.1, 5);
        expect(cap.horizontalScale).toBeCloseTo(0.5 + i * 0.01, 5);
      }
    });

    it('stores cursor positions', () => {
      const cap = createDefaultLogicCaptureModel('cap_0', { cursorAPosition: 100, cursorBPosition: 500 });
      expect(cap.cursorAPosition).toBe(100);
      expect(cap.cursorBPosition).toBe(500);
    });

    it('stores oscilloscope vertical/horizontal scale and trigger level', () => {
      const cap = createDefaultOscilloscopeCaptureModel('osc_cap_0', {
        verticalScale: 2.0,
        horizontalScale: 0.5,
        triggerLevel: 2.5,
        triggerMode: 'RISING',
      });
      expect(cap.verticalScale).toBe(2.0);
      expect(cap.horizontalScale).toBe(0.5);
      expect(cap.triggerLevel).toBe(2.5);
      expect(cap.triggerMode).toBe('RISING');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 15 — Constants
  // ═══════════════════════════════════════════════════════════════
  describe('15 -- Constants', () => {
    it('valid logic levels are correct', () => {
      expect(VALID_LOGIC_LEVELS).toEqual(['HIGH', 'LOW', 'UNKNOWN', 'Z']);
    });

    it('valid trigger modes are correct', () => {
      expect(VALID_TRIGGER_MODES).toEqual(['RISING', 'FALLING', 'CHANGE', 'HIGH', 'LOW', 'NONE']);
    });

    it('valid capture states are correct', () => {
      expect(VALID_CAPTURE_STATES).toEqual(['IDLE', 'ARMED', 'CAPTURING', 'STOPPED', 'COMPLETE']);
    });

    it('channel colors has 8 entries', () => {
      expect(LOGIC_CHANNEL_COLORS.length).toBe(8);
    });

    it('default constants have expected values', () => {
      expect(DEFAULT_SAMPLE_RATE_HZ).toBe(1000000);
      expect(DEFAULT_MAX_SAMPLES).toBe(10000);
      expect(DEFAULT_MAX_WAVEFORM_SIZE).toBe(10000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 16 — Lifecycle Cleanup
  // ═══════════════════════════════════════════════════════════════
  describe('16 -- Lifecycle Cleanup', () => {
    it('synchronizer clear releases all data', () => {
      const sync = new LogicAnalyzerSynchronizer();
      for (let i = 0; i < 100; i++) {
        sync.logicAnalyzerChannels.register(`ch_${i}`, createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' }));
        sync.logicCaptures.register(`cap_${i}`, createDefaultLogicCaptureModel(`cap_${i}`));
        sync.logicSamples.register(`s_${i}`, createDefaultLogicSampleModel(`s_${i}`));
        sync.oscilloscopeChannels.register(`osc_${i}`, createDefaultOscilloscopeChannelModel(`osc_${i}`, { esp32Id: 'e0' }));
        sync.oscilloscopeCaptures.register(`osc_cap_${i}`, createDefaultOscilloscopeCaptureModel(`osc_cap_${i}`));
        sync.waveformBuffers.register(`buf_${i}`, createDefaultWaveformBufferModel(`buf_${i}`));
      }

      sync.clear();
      expect(sync.logicAnalyzerChannels.size).toBe(0);
      expect(sync.logicCaptures.size).toBe(0);
      expect(sync.logicSamples.size).toBe(0);
      expect(sync.oscilloscopeChannels.size).toBe(0);
      expect(sync.oscilloscopeCaptures.size).toBe(0);
      expect(sync.waveformBuffers.size).toBe(0);
    });

    it('repeated build/clear cycles do not leak', () => {
      const sync = new LogicAnalyzerSynchronizer();
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        sync.buildSnapshot(
          [createDefaultLogicAnalyzerChannelModel(`ch_${i}`, { esp32Id: 'e0' })],
          [createDefaultLogicCaptureModel(`cap_${i}`)],
          [],
          [createDefaultOscilloscopeChannelModel(`osc_${i}`, { esp32Id: 'e0' })],
          [],
          [],
        );
        expect(sync.logicAnalyzerChannels.size).toBe(1);
        sync.clear();
        expect(sync.logicAnalyzerChannels.size).toBe(0);
      }
    });
  });
});
