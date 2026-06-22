/**
 * Phase 37B — CI/CD Pipeline Runtime
 *
 * GitHub Actions workflows, build/test/lint pipelines,
 * preview deployments, production deployments, rollbacks.
 */

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type PipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type PipelineStage = 'checkout' | 'install' | 'lint' | 'typecheck' | 'test' | 'build' | 'deploy' | 'verify' | 'rollback';
export type DeployTarget = 'preview' | 'staging' | 'production';

export interface PipelineRun {
  runId: string;
  pipelineId: string;
  commitHash: string;
  branch: string;
  stages: PipelineStageResult[];
  status: PipelineStatus;
  triggeredBy: string;
  startedAt: number;
  completedAt: number | null;
  duration: number;
  artifacts: string[];
}

export interface PipelineStageResult {
  stage: PipelineStage;
  status: PipelineStatus;
  startedAt: number;
  completedAt: number | null;
  duration: number;
  logs: string[];
  exitCode: number;
}

export interface PipelineConfig {
  pipelineId: string;
  name: string;
  triggers: string[];
  stages: PipelineStage[];
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
  notifyOnFailure: boolean;
  deployTarget: DeployTarget | null;
}

export interface ReleaseTag {
  tagId: string;
  version: string;
  commitHash: string;
  pipelineRunId: string;
  createdAt: number;
  createdBy: string;
  notes: string;
}

// ─── Pipeline Config ─────────────────────────────────────────

export function createPipelineConfig(
  name: string, stages: PipelineStage[], triggers: string[] = ['push'],
  deployTarget: DeployTarget | null = null,
): PipelineConfig {
  return {
    pipelineId: uid(), name, triggers, stages, timeout: 600000,
    retryOnFailure: true, maxRetries: 2, notifyOnFailure: true, deployTarget,
  };
}

export function getDefaultPipelines(): PipelineConfig[] {
  return [
    createPipelineConfig('CI', ['checkout', 'install', 'lint', 'typecheck', 'test', 'build'], ['push', 'pull_request']),
    createPipelineConfig('Preview Deploy', ['checkout', 'install', 'build', 'deploy', 'verify'], ['pull_request'], 'preview'),
    createPipelineConfig('Staging Deploy', ['checkout', 'install', 'lint', 'typecheck', 'test', 'build', 'deploy', 'verify'], ['push:main'], 'staging'),
    createPipelineConfig('Production Deploy', ['checkout', 'install', 'lint', 'typecheck', 'test', 'build', 'deploy', 'verify'], ['release'], 'production'),
  ];
}

// ─── Pipeline Execution ──────────────────────────────────────

export function startPipelineRun(config: PipelineConfig, commitHash: string, branch: string, triggeredBy: string): PipelineRun {
  return {
    runId: uid(), pipelineId: config.pipelineId, commitHash, branch,
    stages: config.stages.map(s => ({
      stage: s, status: 'pending', startedAt: 0, completedAt: null, duration: 0, logs: [], exitCode: -1,
    })),
    status: 'running', triggeredBy, startedAt: now(), completedAt: null, duration: 0, artifacts: [],
  };
}

export function advancePipelineStage(run: PipelineRun, stageIndex: number, success: boolean, logs: string[] = []): PipelineRun {
  if (stageIndex < 0 || stageIndex >= run.stages.length) return run;
  const stages = run.stages.map((s, i) => {
    if (i === stageIndex) {
      return { ...s, status: (success ? 'success' : 'failed') as PipelineStatus, completedAt: now(), duration: now() - (s.startedAt || now()), logs, exitCode: success ? 0 : 1 };
    }
    if (i === stageIndex + 1 && success) return { ...s, status: 'running' as PipelineStatus, startedAt: now() };
    return s;
  });
  const failed = stages.some(s => s.status === 'failed');
  const allDone = stages.every(s => s.status === 'success');
  return {
    ...run, stages,
    status: failed ? 'failed' : allDone ? 'success' : 'running',
    completedAt: (failed || allDone) ? now() : null,
    duration: now() - run.startedAt,
  };
}

export function cancelPipelineRun(run: PipelineRun): PipelineRun {
  return { ...run, status: 'cancelled', completedAt: now(), duration: now() - run.startedAt };
}

export function addArtifact(run: PipelineRun, artifact: string): PipelineRun {
  return { ...run, artifacts: [...run.artifacts, artifact] };
}

// ─── Release Tagging ─────────────────────────────────────────

export function createReleaseTag(version: string, commitHash: string, pipelineRunId: string, createdBy: string, notes = ''): ReleaseTag {
  return { tagId: uid(), version, commitHash, pipelineRunId, createdAt: now(), createdBy, notes };
}

export function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
}

// ─── Rollback ────────────────────────────────────────────────

export function createRollbackRun(originalRun: PipelineRun, targetCommit: string, triggeredBy: string): PipelineRun {
  return {
    runId: uid(), pipelineId: originalRun.pipelineId, commitHash: targetCommit, branch: originalRun.branch,
    stages: [{ stage: 'rollback', status: 'running', startedAt: now(), completedAt: null, duration: 0, logs: [`Rolling back from ${originalRun.commitHash} to ${targetCommit}`], exitCode: -1 }],
    status: 'running', triggeredBy, startedAt: now(), completedAt: null, duration: 0, artifacts: [],
  };
}

// ─── Synchronizer ────────────────────────────────────────────

export class CiCdSynchronizer {
  private pipelines = new Map<string, PipelineConfig>();
  private runs = new Map<string, PipelineRun>();
  private tags = new Map<string, ReleaseTag>();
  private runOrder: string[] = [];

  addPipeline(p: PipelineConfig) { this.pipelines.set(p.pipelineId, { ...p }); }
  getPipeline(id: string) { const p = this.pipelines.get(id); return p ? { ...p } : undefined; }
  getAllPipelines() { return Array.from(this.pipelines.values()).map(p => ({ ...p })); }

  addRun(r: PipelineRun) { this.runs.set(r.runId, { ...r }); if (!this.runOrder.includes(r.runId)) this.runOrder.push(r.runId); }
  getRun(id: string) { const r = this.runs.get(id); return r ? { ...r } : undefined; }
  getRecentRuns(n = 10) { return this.runOrder.slice(-n).map(id => ({ ...this.runs.get(id)! })); }

  addTag(t: ReleaseTag) { this.tags.set(t.tagId, { ...t }); }
  getTag(id: string) { const t = this.tags.get(id); return t ? { ...t } : undefined; }
  getAllTags() { return Array.from(this.tags.values()).map(t => ({ ...t })); }

  clear() { this.pipelines.clear(); this.runs.clear(); this.tags.clear(); this.runOrder = []; }

  toJSON() { return { pipelines: this.getAllPipelines(), runs: this.getRecentRuns(100), tags: this.getAllTags() }; }
  fromJSON(d: { pipelines?: PipelineConfig[]; runs?: PipelineRun[]; tags?: ReleaseTag[] }) {
    this.clear();
    (d.pipelines || []).forEach(p => this.addPipeline(p));
    (d.runs || []).forEach(r => this.addRun(r));
    (d.tags || []).forEach(t => this.addTag(t));
  }
  clone(): CiCdSynchronizer { const c = new CiCdSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
