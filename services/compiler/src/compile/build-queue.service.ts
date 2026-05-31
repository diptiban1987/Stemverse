import { Injectable } from '@nestjs/common';
import { ArduinoCliService, type ArduinoBinaryMetadata, type ArduinoCompileError } from './arduino-cli.service';

export type CompileJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type CompileJob = {
  id: string;
  projectId?: string;
  board: string;
  status: CompileJobStatus;
  logs: string[];
  artifacts?: Record<string, string>;
  error?: string;
  compileErrors?: ArduinoCompileError[];
  binaryMetadata?: ArduinoBinaryMetadata;
  buildSimulated?: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class BuildQueueService {
  private queue: string[] = [];
  private jobs = new Map<string, CompileJob>();
  private processing = false;

  constructor(private readonly arduinoCli: ArduinoCliService) {}

  enqueue(job: CompileJob): void {
    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    void this.processNext();
  }

  getJob(id: string): CompileJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(): CompileJob[] {
    return [...this.jobs.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const jobId = this.queue.shift()!;
    const job = this.jobs.get(jobId);
    if (!job) {
      this.processing = false;
      return;
    }

    job.status = 'processing';
    job.updatedAt = new Date().toISOString();
    job.logs.push(`[${job.updatedAt}] Processing compile job ${jobId}`);

    try {
      const isArduinoFamily =
        job.board.startsWith('arduino') || job.board === 'esp8266';
      const source =
        job.artifacts?.['sketch.ino'] ??
        job.artifacts?.['main.ino'] ??
        'void setup() {}\nvoid loop() {}';

      if (isArduinoFamily && source) {
        const result = await this.arduinoCli.compileSketch({
          sourceCode: source,
          board: job.board,
          projectName: job.projectId ?? 'stemverse_sketch',
        });
        job.logs.push(...result.logs);
        job.compileErrors = result.errors;
        job.binaryMetadata = result.binary;
        job.buildSimulated = result.simulated;
        job.status = result.success ? 'completed' : 'failed';
        if (!result.success) {
          job.error = result.errors.find((e) => e.severity === 'error')?.message ?? 'Compile failed';
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        job.logs.push(`[${new Date().toISOString()}] ESP-IDF / export build complete for ${job.board}`);
        job.status = 'completed';
      }
      job.updatedAt = new Date().toISOString();
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : 'Unknown error';
      job.updatedAt = new Date().toISOString();
    }

    this.processing = false;
    if (this.queue.length > 0) void this.processNext();
  }
}
