/**
 * Phase 37B — Backup & Recovery Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createBackup, completeBackup, failBackup, isBackupExpired,
  evictExpiredBackups, createRestore, completeRestore, failRestore,
  createRetentionPolicy, getDefaultRetentionPolicies,
  createBackupSchedule, getDefaultSchedules, BackupSynchronizer,
} from '../src/stage/backup-runtime';

describe('Phase 37B: Backup & Recovery', () => {
  it('creates and completes backups over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let backup = createBackup('database', 'full', 30);
      expect(backup.status).toBe('running');
      backup = completeBackup(backup, 1024 * 1024);
      expect(backup.status).toBe('completed');
      expect(backup.sizeBytes).toBe(1024 * 1024);
      expect(isBackupExpired(backup)).toBe(false);
    }
  });

  it('handles backup failure over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let backup = createBackup('projects', 'incremental');
      backup = failBackup(backup, 'Disk full');
      expect(backup.status).toBe('failed');
    }
  });

  it('evicts expired backups over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const backups = [
        completeBackup(createBackup('database'), 100),
        { ...completeBackup(createBackup('database'), 200), expiresAt: 0 },
      ];
      const valid = evictExpiredBackups(backups);
      expect(valid).toHaveLength(1);
    }
  });

  it('restores from backups over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const backup = completeBackup(createBackup('database'), 1000);
      let restore = createRestore(backup.jobId, 'database');
      expect(restore.status).toBe('running');
      restore = completeRestore(restore, 500);
      expect(restore.status).toBe('completed');
      expect(restore.restoredRecords).toBe(500);
    }
  });

  it('manages retention policies and schedules', () => {
    const policies = getDefaultRetentionPolicies();
    expect(policies).toHaveLength(8);
    const schedules = getDefaultSchedules();
    expect(schedules).toHaveLength(5);
    expect(schedules[0].cronExpression).toBe('0 2 * * *');
  });

  it('BackupSynchronizer lifecycle', () => {
    const sync = new BackupSynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addBackup(completeBackup(createBackup('database'), i * 100));
    }
    expect(sync.getAllBackups()).toHaveLength(100);
    getDefaultRetentionPolicies().forEach(p => sync.addPolicy(p));
    getDefaultSchedules().forEach(s => sync.addSchedule(s));
    const clone = sync.clone();
    expect(clone.getAllBackups()).toHaveLength(100);
    sync.clear();
    expect(sync.getAllBackups()).toHaveLength(0);
  });
});
