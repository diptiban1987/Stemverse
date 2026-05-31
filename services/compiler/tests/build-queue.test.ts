import { describe, expect, it } from 'vitest';
import { BuildQueueService } from '../src/compile/build-queue.service';
import { ArduinoCliService } from '../src/compile/arduino-cli.service';

describe('BuildQueueService', () => {
  it('processes jobs sequentially', async () => {
    process.env.STEMVERSE_COMPILER_SIMULATE = '1';
    const queue = new BuildQueueService(new ArduinoCliService());
    const now = new Date().toISOString();
    queue.enqueue({
      id: 'job-1',
      board: 'esp32',
      status: 'queued',
      logs: [],
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((r) => setTimeout(r, 800));
    const job = queue.getJob('job-1');
    expect(job?.status).toBe('completed');
    delete process.env.STEMVERSE_COMPILER_SIMULATE;
  });

  it('runs arduino-cli compile for arduino_uno jobs', async () => {
    process.env.STEMVERSE_COMPILER_SIMULATE = '1';
    const queue = new BuildQueueService(new ArduinoCliService());
    const now = new Date().toISOString();
    queue.enqueue({
      id: 'job-arduino',
      board: 'arduino_uno',
      status: 'queued',
      logs: [],
      artifacts: { 'sketch.ino': 'void setup() {}\nvoid loop() {}' },
      createdAt: now,
      updatedAt: now,
    });
    await new Promise((r) => setTimeout(r, 800));
    const job = queue.getJob('job-arduino');
    expect(job?.status).toBe('completed');
    expect(job?.binaryMetadata?.boardFqbn).toContain('uno');
    expect(job?.buildSimulated).toBe(true);
    delete process.env.STEMVERSE_COMPILER_SIMULATE;
  });
});
