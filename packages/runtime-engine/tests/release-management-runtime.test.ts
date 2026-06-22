/**
 * Phase 37B — Release Management Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createRelease, promoteRelease, compareVersions, getLatestByChannel,
  createFeatureFlag, enableFeatureFlag, disableFeatureFlag,
  setFeatureFlagPercentage, isFeatureEnabled, getDefaultFeatureFlags,
  createMigration, applyMigration, rollbackMigration,
  getPendingMigrations, validateMigrationOrder,
  ReleaseManagementSynchronizer,
} from '../src/stage/release-management-runtime';

describe('Phase 37B: Release Management', () => {
  it('manages releases over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const release = createRelease(`1.${i}.0`, 'beta', `hash${i}`, 'dev');
      expect(release.channel).toBe('beta');
      const promoted = promoteRelease(release, 'stable');
      expect(promoted.channel).toBe('stable');
      expect(promoteRelease(promoted, 'beta').channel).toBe('stable'); // can't demote
    }
  });

  it('compares versions over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    }
  });

  it('manages feature flags over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let flag = createFeatureFlag(`flag${i}`, 'Test flag');
      expect(isFeatureEnabled(flag)).toBe(false);
      flag = enableFeatureFlag(flag);
      expect(isFeatureEnabled(flag)).toBe(true);
      flag = disableFeatureFlag(flag);
      expect(isFeatureEnabled(flag)).toBe(false);
      flag = setFeatureFlagPercentage(flag, 100);
      expect(flag.percentage).toBe(100);
    }
  });

  it('gets default feature flags', () => {
    const flags = getDefaultFeatureFlags();
    expect(flags.length).toBeGreaterThan(5);
    expect(flags.find(f => f.name === 'dark_mode')?.status).toBe('enabled');
  });

  it('manages migrations over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let migration = createMigration(`1.${i}.0`, 'Add column', 'ALTER TABLE...');
      expect(migration.status).toBe('pending');
      migration = applyMigration(migration);
      expect(migration.status).toBe('applied');
      migration = rollbackMigration(migration);
      expect(migration.status).toBe('rolled_back');
    }
  });

  it('validates migration order', () => {
    const ordered = [
      createMigration('1.0.0', 'M1', 'SQL1'),
      createMigration('1.1.0', 'M2', 'SQL2'),
      createMigration('2.0.0', 'M3', 'SQL3'),
    ];
    expect(validateMigrationOrder(ordered)).toBe(true);
    const unordered = [
      createMigration('2.0.0', 'M1', 'SQL1'),
      createMigration('1.0.0', 'M2', 'SQL2'),
    ];
    expect(validateMigrationOrder(unordered)).toBe(false);
  });

  it('finds latest by channel', () => {
    const releases = [
      createRelease('1.0.0', 'stable', 'h1', 'dev'),
      createRelease('2.0.0', 'beta', 'h2', 'dev'),
      createRelease('1.1.0', 'stable', 'h3', 'dev'),
    ];
    const latest = getLatestByChannel(releases, 'stable');
    expect(latest?.version).toBe('1.1.0');
  });

  it('ReleaseManagementSynchronizer lifecycle', () => {
    const sync = new ReleaseManagementSynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addRelease(createRelease(`1.0.${i}`, 'beta', `h${i}`, 'dev'));
      sync.addFlag(createFeatureFlag(`f${i}`, `Flag ${i}`));
      sync.addMigration(createMigration(`1.0.${i}`, `M${i}`, `SQL${i}`));
    }
    expect(sync.getAllReleases()).toHaveLength(100);
    expect(sync.getAllFlags()).toHaveLength(100);
    const clone = sync.clone();
    expect(clone.getAllReleases()).toHaveLength(100);
    sync.clear();
    expect(sync.getAllReleases()).toHaveLength(0);
  });
});
