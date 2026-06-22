/**
 * Phase 37B — Release Management Runtime
 *
 * Versioning, release channels, feature flags, migration validation.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type ReleaseChannel = 'alpha' | 'beta' | 'stable' | 'lts';
export type FeatureFlagStatus = 'enabled' | 'disabled' | 'percentage' | 'user_list';

export interface ReleaseVersion {
  versionId: string;
  version: string;
  channel: ReleaseChannel;
  commitHash: string;
  releasedAt: number;
  releasedBy: string;
  changelog: string;
  breaking: boolean;
  migrationRequired: boolean;
}

export interface FeatureFlag {
  flagId: string;
  name: string;
  description: string;
  status: FeatureFlagStatus;
  percentage: number;
  userList: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MigrationStep {
  migrationId: string;
  version: string;
  description: string;
  sql: string;
  reversible: boolean;
  appliedAt: number | null;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
}

// ─── Versioning ──────────────────────────────────────────────

export function createRelease(version: string, channel: ReleaseChannel, commitHash: string, releasedBy: string, changelog = '', breaking = false, migrationRequired = false): ReleaseVersion {
  return { versionId: uid(), version, channel, commitHash, releasedAt: now(), releasedBy, changelog, breaking, migrationRequired };
}

export function promoteRelease(release: ReleaseVersion, newChannel: ReleaseChannel): ReleaseVersion {
  const channels: ReleaseChannel[] = ['alpha', 'beta', 'stable', 'lts'];
  const currentIdx = channels.indexOf(release.channel);
  const newIdx = channels.indexOf(newChannel);
  if (newIdx <= currentIdx) return release;
  return { ...release, channel: newChannel };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export function getLatestByChannel(releases: ReleaseVersion[], channel: ReleaseChannel): ReleaseVersion | null {
  const filtered = releases.filter(r => r.channel === channel);
  if (filtered.length === 0) return null;
  return filtered.sort((a, b) => compareVersions(b.version, a.version))[0];
}

// ─── Feature Flags ───────────────────────────────────────────

export function createFeatureFlag(name: string, description: string, status: FeatureFlagStatus = 'disabled'): FeatureFlag {
  return { flagId: uid(), name, description, status, percentage: 0, userList: [], createdAt: now(), updatedAt: now() };
}

export function enableFeatureFlag(flag: FeatureFlag): FeatureFlag {
  return { ...flag, status: 'enabled', updatedAt: now() };
}

export function disableFeatureFlag(flag: FeatureFlag): FeatureFlag {
  return { ...flag, status: 'disabled', updatedAt: now() };
}

export function setFeatureFlagPercentage(flag: FeatureFlag, percentage: number): FeatureFlag {
  return { ...flag, status: 'percentage', percentage: Math.max(0, Math.min(100, percentage)), updatedAt: now() };
}

export function isFeatureEnabled(flag: FeatureFlag, userId?: string): boolean {
  switch (flag.status) {
    case 'enabled': return true;
    case 'disabled': return false;
    case 'percentage': return Math.random() * 100 < flag.percentage;
    case 'user_list': return userId ? flag.userList.includes(userId) : false;
  }
}

export function getDefaultFeatureFlags(): FeatureFlag[] {
  return [
    { ...createFeatureFlag('robotics_simulator', 'Robotics physics simulation'), status: 'disabled' },
    { ...createFeatureFlag('ai_circuit_v2', 'Next-gen AI circuit generator'), status: 'percentage', percentage: 10 },
    { ...createFeatureFlag('dark_mode', 'Dark mode theme'), status: 'enabled' },
    { ...createFeatureFlag('collaboration_v2', 'Real-time collaboration'), status: 'enabled' },
    { ...createFeatureFlag('pwa_offline', 'PWA offline mode'), status: 'enabled' },
    { ...createFeatureFlag('mobile_workspace', 'Mobile-optimized workspace'), status: 'enabled' },
  ];
}

// ─── Migrations ──────────────────────────────────────────────

export function createMigration(version: string, description: string, sql: string, reversible = true): MigrationStep {
  return { migrationId: uid(), version, description, sql, reversible, appliedAt: null, status: 'pending' };
}

export function applyMigration(migration: MigrationStep): MigrationStep {
  return { ...migration, status: 'applied', appliedAt: now() };
}

export function rollbackMigration(migration: MigrationStep): MigrationStep {
  if (!migration.reversible) return { ...migration, status: 'failed' };
  return { ...migration, status: 'rolled_back', appliedAt: null };
}

export function getPendingMigrations(migrations: MigrationStep[]): MigrationStep[] {
  return migrations.filter(m => m.status === 'pending');
}

export function validateMigrationOrder(migrations: MigrationStep[]): boolean {
  for (let i = 1; i < migrations.length; i++) {
    if (compareVersions(migrations[i].version, migrations[i - 1].version) < 0) return false;
  }
  return true;
}

// ─── Synchronizer ────────────────────────────────────────────

export class ReleaseManagementSynchronizer {
  private releases = new Map<string, ReleaseVersion>();
  private flags = new Map<string, FeatureFlag>();
  private migrations: MigrationStep[] = [];

  addRelease(r: ReleaseVersion) { this.releases.set(r.versionId, { ...r }); }
  getRelease(id: string) { const r = this.releases.get(id); return r ? { ...r } : undefined; }
  getAllReleases() { return Array.from(this.releases.values()).map(r => ({ ...r })); }

  addFlag(f: FeatureFlag) { this.flags.set(f.flagId, { ...f }); }
  getFlag(id: string) { const f = this.flags.get(id); return f ? { ...f } : undefined; }
  getAllFlags() { return Array.from(this.flags.values()).map(f => ({ ...f })); }

  addMigration(m: MigrationStep) { this.migrations.push({ ...m }); }
  getAllMigrations() { return this.migrations.map(m => ({ ...m })); }

  clear() { this.releases.clear(); this.flags.clear(); this.migrations = []; }

  toJSON() { return { releases: this.getAllReleases(), flags: this.getAllFlags(), migrations: this.getAllMigrations() }; }
  fromJSON(d: { releases?: ReleaseVersion[]; flags?: FeatureFlag[]; migrations?: MigrationStep[] }) {
    this.clear();
    (d.releases || []).forEach(r => this.addRelease(r));
    (d.flags || []).forEach(f => this.addFlag(f));
    (d.migrations || []).forEach(m => this.addMigration(m));
  }
  clone(): ReleaseManagementSynchronizer { const c = new ReleaseManagementSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
