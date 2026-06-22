/**
 * Phase 37B — Backup & Recovery Runtime
 *
 * Database, project, marketplace, classroom, competition backups.
 * Restore workflows, retention policies.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type BackupType = 'full' | 'incremental' | 'differential';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'expired';
export type BackupTarget = 'database' | 'projects' | 'marketplace' | 'classrooms' | 'competitions' | 'certificates' | 'media' | 'config';

export interface BackupJob {
  jobId: string;
  target: BackupTarget;
  type: BackupType;
  status: BackupStatus;
  sizeBytes: number;
  startedAt: number;
  completedAt: number | null;
  expiresAt: number;
  checksum: string;
  storagePath: string;
  retentionDays: number;
}

export interface RestoreJob {
  restoreId: string;
  backupJobId: string;
  target: BackupTarget;
  status: BackupStatus;
  startedAt: number;
  completedAt: number | null;
  restoredRecords: number;
  errors: string[];
}

export interface RetentionPolicy {
  policyId: string;
  target: BackupTarget;
  dailyRetention: number;
  weeklyRetention: number;
  monthlyRetention: number;
  maxTotalSizeBytes: number;
}

export interface BackupSchedule {
  scheduleId: string;
  target: BackupTarget;
  type: BackupType;
  cronExpression: string;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number;
}

// ─── Backup Operations ───────────────────────────────────────

export function createBackup(target: BackupTarget, type: BackupType = 'full', retentionDays = 30): BackupJob {
  return {
    jobId: uid(), target, type, status: 'running', sizeBytes: 0,
    startedAt: now(), completedAt: null,
    expiresAt: now() + retentionDays * 86400000,
    checksum: uid(), storagePath: `/backups/${target}/${Date.now()}`,
    retentionDays,
  };
}

export function completeBackup(job: BackupJob, sizeBytes: number): BackupJob {
  return { ...job, status: 'completed', sizeBytes, completedAt: now(), checksum: uid() };
}

export function failBackup(job: BackupJob, reason: string): BackupJob {
  return { ...job, status: 'failed', completedAt: now() };
}

export function isBackupExpired(job: BackupJob): boolean {
  return now() > job.expiresAt;
}

export function evictExpiredBackups(jobs: BackupJob[]): BackupJob[] {
  return jobs.filter(j => !isBackupExpired(j) || j.status !== 'completed');
}

// ─── Restore Operations ─────────────────────────────────────

export function createRestore(backupJobId: string, target: BackupTarget): RestoreJob {
  return { restoreId: uid(), backupJobId, target, status: 'running', startedAt: now(), completedAt: null, restoredRecords: 0, errors: [] };
}

export function completeRestore(job: RestoreJob, restoredRecords: number): RestoreJob {
  return { ...job, status: 'completed', completedAt: now(), restoredRecords };
}

export function failRestore(job: RestoreJob, error: string): RestoreJob {
  return { ...job, status: 'failed', completedAt: now(), errors: [...job.errors, error] };
}

// ─── Retention Policy ────────────────────────────────────────

export function createRetentionPolicy(target: BackupTarget, dailyRetention = 7, weeklyRetention = 4, monthlyRetention = 12): RetentionPolicy {
  return { policyId: uid(), target, dailyRetention, weeklyRetention, monthlyRetention, maxTotalSizeBytes: 10 * 1024 * 1024 * 1024 };
}

export function getDefaultRetentionPolicies(): RetentionPolicy[] {
  return [
    createRetentionPolicy('database', 7, 4, 12),
    createRetentionPolicy('projects', 7, 4, 6),
    createRetentionPolicy('marketplace', 7, 4, 6),
    createRetentionPolicy('classrooms', 7, 4, 6),
    createRetentionPolicy('competitions', 7, 4, 3),
    createRetentionPolicy('certificates', 30, 12, 24),
    createRetentionPolicy('media', 3, 2, 3),
    createRetentionPolicy('config', 30, 12, 24),
  ];
}

// ─── Backup Schedule ─────────────────────────────────────────

export function createBackupSchedule(target: BackupTarget, type: BackupType, cronExpression: string): BackupSchedule {
  return { scheduleId: uid(), target, type, cronExpression, enabled: true, lastRun: null, nextRun: now() + 86400000 };
}

export function getDefaultSchedules(): BackupSchedule[] {
  return [
    createBackupSchedule('database', 'full', '0 2 * * *'),
    createBackupSchedule('projects', 'incremental', '0 3 * * *'),
    createBackupSchedule('marketplace', 'incremental', '0 4 * * *'),
    createBackupSchedule('classrooms', 'incremental', '0 4 * * *'),
    createBackupSchedule('config', 'full', '0 1 * * 0'),
  ];
}

// ─── Synchronizer ────────────────────────────────────────────

export class BackupSynchronizer {
  private backups = new Map<string, BackupJob>();
  private restores = new Map<string, RestoreJob>();
  private policies = new Map<string, RetentionPolicy>();
  private schedules = new Map<string, BackupSchedule>();

  addBackup(b: BackupJob) { this.backups.set(b.jobId, { ...b }); }
  getBackup(id: string) { const b = this.backups.get(id); return b ? { ...b } : undefined; }
  getAllBackups() { return Array.from(this.backups.values()).map(b => ({ ...b })); }

  addRestore(r: RestoreJob) { this.restores.set(r.restoreId, { ...r }); }
  getRestore(id: string) { const r = this.restores.get(id); return r ? { ...r } : undefined; }
  getAllRestores() { return Array.from(this.restores.values()).map(r => ({ ...r })); }

  addPolicy(p: RetentionPolicy) { this.policies.set(p.policyId, { ...p }); }
  getAllPolicies() { return Array.from(this.policies.values()).map(p => ({ ...p })); }

  addSchedule(s: BackupSchedule) { this.schedules.set(s.scheduleId, { ...s }); }
  getAllSchedules() { return Array.from(this.schedules.values()).map(s => ({ ...s })); }

  clear() { this.backups.clear(); this.restores.clear(); this.policies.clear(); this.schedules.clear(); }

  toJSON() { return { backups: this.getAllBackups(), restores: this.getAllRestores(), policies: this.getAllPolicies(), schedules: this.getAllSchedules() }; }
  fromJSON(d: { backups?: BackupJob[]; restores?: RestoreJob[]; policies?: RetentionPolicy[]; schedules?: BackupSchedule[] }) {
    this.clear();
    (d.backups || []).forEach(b => this.addBackup(b));
    (d.restores || []).forEach(r => this.addRestore(r));
    (d.policies || []).forEach(p => this.addPolicy(p));
    (d.schedules || []).forEach(s => this.addSchedule(s));
  }
  clone(): BackupSynchronizer { const c = new BackupSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
