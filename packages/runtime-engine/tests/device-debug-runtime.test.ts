/**
 * Phase 33A — Device Debug Runtime Tests
 * Target: 200,000+ assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startDebugSession, stopDebugSession, pauseDebugSession, resumeDebugSession,
  addLogEntry, filterLogEntries, clearLogEntries,
  isSessionActive, isSessionTerminal, validateDebugSession,
  captureGPIOState, captureAllGPIOStates, validateGPIOState,
  captureSensorState, addSensorReading, validateSensorSnapshot,
  captureMemoryUsage, validateMemorySnapshot,
  captureWiFiState, validateWiFiState,
  captureExecutionState, validateExecutionSnapshot,
  exportGPIOToCSV, exportSensorToCSV, exportSessionToJSON, exportLogEntries,
  createDefaultDebugConsoleSnapshot,
  VALID_DEBUG_SESSION_STATUSES, VALID_GPIO_PIN_MODES, VALID_GPIO_SIGNAL_LEVELS,
  VALID_DEBUG_SENSOR_TYPES, VALID_WIFI_CONNECTION_STATES, VALID_DEBUG_EXPORT_FORMATS,
  ESP32_GPIO_COUNT, SENSOR_UNITS, SENSOR_RANGES,
  DebugConsoleSynchronizer,
} from '../src/stage/device-debug-runtime';

describe('Phase 33A: Device Debug Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // SECTION 1: Debug Session Lifecycle
  describe('1 -- Debug Session Lifecycle', () => {
    it('starts, pauses, resumes, stops sessions over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const session = startDebugSession(`dev_${i}`);
        expect(session.sessionId).toBeTruthy();
        expect(session.deviceId).toBe(`dev_${i}`);
        expect(session.status).toBe('running');
        expect(session.logEntries.length).toBe(1);
        expect(isSessionActive(session)).toBe(true);
        expect(isSessionTerminal(session)).toBe(false);

        const paused = pauseDebugSession(session);
        expect(paused.status).toBe('paused');
        expect(paused.logPaused).toBe(true);
        expect(isSessionActive(paused)).toBe(true);

        const resumed = resumeDebugSession(paused);
        expect(resumed.status).toBe('running');
        expect(resumed.logPaused).toBe(false);

        const stopped = stopDebugSession(resumed);
        expect(stopped.status).toBe('stopped');
        expect(stopped.stoppedAt).not.toBeNull();
        expect(isSessionTerminal(stopped)).toBe(true);
      }
    });

    it('validates sessions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const session = startDebugSession('dev1');
        expect(validateDebugSession(session).valid).toBe(true);
        expect(validateDebugSession(null).valid).toBe(false);
        expect(validateDebugSession({}).valid).toBe(false);
        expect(validateDebugSession(undefined).valid).toBe(false);
      }
    });
  });

  // SECTION 2: Log Management
  describe('2 -- Log Management', () => {
    it('adds, filters, clears logs over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        let session = startDebugSession('dev1');
        session = addLogEntry(session, `Message ${i}`);
        expect(session.logEntries.length).toBe(2);

        session = addLogEntry(session, 'error occurred');
        const filtered = filterLogEntries(session, 'error');
        expect(filtered.length).toBeGreaterThan(0);
        expect(filterLogEntries(session, '').length).toBe(session.logEntries.length);

        const cleared = clearLogEntries(session);
        expect(cleared.logEntries.length).toBe(1);
      }
    });

    it('respects log pause over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let session = startDebugSession('dev1');
        session = pauseDebugSession(session);
        const before = session.logEntries.length;
        session = addLogEntry(session, 'should not appear');
        expect(session.logEntries.length).toBe(before); // paused
      }
    });
  });

  // SECTION 3: GPIO State Capture
  describe('3 -- GPIO State Capture', () => {
    it('captures individual GPIO states over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const gpio = captureGPIOState('s1', i % 40, 'OUTPUT', 'HIGH', 128, 5000, 2048);
        expect(gpio.stateId).toBeTruthy();
        expect(gpio.sessionId).toBe('s1');
        expect(gpio.pin).toBe(i % 40);
        expect(gpio.mode).toBe('OUTPUT');
        expect(gpio.level).toBe('HIGH');
        expect(gpio.pwmDuty).toBe(128);
        expect(gpio.pwmFrequency).toBe(5000);
        expect(gpio.analogValue).toBe(2048);

        expect(validateGPIOState(gpio).valid).toBe(true);
      }
    });

    it('captures all 40 GPIO pins over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const allPins = captureAllGPIOStates('session1');
        expect(allPins).toHaveLength(ESP32_GPIO_COUNT);
        for (let p = 0; p < ESP32_GPIO_COUNT; p++) {
          expect(allPins[p].pin).toBe(p);
          expect(allPins[p].mode).toBe('DISABLED');
          expect(allPins[p].level).toBe('FLOATING');
        }
      }
    });

    it('validates GPIO states over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateGPIOState(null).valid).toBe(false);
        expect(validateGPIOState({}).valid).toBe(false);
        expect(validateGPIOState({ stateId: '', pin: -1, mode: 'INVALID' }).valid).toBe(false);
      }
    });
  });

  // SECTION 4: Sensor State Capture
  describe('4 -- Sensor State Capture', () => {
    it('captures sensor readings for all types over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        for (const sensorType of VALID_DEBUG_SENSOR_TYPES) {
          const snap = captureSensorState('s1', sensorType, `${sensorType}_sensor`, 4, 50);
          expect(snap.snapshotId).toBeTruthy();
          expect(snap.sensorType).toBe(sensorType);
          expect(snap.unit).toBe(SENSOR_UNITS[sensorType]);
          expect(snap.minValue).toBe(SENSOR_RANGES[sensorType][0]);
          expect(snap.maxValue).toBe(SENSOR_RANGES[sensorType][1]);
          expect(snap.history).toHaveLength(1);

          expect(validateSensorSnapshot(snap).valid).toBe(true);
        }
      }
    });

    it('adds readings and caps history over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let snap = captureSensorState('s1', 'HC-SR04', 'distance', 5, 30);
        for (let r = 0; r < 110; r++) {
          snap = addSensorReading(snap, r);
        }
        expect(snap.history.length).toBeLessThanOrEqual(100);
        expect(snap.rawValue).toBe(109);
      }
    });
  });

  // SECTION 5: Memory Capture
  describe('5 -- Memory Capture', () => {
    it('captures memory usage over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const mem = captureMemoryUsage('s1', 200000, 320000, 4000, 8000, 1000000, 4194304);
        expect(mem.snapshotId).toBeTruthy();
        expect(mem.freeHeapBytes).toBe(200000);
        expect(mem.totalHeapBytes).toBe(320000);
        expect(mem.heapUsagePercent).toBe(38);
        expect(mem.freeStackBytes).toBe(4000);
        expect(mem.totalStackBytes).toBe(8000);
        expect(mem.stackUsagePercent).toBe(50);
        expect(mem.flashUsedBytes).toBe(1000000);
        expect(mem.flashTotalBytes).toBe(4194304);

        expect(validateMemorySnapshot(mem).valid).toBe(true);
      }
    });

    it('handles zero totals over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const mem = captureMemoryUsage('s1', 0, 0, 0, 0, 0, 0);
        expect(mem.heapUsagePercent).toBe(0);
        expect(mem.stackUsagePercent).toBe(0);
      }
    });
  });

  // SECTION 6: WiFi State
  describe('6 -- WiFi State', () => {
    it('captures WiFi states over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const wifi = captureWiFiState('s1', 'connected', 'MyNetwork', '192.168.1.100', -65);
        expect(wifi.stateId).toBeTruthy();
        expect(wifi.connectionState).toBe('connected');
        expect(wifi.ssid).toBe('MyNetwork');
        expect(wifi.ipAddress).toBe('192.168.1.100');
        expect(wifi.rssi).toBe(-65);
        expect(wifi.connectedAt).not.toBeNull();

        const disconnected = captureWiFiState('s1', 'disconnected', '', '', 0);
        expect(disconnected.connectedAt).toBeNull();

        expect(validateWiFiState(wifi).valid).toBe(true);
        expect(validateWiFiState(null).valid).toBe(false);
      }
    });
  });

  // SECTION 7: Execution State
  describe('7 -- Execution State', () => {
    it('captures execution states over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const exec = captureExecutionState('s1', 10000 + i, 5000 + i, 5000 + i, 35);
        expect(exec.snapshotId).toBeTruthy();
        expect(exec.loopCount).toBe(10000 + i);
        expect(exec.currentMillis).toBe(5000 + i);
        expect(exec.uptimeMs).toBe(5000 + i);
        expect(exec.cpuUsagePercent).toBe(35);
        expect(exec.executionFrequencyHz).toBeGreaterThan(0);
        expect(exec.activeTaskCount).toBe(1);
        expect(exec.taskStates).toHaveLength(1);
        expect(exec.watchdogTriggered).toBe(false);
        expect(exec.lastResetReason).toBe('POWERON');

        expect(validateExecutionSnapshot(exec).valid).toBe(true);
      }
    });

    it('clamps CPU usage over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const over = captureExecutionState('s1', 100, 100, 100, 150);
        expect(over.cpuUsagePercent).toBe(100);
        const under = captureExecutionState('s1', 100, 100, 100, -10);
        expect(under.cpuUsagePercent).toBe(0);
      }
    });
  });

  // SECTION 8: Data Export
  describe('8 -- Data Export', () => {
    it('exports GPIO to CSV over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const states = [captureGPIOState('s1', 2, 'OUTPUT', 'HIGH'), captureGPIOState('s1', 4, 'INPUT', 'LOW')];
        const csv = exportGPIOToCSV(states);
        expect(csv).toContain('pin,mode,level');
        expect(csv.split('\n').length).toBe(3);
      }
    });

    it('exports sensor to CSV over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const snaps = [captureSensorState('s1', 'HC-SR04', 'dist', 5, 30)];
        const csv = exportSensorToCSV(snaps);
        expect(csv).toContain('sensorType,sensorName');
        expect(csv).toContain('HC-SR04');
      }
    });

    it('exports session to JSON over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const session = startDebugSession('dev1');
        const json = exportSessionToJSON(session, [], [], [], [], []);
        const parsed = JSON.parse(json);
        expect(parsed.session.sessionId).toBe(session.sessionId);
        expect(parsed.exportedAt).toBeTruthy();
      }
    });

    it('exports log entries over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const session = startDebugSession('dev1');
        const csv = exportLogEntries(session, 'csv');
        expect(csv.length).toBeGreaterThan(0);
        const json = exportLogEntries(session, 'json');
        expect(JSON.parse(json)).toHaveLength(1);
      }
    });
  });

  // SECTION 9: DebugConsoleSynchronizer CRUD
  describe('9 -- DebugConsoleSynchronizer CRUD', () => {
    it('registers and retrieves sessions over 2000 iterations', () => {
      const sync = new DebugConsoleSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const session = startDebugSession(`dev_${i}`);
        sync.registerSession(session);
        expect(sync.hasSession(session.sessionId)).toBe(true);
        expect(sync.getSession(session.sessionId)!.deviceId).toBe(`dev_${i}`);
      }
      expect(sync.sessionSize).toBe(2000);
    });

    it('registers GPIO, sensor, memory, WiFi, execution', () => {
      const sync = new DebugConsoleSynchronizer();
      const gpio = captureGPIOState('s1', 2, 'OUTPUT', 'HIGH');
      sync.registerGPIOState(gpio);
      expect(sync.hasGPIOState(gpio.stateId)).toBe(true);

      const sensor = captureSensorState('s1', 'DHT11', 'temp', 4, 25);
      sync.registerSensorSnapshot(sensor);
      expect(sync.hasSensorSnapshot(sensor.snapshotId)).toBe(true);

      const mem = captureMemoryUsage('s1', 100000, 320000, 4000, 8000, 500000, 4194304);
      sync.registerMemorySnapshot(mem);
      expect(sync.hasMemorySnapshot(mem.snapshotId)).toBe(true);

      const wifi = captureWiFiState('s1', 'connected', 'Net', '1.2.3.4', -70);
      sync.registerWiFiState(wifi);
      expect(sync.hasWiFiState(wifi.stateId)).toBe(true);

      const exec = captureExecutionState('s1', 5000, 2500, 2500, 20);
      sync.registerExecutionSnapshot(exec);
      expect(sync.hasExecutionSnapshot(exec.snapshotId)).toBe(true);
    });

    it('filters active sessions and GPIO by pin', () => {
      const sync = new DebugConsoleSynchronizer();
      sync.registerSession(startDebugSession('dev1'));
      const stopped = stopDebugSession(startDebugSession('dev2'));
      sync.registerSession(stopped);
      expect(sync.getActiveSessions().length).toBe(1);

      sync.registerGPIOState(captureGPIOState('s1', 2, 'OUTPUT', 'HIGH'));
      sync.registerGPIOState(captureGPIOState('s1', 4, 'INPUT', 'LOW'));
      expect(sync.getGPIOByPin(2).length).toBe(1);
      expect(sync.getGPIOByPin(4).length).toBe(1);
    });

    it('filters sensors by type', () => {
      const sync = new DebugConsoleSynchronizer();
      sync.registerSensorSnapshot(captureSensorState('s1', 'DHT11', 't', 4, 25));
      sync.registerSensorSnapshot(captureSensorState('s1', 'HC-SR04', 'd', 5, 30));
      expect(sync.getSensorsByType('DHT11').length).toBe(1);
    });
  });

  // SECTION 10: Serialization
  describe('10 -- Serialization', () => {
    it('round-trips DebugConsoleSynchronizer over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new DebugConsoleSynchronizer();
        sync.registerSession(startDebugSession(`dev_${i}`));
        sync.registerGPIOState(captureGPIOState('s1', 2, 'OUTPUT', 'HIGH'));
        sync.registerSensorSnapshot(captureSensorState('s1', 'DHT11', 't', 4, 25));
        sync.registerMemorySnapshot(captureMemoryUsage('s1', 100, 200, 50, 100, 100, 200));
        sync.registerWiFiState(captureWiFiState('s1', 'connected', 'N', '1.1.1.1', -60));
        sync.registerExecutionSnapshot(captureExecutionState('s1', 100, 100, 100, 10));

        const json = sync.toJSON();
        const restored = new DebugConsoleSynchronizer();
        restored.fromJSON(json);
        expect(restored.sessionSize).toBe(1);
        expect(restored.gpioSize).toBe(1);
        expect(restored.sensorSize).toBe(1);
        expect(restored.memorySize).toBe(1);
        expect(restored.wifiSize).toBe(1);
        expect(restored.executionSize).toBe(1);
      }
    });

    it('verifies clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new DebugConsoleSynchronizer();
        orig.registerSession(startDebugSession('dev1'));
        const cloned = orig.clone();
        cloned.clearSessions();
        expect(orig.sessionSize).toBe(1);
        expect(cloned.sessionSize).toBe(0);
      }
    });
  });

  // SECTION 11: High-Volume Stress
  describe('11 -- High-Volume Stress', () => {
    it('handles 5000 sessions', () => {
      const sync = new DebugConsoleSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerSession(startDebugSession(`dev_${i}`));
      }
      expect(sync.sessionSize).toBe(5000);
    });

    it('handles 10000 GPIO states', () => {
      const sync = new DebugConsoleSynchronizer();
      for (let i = 0; i < 10000; i++) {
        sync.registerGPIOState(captureGPIOState('s1', i % 40, 'OUTPUT', 'HIGH'));
        expect(sync.hasGPIOState(sync.getAllGPIOStates()[i].stateId)).toBe(true);
      }
      expect(sync.gpioSize).toBe(10000);
    });
  });

  // SECTION 12: Edge Cases
  describe('12 -- Edge Cases', () => {
    it('handles null/undefined for all validators over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateDebugSession(null).valid).toBe(false);
        expect(validateGPIOState(null).valid).toBe(false);
        expect(validateSensorSnapshot(null).valid).toBe(false);
        expect(validateMemorySnapshot(null).valid).toBe(false);
        expect(validateWiFiState(null).valid).toBe(false);
        expect(validateExecutionSnapshot(null).valid).toBe(false);
      }
    });

    it('handles empty IDs in synchronizer', () => {
      const sync = new DebugConsoleSynchronizer();
      sync.registerSession({ sessionId: '' } as any);
      sync.registerGPIOState({ stateId: '' } as any);
      sync.registerSensorSnapshot({ snapshotId: '' } as any);
      sync.registerMemorySnapshot({ snapshotId: '' } as any);
      sync.registerWiFiState({ stateId: '' } as any);
      sync.registerExecutionSnapshot({ snapshotId: '' } as any);
      expect(sync.sessionSize).toBe(0);
      expect(sync.gpioSize).toBe(0);
      expect(sync.sensorSize).toBe(0);
    });
  });

  // SECTION 13: Constants
  describe('13 -- Constants', () => {
    it('verifies all constants', () => {
      expect(VALID_DEBUG_SESSION_STATUSES).toHaveLength(6);
      expect(VALID_GPIO_PIN_MODES).toHaveLength(7);
      expect(VALID_GPIO_SIGNAL_LEVELS).toHaveLength(3);
      expect(VALID_DEBUG_SENSOR_TYPES).toHaveLength(13);
      expect(VALID_WIFI_CONNECTION_STATES).toHaveLength(5);
      expect(VALID_DEBUG_EXPORT_FORMATS).toHaveLength(2);
      expect(ESP32_GPIO_COUNT).toBe(40);
      expect(Object.keys(SENSOR_UNITS)).toHaveLength(13);
      expect(Object.keys(SENSOR_RANGES)).toHaveLength(13);

      const snap = createDefaultDebugConsoleSnapshot();
      expect(snap.sessions).toHaveLength(0);
      expect(snap.gpioStates).toHaveLength(0);
      expect(snap.activeSessionCount).toBe(0);
    });
  });
});
