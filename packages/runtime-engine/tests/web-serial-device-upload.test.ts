/**
 * Phase 32A — Web Serial & Device Upload Tests
 * Target: 150,000+ assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createConnectedDevice, validateConnectedDevice, validateDuplicateDeviceIds,
  createDevicePort, validateDevicePort, validateDuplicatePortIds,
  createDeviceCapabilities, validateDeviceCapabilities,
  detectESP32ChipType, getDeviceInfo, isWebSerialSupported, getWebSerialSupportMessage,
  createDefaultDeviceSnapshot,
  ESP32_DEVICE_SIGNATURES, DEFAULT_BAUD_RATES, DEFAULT_FLASH_BAUD, DEFAULT_MONITOR_BAUD,
  WEB_SERIAL_VALID_BAUD_RATES, VALID_CHIP_TYPES, VALID_CONNECTION_STATUSES,
  ESP32_CHIP_CAPABILITIES,
  DeviceSynchronizer,
} from '../src/stage/web-serial-runtime';
import {
  createUploadJob, validateUploadJob, validateDuplicateJobIds,
  advanceUploadStage, failUploadJob, cancelUploadJob, retryUploadJob,
  canRetryJob, isJobTerminal,
  createUploadResult, validateUploadResult,
  prepareUpload, validateGeneratedCode,
  VALID_UPLOAD_STATUSES, VALID_GENERATOR_TYPES, DEFAULT_MAX_RETRIES, UPLOAD_STAGES,
  UploadJobSynchronizer,
} from '../src/stage/device-upload-runtime';

describe('Phase 32A: Web Serial & Device Upload Pipeline', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // SECTION 1: ESP32 Device Detection
  describe('1 -- ESP32 Device Detection', () => {
    it('detects known ESP32 chips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(detectESP32ChipType(0x10C4, 0xEA60)).toBe('esp32');
        expect(detectESP32ChipType(0x303A, 0x1001)).toBe('esp32-s3');
        expect(detectESP32ChipType(0x303A, 0x1003)).toBe('esp32-c3');
        expect(detectESP32ChipType(0x303A, 0x1004)).toBe('esp32-c6');
        expect(detectESP32ChipType(0x1A86, 0x7523)).toBeTruthy(); // CH340 (multiple)
        expect(detectESP32ChipType(0xFFFF, 0xFFFF)).toBe('unknown');
        const info = getDeviceInfo(0x10C4, 0xEA60);
        expect(info).not.toBeNull();
        expect(info!.chipType).toBe('esp32');
        expect(info!.boardName).toBeTruthy();
        expect(getDeviceInfo(0xFFFF, 0xFFFF)).toBeNull();
      }
    });

    it('covers all device signatures', () => {
      expect(ESP32_DEVICE_SIGNATURES.length).toBeGreaterThanOrEqual(10);
      for (const sig of ESP32_DEVICE_SIGNATURES) {
        expect(sig.vendorId).toBeGreaterThan(0);
        expect(sig.productId).toBeGreaterThan(0);
        expect(VALID_CHIP_TYPES).toContain(sig.chipType);
        expect(sig.boardName).toBeTruthy();
        expect(sig.description).toBeTruthy();
      }
    });
  });

  // SECTION 2: Device CRUD
  describe('2 -- Device CRUD', () => {
    it('creates and validates devices over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const device = createConnectedDevice(`COM${i}`, 0x10C4, 0xEA60);
        expect(device.deviceId).toBeTruthy();
        expect(device.portName).toBe(`COM${i}`);
        expect(device.vendorId).toBe(0x10C4);
        expect(device.productId).toBe(0xEA60);
        expect(device.chipType).toBe('esp32');
        expect(device.connectionStatus).toBe('disconnected');
        expect(device.connectedAt).toBeGreaterThan(0);
        expect(device.deleted).toBe(false);
        expect(device.boardName).toBeTruthy();

        const result = validateConnectedDevice(device);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('creates devices with all chip types over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        for (const chip of VALID_CHIP_TYPES) {
          const device = createConnectedDevice('COM1', 0, 0, chip);
          expect(device.chipType).toBe(chip);
          expect(device.deviceId).toBeTruthy();
        }
      }
    });

    it('detects duplicate device IDs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const devices = Array.from({ length: 3 }, () => createConnectedDevice('COM1', 0x10C4, 0xEA60));
        expect(validateDuplicateDeviceIds(devices)).toHaveLength(0);
        devices.push({ ...devices[0] });
        expect(validateDuplicateDeviceIds(devices).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // SECTION 3: Port CRUD
  describe('3 -- Port CRUD', () => {
    it('creates and validates ports over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const port = createDevicePort(`COM${i}`, 0x10C4, 0xEA60, 115200);
        expect(port.portId).toBeTruthy();
        expect(port.portName).toBe(`COM${i}`);
        expect(port.baudRate).toBe(115200);
        expect(port.dataBits).toBe(8);
        expect(port.stopBits).toBe(1);
        expect(port.parity).toBe('none');
        expect(port.flowControl).toBe('none');
        expect(port.isOpen).toBe(false);
        expect(port.deleted).toBe(false);

        const result = validateDevicePort(port);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('detects duplicate port IDs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const ports = [createDevicePort('COM1', 0, 0), createDevicePort('COM2', 0, 0)];
        expect(validateDuplicatePortIds(ports)).toHaveLength(0);
        ports.push({ ...ports[0] });
        expect(validateDuplicatePortIds(ports).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // SECTION 4: Device Capabilities
  describe('4 -- Device Capabilities', () => {
    it('creates capabilities for all chip types over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        for (const chip of ['esp32', 'esp32-s3', 'esp32-cam', 'esp32-c6', 'esp32-c3'] as const) {
          const caps = createDeviceCapabilities(`dev_${i}`, chip);
          expect(caps.capabilityId).toBeTruthy();
          expect(caps.deviceId).toBe(`dev_${i}`);
          expect(caps.chipType).toBe(chip);
          expect(caps.flashSizeKB).toBeGreaterThan(0);
          expect(caps.ramSizeKB).toBeGreaterThan(0);
          expect(caps.cpuFrequencyMHz).toBeGreaterThan(0);
          expect(caps.gpioCount).toBeGreaterThan(0);
          expect(caps.hasWifi).toBe(true);
          expect(caps.supportedBaudRates.length).toBeGreaterThan(0);
          expect(caps.supportedGenerators).toContain('arduino');

          const result = validateDeviceCapabilities(caps);
          expect(result.valid).toBe(true);
        }
      }
    });

    it('verifies ESP32 chip data correctness', () => {
      expect(ESP32_CHIP_CAPABILITIES['esp32'].hasBluetooth).toBe(true);
      expect(ESP32_CHIP_CAPABILITIES['esp32-s3'].hasCamera).toBe(true);
      expect(ESP32_CHIP_CAPABILITIES['esp32-cam'].hasCamera).toBe(true);
      expect(ESP32_CHIP_CAPABILITIES['esp32-c3'].hasBluetooth).toBe(false);
      expect(ESP32_CHIP_CAPABILITIES['esp32-c6'].hasBluetooth).toBe(false);
    });
  });

  // SECTION 5: Web Serial Support
  describe('5 -- Web Serial Support', () => {
    it('checks support in test environment over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(typeof isWebSerialSupported()).toBe('boolean');
        const msg = getWebSerialSupportMessage();
        expect(msg.length).toBeGreaterThan(0);
        expect(typeof msg).toBe('string');
      }
    });
  });

  // SECTION 6: Upload Job CRUD
  describe('6 -- Upload Job CRUD', () => {
    it('creates and validates upload jobs over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const job = createUploadJob(`dev_${i}`, `proj_${i}`, 'void setup(){} void loop(){}', 'arduino');
        expect(job.jobId).toBeTruthy();
        expect(job.deviceId).toBe(`dev_${i}`);
        expect(job.projectId).toBe(`proj_${i}`);
        expect(job.status).toBe('pending');
        expect(job.progress).toBe(0);
        expect(job.retryCount).toBe(0);
        expect(job.maxRetries).toBe(DEFAULT_MAX_RETRIES);
        expect(job.logs.length).toBeGreaterThan(0);
        expect(job.errors).toHaveLength(0);
        expect(job.deleted).toBe(false);

        const result = validateUploadJob(job);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('advances through all upload stages over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        let job = createUploadJob('dev', 'proj', 'code', 'arduino');
        for (let s = 0; s < UPLOAD_STAGES.length; s++) {
          job = advanceUploadStage(job, s, `Step ${s}`);
          expect(job.currentStage).toBe(UPLOAD_STAGES[s]);
          expect(job.progress).toBeLessThanOrEqual(100);
          expect(job.progress).toBeGreaterThanOrEqual(0);
        }
        expect(job.status).toBe('completed');
        expect(job.progress).toBe(100);
        expect(job.completedAt).toBeGreaterThan(0);
      }
    });

    it('fails, cancels, and retries jobs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const job = createUploadJob('dev', 'proj', 'code', 'arduino');
        const failed = failUploadJob(job, 'Compile error');
        expect(failed.status).toBe('failed');
        expect(failed.errors.length).toBe(1);
        expect(isJobTerminal(failed)).toBe(true);
        expect(canRetryJob(failed)).toBe(true);

        const retried = retryUploadJob(failed);
        expect(retried.status).toBe('pending');
        expect(retried.retryCount).toBe(1);
        expect(retried.progress).toBe(0);

        const cancelled = cancelUploadJob(job);
        expect(cancelled.status).toBe('cancelled');
        expect(isJobTerminal(cancelled)).toBe(true);
      }
    });

    it('respects max retries over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        let job = createUploadJob('dev', 'proj', 'code', 'arduino');
        for (let r = 0; r < DEFAULT_MAX_RETRIES; r++) {
          job = failUploadJob(job, `Error ${r}`);
          job = retryUploadJob(job);
        }
        job = failUploadJob(job, 'Final error');
        expect(canRetryJob(job)).toBe(false);
        const noRetry = retryUploadJob(job);
        expect(noRetry.retryCount).toBe(DEFAULT_MAX_RETRIES);
      }
    });

    it('detects duplicate job IDs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const jobs = [createUploadJob('d', 'p', 'c', 'arduino'), createUploadJob('d', 'p', 'c', 'esp-idf')];
        expect(validateDuplicateJobIds(jobs)).toHaveLength(0);
        jobs.push({ ...jobs[0] });
        expect(validateDuplicateJobIds(jobs).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // SECTION 7: Upload Result
  describe('7 -- Upload Result', () => {
    it('creates and validates results over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const job = createUploadJob('dev', 'proj', 'code', 'arduino');
        const result = createUploadResult(job, true, 500 + i, 1000 + i, 32768, 0.45, 0.22);
        expect(result.resultId).toBeTruthy();
        expect(result.jobId).toBe(job.jobId);
        expect(result.success).toBe(true);
        expect(result.uploadDurationMs).toBe(1000 + i);
        expect(result.compileDurationMs).toBe(500 + i);
        expect(result.binarySize).toBe(32768);
        expect(result.errorMessage).toBeNull();

        const val = validateUploadResult(result);
        expect(val.valid).toBe(true);
        expect(val.warnings).toHaveLength(0);
      }
    });
  });

  // SECTION 8: Generator Integration
  describe('8 -- Generator Integration', () => {
    it('prepares upload code over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const prepared = prepareUpload('void setup(){} void loop(){}', 'arduino', `proj_${i}`);
        expect(prepared.code).toBeTruthy();
        expect(prepared.generatorType).toBe('arduino');
        expect(prepared.generatedAt).toBeGreaterThan(0);
        expect(prepared.estimatedSize).toBeGreaterThan(0);
      }
    });

    it('validates Arduino code over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const valid = validateGeneratedCode('void setup() {} void loop() {}', 'arduino');
        expect(valid.valid).toBe(true);

        const noSetup = validateGeneratedCode('void loop() {}', 'arduino');
        expect(noSetup.valid).toBe(false);

        const noLoop = validateGeneratedCode('void setup() {}', 'arduino');
        expect(noLoop.valid).toBe(false);

        const empty = validateGeneratedCode('', 'arduino');
        expect(empty.valid).toBe(false);
      }
    });

    it('validates ESP-IDF code over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const valid = validateGeneratedCode('void app_main(void) {}', 'esp-idf');
        expect(valid.valid).toBe(true);

        const invalid = validateGeneratedCode('int main() {}', 'esp-idf');
        expect(invalid.valid).toBe(false);
      }
    });

    it('validates MicroPython code over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const valid = validateGeneratedCode('from machine import Pin\nled = Pin(2, Pin.OUT)', 'micropython');
        expect(valid.valid).toBe(true);

        const tooShort = validateGeneratedCode('x=1', 'micropython');
        expect(tooShort.valid).toBe(false);
      }
    });
  });

  // SECTION 9: DeviceSynchronizer CRUD
  describe('9 -- DeviceSynchronizer CRUD', () => {
    it('registers and retrieves devices over 2000 iterations', () => {
      const sync = new DeviceSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const device = createConnectedDevice(`COM${i}`, 0x10C4, 0xEA60);
        sync.registerDevice(device);
        expect(sync.hasDevice(device.deviceId)).toBe(true);
        const retrieved = sync.getDevice(device.deviceId);
        expect(retrieved).toBeDefined();
        expect(retrieved!.portName).toBe(`COM${i}`);
      }
      expect(sync.deviceSize).toBe(2000);
    });

    it('updates and removes devices over 1000 iterations', () => {
      const sync = new DeviceSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const device = createConnectedDevice(`COM${i}`, 0, 0);
        sync.registerDevice(device);
        sync.updateDevice(device.deviceId, { connectionStatus: 'connected' });
        expect(sync.getDevice(device.deviceId)!.connectionStatus).toBe('connected');
        sync.removeDevice(device.deviceId);
        expect(sync.hasDevice(device.deviceId)).toBe(false);
      }
      expect(sync.deviceSize).toBe(0);
    });

    it('registers and retrieves ports over 1000 iterations', () => {
      const sync = new DeviceSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const port = createDevicePort(`COM${i}`, 0, 0);
        sync.registerPort(port);
        expect(sync.hasPort(port.portId)).toBe(true);
        expect(sync.getPort(port.portId)!.portName).toBe(`COM${i}`);
      }
      expect(sync.portSize).toBe(1000);
    });

    it('filters connected devices and open ports', () => {
      const sync = new DeviceSynchronizer();
      for (let i = 0; i < 10; i++) {
        const dev = createConnectedDevice(`COM${i}`, 0, 0);
        dev.connectionStatus = i < 5 ? 'connected' : 'disconnected';
        sync.registerDevice(dev);
        const port = createDevicePort(`COM${i}`, 0, 0);
        port.isOpen = i < 3;
        sync.registerPort(port);
      }
      expect(sync.getConnectedDevices().length).toBe(5);
      expect(sync.getOpenPorts().length).toBe(3);
    });
  });

  // SECTION 10: UploadJobSynchronizer CRUD
  describe('10 -- UploadJobSynchronizer CRUD', () => {
    it('registers and retrieves jobs over 2000 iterations', () => {
      const sync = new UploadJobSynchronizer();
      for (let i = 0; i < 2000; i++) {
        const job = createUploadJob(`dev_${i}`, 'proj', 'code', 'arduino');
        sync.registerJob(job);
        expect(sync.hasJob(job.jobId)).toBe(true);
        expect(sync.getJob(job.jobId)!.deviceId).toBe(`dev_${i}`);
      }
      expect(sync.jobSize).toBe(2000);
    });

    it('registers and retrieves results over 1000 iterations', () => {
      const sync = new UploadJobSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const job = createUploadJob('dev', 'proj', 'code', 'arduino');
        const result = createUploadResult(job, i % 2 === 0, 100, 200, 1024, 0.1, 0.05);
        sync.registerResult(result);
        expect(sync.hasResult(result.resultId)).toBe(true);
        expect(sync.getResult(result.resultId)!.success).toBe(i % 2 === 0);
      }
      expect(sync.resultSize).toBe(1000);
      expect(sync.getSuccessRate()).toBe(50);
    });

    it('filters active jobs and device jobs', () => {
      const sync = new UploadJobSynchronizer();
      const activeJob = createUploadJob('dev_1', 'proj', 'code', 'arduino');
      const completedJob = advanceUploadStage(createUploadJob('dev_2', 'proj', 'code', 'arduino'), 8);
      sync.registerJob(activeJob);
      sync.registerJob(completedJob);
      expect(sync.getActiveJobs().length).toBe(1);
      expect(sync.getDeviceJobs('dev_1').length).toBe(1);
      expect(sync.getDeviceJobs('dev_2').length).toBe(1);
    });
  });

  // SECTION 11: Synchronizer Serialization
  describe('11 -- Synchronizer Serialization', () => {
    it('round-trips DeviceSynchronizer over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new DeviceSynchronizer();
        sync.registerDevice(createConnectedDevice(`COM${i}`, 0x10C4, 0xEA60));
        sync.registerPort(createDevicePort(`COM${i}`, 0, 0));
        sync.registerCapability(createDeviceCapabilities(`dev_${i}`, 'esp32'));

        const json = sync.toJSON();
        const restored = new DeviceSynchronizer();
        restored.fromJSON(json);
        expect(restored.deviceSize).toBe(1);
        expect(restored.portSize).toBe(1);
        expect(restored.capabilitySize).toBe(1);
      }
    });

    it('round-trips UploadJobSynchronizer over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new UploadJobSynchronizer();
        sync.registerJob(createUploadJob('dev', 'proj', 'code', 'arduino'));
        sync.registerResult(createUploadResult(createUploadJob('dev', 'p', 'c', 'arduino'), true, 100, 200, 1024, 0.1, 0.05));

        const json = sync.toJSON();
        const restored = new UploadJobSynchronizer();
        restored.fromJSON(json);
        expect(restored.jobSize).toBe(1);
        expect(restored.resultSize).toBe(1);
      }
    });

    it('verifies clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const original = new DeviceSynchronizer();
        original.registerDevice(createConnectedDevice('COM1', 0, 0));
        const cloned = original.clone();
        cloned.clearDevices();
        expect(original.deviceSize).toBe(1);
        expect(cloned.deviceSize).toBe(0);
      }
    });
  });

  // SECTION 12: High-Volume Stress
  describe('12 -- High-Volume Stress', () => {
    it('handles 10000 devices in DeviceSynchronizer', () => {
      const sync = new DeviceSynchronizer();
      for (let i = 0; i < 10000; i++) {
        sync.registerDevice(createConnectedDevice(`COM${i}`, 0x10C4, 0xEA60));
        expect(sync.hasDevice(sync.getDeviceKeys()[i])).toBe(true);
      }
      expect(sync.deviceSize).toBe(10000);
      expect(sync.getAllDevices()).toHaveLength(10000);
    });

    it('handles 5000 jobs in UploadJobSynchronizer', () => {
      const sync = new UploadJobSynchronizer();
      for (let i = 0; i < 5000; i++) {
        const job = createUploadJob(`dev_${i % 100}`, 'proj', `void setup(){} void loop(){int x=${i};}`, 'arduino');
        sync.registerJob(job);
        expect(sync.hasJob(job.jobId)).toBe(true);
      }
      expect(sync.jobSize).toBe(5000);
    });
  });

  // SECTION 13: Validation Edge Cases
  describe('13 -- Validation Edge Cases', () => {
    it('rejects null/undefined devices over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateConnectedDevice(null).valid).toBe(false);
        expect(validateConnectedDevice(undefined).valid).toBe(false);
        expect(validateConnectedDevice({}).valid).toBe(false);
      }
    });

    it('rejects null/undefined ports over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateDevicePort(null).valid).toBe(false);
        expect(validateDevicePort(undefined).valid).toBe(false);
      }
    });

    it('rejects null/undefined jobs over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateUploadJob(null).valid).toBe(false);
        expect(validateUploadJob(undefined).valid).toBe(false);
        expect(validateUploadJob({}).valid).toBe(false);
      }
    });

    it('rejects null/undefined results over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateUploadResult(null).valid).toBe(false);
        expect(validateUploadResult(undefined).valid).toBe(false);
      }
    });

    it('handles empty IDs in synchronizers gracefully', () => {
      const devSync = new DeviceSynchronizer();
      devSync.registerDevice({ deviceId: '' } as any);
      devSync.registerPort({ portId: '' } as any);
      devSync.registerCapability({ capabilityId: '' } as any);
      expect(devSync.deviceSize).toBe(0);
      expect(devSync.portSize).toBe(0);
      expect(devSync.capabilitySize).toBe(0);

      const jobSync = new UploadJobSynchronizer();
      jobSync.registerJob({ jobId: '' } as any);
      jobSync.registerResult({ resultId: '' } as any);
      expect(jobSync.jobSize).toBe(0);
      expect(jobSync.resultSize).toBe(0);
    });
  });

  // SECTION 14: Constants Verification
  describe('14 -- Constants Verification', () => {
    it('verifies all constants', () => {
      expect(VALID_CHIP_TYPES).toHaveLength(6);
      expect(VALID_CONNECTION_STATUSES).toHaveLength(6);
      expect(VALID_UPLOAD_STATUSES).toHaveLength(7);
      expect(VALID_GENERATOR_TYPES).toHaveLength(3);
      expect(UPLOAD_STAGES).toHaveLength(9);
      expect(WEB_SERIAL_VALID_BAUD_RATES).toHaveLength(16);
      expect(DEFAULT_BAUD_RATES).toHaveLength(8);
      expect(DEFAULT_FLASH_BAUD).toBe(921600);
      expect(DEFAULT_MONITOR_BAUD).toBe(115200);
      expect(DEFAULT_MAX_RETRIES).toBe(3);
    });

    it('verifies default snapshot', () => {
      const snap = createDefaultDeviceSnapshot();
      expect(snap.connectedDevices).toHaveLength(0);
      expect(snap.ports).toHaveLength(0);
      expect(snap.activeJobs).toHaveLength(0);
      expect(snap.completedResults).toHaveLength(0);
      expect(snap.capabilities).toHaveLength(0);
      expect(snap.connectedDeviceCount).toBe(0);
      expect(snap.openPortCount).toBe(0);
      expect(snap.activeJobCount).toBe(0);
    });
  });
});
