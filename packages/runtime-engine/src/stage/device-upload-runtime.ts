/**
 * Phase 32A — Device Upload Runtime
 *
 * Code deployment pipeline for uploading generated code to real ESP32 devices.
 * Manages upload jobs, progress tracking, retry logic, and generator integration.
 *
 * Extends existing Blockly → Arduino/ESP-IDF generator outputs.
 * No browser dependencies — works in pure TypeScript.
 */

import type {
  UploadJobModel,
  UploadResultModel,
  UploadJobStatus,
  GeneratorType,
  DeviceSnapshot,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const WARN_PREFIX = '[Phase 32A Upload]';

// ─── Constants ──────────────────────────────────────────────

export const VALID_UPLOAD_STATUSES: UploadJobStatus[] = [
  'pending', 'compiling', 'uploading', 'verifying', 'completed', 'failed', 'cancelled',
];

export const VALID_GENERATOR_TYPES: GeneratorType[] = ['arduino', 'esp-idf', 'micropython'];

export const DEFAULT_MAX_RETRIES = 3;

/** Upload pipeline stages in order */
export const UPLOAD_STAGES = [
  'Preparing code',
  'Validating syntax',
  'Compiling binary',
  'Connecting to device',
  'Erasing flash',
  'Uploading firmware',
  'Verifying upload',
  'Restarting device',
  'Complete',
] as const;

// ─── Upload Job Factory ─────────────────────────────────────

/** Create a new upload job */
export function createUploadJob(
  deviceId: string,
  projectId: string,
  generatedCode: string,
  generatorType: GeneratorType,
): UploadJobModel {
  const now = Date.now();
  return {
    jobId: generateId(),
    deviceId,
    projectId,
    generatedCode,
    generatorType,
    generatedAt: now,
    status: 'pending',
    progress: 0,
    currentStage: UPLOAD_STAGES[0],
    startedAt: now,
    completedAt: null,
    logs: [`[${new Date(now).toISOString()}] Upload job created`],
    errors: [],
    retryCount: 0,
    maxRetries: DEFAULT_MAX_RETRIES,
    deleted: false,
  };
}

/** Validate an upload job */
export function validateUploadJob(
  job: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!job || typeof job !== 'object') {
    warnings.push(`${WARN_PREFIX} Upload job is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const j = job as Record<string, unknown>;

  if (typeof j.jobId !== 'string' || !j.jobId) {
    warnings.push(`${WARN_PREFIX} Upload job has empty or missing jobId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof j.deviceId !== 'string' || !j.deviceId) {
    warnings.push(`${WARN_PREFIX} Upload job "${j.jobId}" has empty deviceId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof j.projectId !== 'string' || !j.projectId) {
    warnings.push(`${WARN_PREFIX} Upload job "${j.jobId}" has empty projectId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof j.status !== 'string' || !VALID_UPLOAD_STATUSES.includes(j.status as UploadJobStatus)) {
    warnings.push(`${WARN_PREFIX} Upload job "${j.jobId}" has invalid status "${j.status}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof j.generatorType !== 'string' || !VALID_GENERATOR_TYPES.includes(j.generatorType as GeneratorType)) {
    warnings.push(`${WARN_PREFIX} Upload job "${j.jobId}" has invalid generatorType "${j.generatorType}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof j.progress !== 'number' || (j.progress as number) < 0 || (j.progress as number) > 100) {
    warnings.push(`${WARN_PREFIX} Upload job "${j.jobId}" has invalid progress ${j.progress}.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Find duplicate upload job IDs */
export function validateDuplicateJobIds(
  jobs: UploadJobModel[],
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const j of jobs) {
    if (seen.has(j.jobId)) {
      duplicates.push(j.jobId);
      console.warn(`${WARN_PREFIX} Duplicate job ID "${j.jobId}".`);
    }
    seen.add(j.jobId);
  }
  return duplicates;
}

// ─── Upload Progress Tracking ───────────────────────────────

/** Advance an upload job to the next stage (returns new copy) */
export function advanceUploadStage(
  job: UploadJobModel,
  stageIndex: number,
  log?: string,
): UploadJobModel {
  const copy = deepCopy(job);
  const maxIdx = UPLOAD_STAGES.length - 1;
  const clamped = Math.min(Math.max(0, stageIndex), maxIdx);
  copy.currentStage = UPLOAD_STAGES[clamped];
  copy.progress = Math.round((clamped / maxIdx) * 100);

  if (clamped > 0 && clamped < 3) copy.status = 'compiling';
  else if (clamped >= 3 && clamped < 7) copy.status = 'uploading';
  else if (clamped === 7) copy.status = 'verifying';
  else if (clamped === maxIdx) {
    copy.status = 'completed';
    copy.progress = 100;
    copy.completedAt = Date.now();
  }

  const timestamp = new Date().toISOString();
  copy.logs.push(`[${timestamp}] Stage: ${copy.currentStage} (${copy.progress}%)`);
  if (log) copy.logs.push(`[${timestamp}] ${log}`);

  return copy;
}

/** Mark an upload job as failed (returns new copy) */
export function failUploadJob(
  job: UploadJobModel,
  errorMessage: string,
): UploadJobModel {
  const copy = deepCopy(job);
  copy.status = 'failed';
  copy.completedAt = Date.now();
  copy.errors.push(errorMessage);
  copy.logs.push(`[${new Date().toISOString()}] FAILED: ${errorMessage}`);
  return copy;
}

/** Cancel an upload job (returns new copy) */
export function cancelUploadJob(
  job: UploadJobModel,
): UploadJobModel {
  const copy = deepCopy(job);
  copy.status = 'cancelled';
  copy.completedAt = Date.now();
  copy.logs.push(`[${new Date().toISOString()}] Upload cancelled by user`);
  return copy;
}

/** Prepare a job for retry (returns new copy) */
export function retryUploadJob(
  job: UploadJobModel,
): UploadJobModel {
  if (job.retryCount >= job.maxRetries) {
    console.warn(`${WARN_PREFIX} Job "${job.jobId}" has reached max retries (${job.maxRetries}).`);
    return deepCopy(job);
  }
  const copy = deepCopy(job);
  copy.retryCount++;
  copy.status = 'pending';
  copy.progress = 0;
  copy.currentStage = UPLOAD_STAGES[0];
  copy.completedAt = null;
  copy.errors = [];
  copy.logs.push(`[${new Date().toISOString()}] Retry attempt ${copy.retryCount}/${copy.maxRetries}`);
  return copy;
}

/** Check if an upload job can be retried */
export function canRetryJob(job: UploadJobModel): boolean {
  return (job.status === 'failed' || job.status === 'cancelled') && job.retryCount < job.maxRetries;
}

/** Check if an upload job is in a terminal state */
export function isJobTerminal(job: UploadJobModel): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}

// ─── Upload Result ──────────────────────────────────────────

/** Create an upload result from a completed job */
export function createUploadResult(
  job: UploadJobModel,
  success: boolean,
  compileDurationMs: number,
  uploadDurationMs: number,
  binarySize: number,
  flashUsage: number,
  ramUsage: number,
  errorMessage?: string,
): UploadResultModel {
  return {
    resultId: generateId(),
    jobId: job.jobId,
    deviceId: job.deviceId,
    success,
    uploadDurationMs,
    compileDurationMs,
    binarySize,
    flashUsage,
    ramUsage,
    completedAt: Date.now(),
    errorMessage: errorMessage ?? null,
    warnings: [],
  };
}

/** Validate an upload result */
export function validateUploadResult(
  result: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!result || typeof result !== 'object') {
    warnings.push(`${WARN_PREFIX} Upload result is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const r = result as Record<string, unknown>;

  if (typeof r.resultId !== 'string' || !r.resultId) {
    warnings.push(`${WARN_PREFIX} Upload result has empty resultId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof r.jobId !== 'string' || !r.jobId) {
    warnings.push(`${WARN_PREFIX} Upload result "${r.resultId}" has empty jobId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof r.success !== 'boolean') {
    warnings.push(`${WARN_PREFIX} Upload result "${r.resultId}" has non-boolean success.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

// ─── Generator Integration ──────────────────────────────────

/** Prepare code for upload — wraps generated code with metadata */
export function prepareUpload(
  generatedCode: string,
  generatorType: GeneratorType,
  projectId: string,
): { code: string; generatorType: GeneratorType; generatedAt: number; estimatedSize: number } {
  return {
    code: generatedCode,
    generatorType,
    generatedAt: Date.now(),
    estimatedSize: new TextEncoder().encode(generatedCode).length,
  };
}

/** Validate generated code before upload */
export function validateGeneratedCode(
  code: string,
  generatorType: GeneratorType,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    warnings.push(`${WARN_PREFIX} Generated code is empty.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }

  // Basic validation per generator type
  if (generatorType === 'arduino') {
    if (!code.includes('void setup()') && !code.includes('void setup ()')) {
      warnings.push(`${WARN_PREFIX} Arduino code missing setup() function.`);
      console.warn(warnings[warnings.length - 1]);
    }
    if (!code.includes('void loop()') && !code.includes('void loop ()')) {
      warnings.push(`${WARN_PREFIX} Arduino code missing loop() function.`);
      console.warn(warnings[warnings.length - 1]);
    }
  } else if (generatorType === 'esp-idf') {
    if (!code.includes('app_main') && !code.includes('void app_main')) {
      warnings.push(`${WARN_PREFIX} ESP-IDF code missing app_main() function.`);
      console.warn(warnings[warnings.length - 1]);
    }
  } else if (generatorType === 'micropython') {
    // MicroPython is more lenient — just check non-empty
    if (code.trim().length < 10) {
      warnings.push(`${WARN_PREFIX} MicroPython code appears too short.`);
      console.warn(warnings[warnings.length - 1]);
    }
  }

  return { valid: warnings.length === 0, warnings };
}

// ─── UploadJobSynchronizer ──────────────────────────────────

/**
 * Registry-based synchronizer for upload jobs and results.
 * Follows the ProjectTimelineSynchronizer pattern.
 */
export class UploadJobSynchronizer {
  // ── Jobs ──
  private readonly jobs = new Map<string, UploadJobModel>();
  private readonly jobOrder: string[] = [];

  // ── Results ──
  private readonly results = new Map<string, UploadResultModel>();
  private readonly resultOrder: string[] = [];

  // ── Job CRUD ──

  public registerJob(job: UploadJobModel): void {
    if (!job.jobId) {
      console.warn(`${WARN_PREFIX} registerJob called with empty jobId.`);
      return;
    }
    const copy = deepCopy(job);
    if (this.jobs.has(job.jobId)) {
      console.warn(`${WARN_PREFIX} Duplicate job "${job.jobId}". Replacing.`);
      this.jobs.set(job.jobId, copy);
      return;
    }
    this.jobs.set(job.jobId, copy);
    this.jobOrder.push(job.jobId);
  }

  public getJob(jobId: string): UploadJobModel | undefined {
    const val = this.jobs.get(jobId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllJobs(): UploadJobModel[] {
    return this.jobOrder
      .filter(id => this.jobs.has(id))
      .map(id => deepCopy(this.jobs.get(id)!));
  }

  public updateJob(jobId: string, updates: Partial<UploadJobModel>): void {
    const existing = this.jobs.get(jobId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update job "${jobId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, jobId };
    this.jobs.set(jobId, merged);
  }

  public removeJob(jobId: string): void {
    this.jobs.delete(jobId);
    const idx = this.jobOrder.indexOf(jobId);
    if (idx !== -1) this.jobOrder.splice(idx, 1);
  }

  public clearJobs(): void {
    this.jobs.clear();
    this.jobOrder.length = 0;
  }

  public getJobKeys(): string[] { return [...this.jobOrder]; }
  public hasJob(jobId: string): boolean { return this.jobs.has(jobId); }

  // ── Result CRUD ──

  public registerResult(result: UploadResultModel): void {
    if (!result.resultId) {
      console.warn(`${WARN_PREFIX} registerResult called with empty resultId.`);
      return;
    }
    const copy = deepCopy(result);
    if (this.results.has(result.resultId)) {
      console.warn(`${WARN_PREFIX} Duplicate result "${result.resultId}". Replacing.`);
      this.results.set(result.resultId, copy);
      return;
    }
    this.results.set(result.resultId, copy);
    this.resultOrder.push(result.resultId);
  }

  public getResult(resultId: string): UploadResultModel | undefined {
    const val = this.results.get(resultId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllResults(): UploadResultModel[] {
    return this.resultOrder
      .filter(id => this.results.has(id))
      .map(id => deepCopy(this.results.get(id)!));
  }

  public updateResult(resultId: string, updates: Partial<UploadResultModel>): void {
    const existing = this.results.get(resultId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update result "${resultId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, resultId };
    this.results.set(resultId, merged);
  }

  public removeResult(resultId: string): void {
    this.results.delete(resultId);
    const idx = this.resultOrder.indexOf(resultId);
    if (idx !== -1) this.resultOrder.splice(idx, 1);
  }

  public clearResults(): void {
    this.results.clear();
    this.resultOrder.length = 0;
  }

  public getResultKeys(): string[] { return [...this.resultOrder]; }
  public hasResult(resultId: string): boolean { return this.results.has(resultId); }

  // ── Domain Methods ──

  /** Get active (non-terminal) jobs */
  public getActiveJobs(): UploadJobModel[] {
    return this.getAllJobs().filter(j => !isJobTerminal(j) && !j.deleted);
  }

  /** Get jobs for a specific device */
  public getDeviceJobs(deviceId: string): UploadJobModel[] {
    return this.getAllJobs().filter(j => j.deviceId === deviceId && !j.deleted);
  }

  /** Get results for a specific job */
  public getJobResults(jobId: string): UploadResultModel[] {
    return this.getAllResults().filter(r => r.jobId === jobId);
  }

  /** Get success rate across all results */
  public getSuccessRate(): number {
    const all = this.getAllResults();
    if (all.length === 0) return 0;
    const successes = all.filter(r => r.success).length;
    return Math.round((successes / all.length) * 100);
  }

  // ── Lifecycle ──

  public clear(): void {
    this.clearJobs();
    this.clearResults();
  }

  public buildSnapshot(): Pick<DeviceSnapshot, 'activeJobs' | 'completedResults' | 'activeJobCount'> {
    return {
      activeJobs: this.getAllJobs(),
      completedResults: this.getAllResults(),
      activeJobCount: this.getActiveJobs().length,
    };
  }

  public toJSON(): Pick<DeviceSnapshot, 'activeJobs' | 'completedResults' | 'activeJobCount'> {
    return this.buildSnapshot();
  }

  public fromJSON(json: Partial<DeviceSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const j of json.activeJobs || []) {
      if (validateUploadJob(j).valid || validateUploadJob(j).warnings.length === 0) {
        this.registerJob(j);
      }
    }
    for (const r of json.completedResults || []) {
      if (validateUploadResult(r).valid || validateUploadResult(r).warnings.length === 0) {
        this.registerResult(r);
      }
    }
  }

  public clone(): UploadJobSynchronizer {
    const cloned = new UploadJobSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  // ── Size Getters ──
  public get jobSize(): number { return this.jobs.size; }
  public get resultSize(): number { return this.results.size; }
}
