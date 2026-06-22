/**
 * Phase 39A — Licensing Runtime
 *
 * License creation, activation, suspension, renewal, upgrade,
 * downgrade, expiration, transfer. Seat and usage tracking.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type LicenseType = 'free' | 'starter' | 'school' | 'district' | 'enterprise' | 'lifetime' | 'trial';
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'cancelled' | 'pending' | 'transferred';

export interface License {
  licenseId: string;
  licenseKey: string;
  type: LicenseType;
  status: LicenseStatus;
  organizationId: string;
  organizationName: string;
  maxSeats: number;
  usedSeats: number;
  features: string[];
  issuedAt: number;
  activatedAt: number | null;
  expiresAt: number;
  renewedAt: number | null;
  suspendedAt: number | null;
  transferredFrom: string | null;
  metadata: Record<string, unknown>;
}

export interface LicenseUsageRecord {
  recordId: string;
  licenseId: string;
  metric: string;
  value: number;
  limit: number;
  timestamp: number;
}

// ─── License Defaults ────────────────────────────────────────

const LICENSE_DEFAULTS: Record<LicenseType, { maxSeats: number; durationDays: number; features: string[] }> = {
  free: { maxSeats: 5, durationDays: 36500, features: ['simulator', 'basic_projects'] },
  starter: { maxSeats: 25, durationDays: 365, features: ['simulator', 'projects', 'marketplace_browse'] },
  school: { maxSeats: 200, durationDays: 365, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates'] },
  district: { maxSeats: 5000, durationDays: 365, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates', 'analytics', 'multi_school', 'branding'] },
  enterprise: { maxSeats: 50000, durationDays: 365, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions', 'certificates', 'analytics', 'multi_school', 'branding', 'api', 'sso', 'white_label', 'priority_support'] },
  lifetime: { maxSeats: 1, durationDays: 36500, features: ['simulator', 'projects', 'marketplace', 'competitions', 'certificates'] },
  trial: { maxSeats: 50, durationDays: 30, features: ['simulator', 'projects', 'classrooms', 'marketplace', 'competitions'] },
};

export function getLicenseDefaults(type: LicenseType) { return { ...LICENSE_DEFAULTS[type], features: [...LICENSE_DEFAULTS[type].features] }; }

// ─── License Operations ──────────────────────────────────────

export function createLicense(type: LicenseType, organizationId: string, organizationName: string, customSeats?: number): License {
  const defaults = getLicenseDefaults(type);
  return {
    licenseId: uid(), licenseKey: `SV-${type.toUpperCase()}-${uid().slice(0, 8).toUpperCase()}`,
    type, status: 'pending', organizationId, organizationName,
    maxSeats: customSeats || defaults.maxSeats, usedSeats: 0,
    features: defaults.features,
    issuedAt: now(), activatedAt: null,
    expiresAt: now() + defaults.durationDays * 86400000,
    renewedAt: null, suspendedAt: null, transferredFrom: null, metadata: {},
  };
}

export function activateLicense(license: License): License {
  if (license.status !== 'pending') return license;
  return { ...license, status: 'active', activatedAt: now() };
}

export function suspendLicense(license: License): License {
  if (license.status !== 'active') return license;
  return { ...license, status: 'suspended', suspendedAt: now() };
}

export function renewLicense(license: License, additionalDays = 365): License {
  return { ...license, status: 'active', expiresAt: Math.max(license.expiresAt, now()) + additionalDays * 86400000, renewedAt: now(), suspendedAt: null };
}

export function upgradeLicense(license: License, newType: LicenseType): License {
  const types: LicenseType[] = ['free', 'starter', 'school', 'district', 'enterprise'];
  if (types.indexOf(newType) <= types.indexOf(license.type)) return license;
  const defaults = getLicenseDefaults(newType);
  return { ...license, type: newType, maxSeats: Math.max(license.maxSeats, defaults.maxSeats), features: defaults.features };
}

export function downgradeLicense(license: License, newType: LicenseType): License {
  const types: LicenseType[] = ['free', 'starter', 'school', 'district', 'enterprise'];
  if (types.indexOf(newType) >= types.indexOf(license.type)) return license;
  const defaults = getLicenseDefaults(newType);
  return { ...license, type: newType, maxSeats: defaults.maxSeats, features: defaults.features };
}

export function expireLicense(license: License): License {
  return { ...license, status: 'expired' };
}

export function transferLicense(license: License, newOrgId: string, newOrgName: string): License {
  return { ...license, organizationId: newOrgId, organizationName: newOrgName, status: 'transferred', transferredFrom: license.organizationId };
}

export function addSeat(license: License): License {
  if (license.usedSeats >= license.maxSeats) return license;
  return { ...license, usedSeats: license.usedSeats + 1 };
}

export function removeSeat(license: License): License {
  if (license.usedSeats <= 0) return license;
  return { ...license, usedSeats: license.usedSeats - 1 };
}

export function isLicenseValid(license: License): boolean {
  return license.status === 'active' && now() < license.expiresAt;
}

export function hasFeature(license: License, feature: string): boolean {
  return license.features.includes(feature);
}

export function trackUsage(licenseId: string, metric: string, value: number, limit: number): LicenseUsageRecord {
  return { recordId: uid(), licenseId, metric, value, limit, timestamp: now() };
}

export function isOverQuota(record: LicenseUsageRecord): boolean {
  return record.value > record.limit;
}

// ─── Synchronizer ────────────────────────────────────────────

export class LicensingSynchronizer {
  private licenses = new Map<string, License>();
  private usage: LicenseUsageRecord[] = [];

  addLicense(l: License) { this.licenses.set(l.licenseId, { ...l }); }
  getLicense(id: string) { const l = this.licenses.get(id); return l ? { ...l } : undefined; }
  getAllLicenses() { return Array.from(this.licenses.values()).map(l => ({ ...l })); }
  getLicensesByType(type: LicenseType) { return this.getAllLicenses().filter(l => l.type === type); }

  addUsage(r: LicenseUsageRecord) { this.usage.push({ ...r }); if (this.usage.length > 50000) this.usage.shift(); }
  getUsage(licenseId: string) { return this.usage.filter(u => u.licenseId === licenseId).map(u => ({ ...u })); }

  clear() { this.licenses.clear(); this.usage = []; }

  toJSON() { return { licenses: this.getAllLicenses(), usage: this.usage.slice(-1000).map(u => ({ ...u })) }; }
  fromJSON(d: { licenses?: License[]; usage?: LicenseUsageRecord[] }) {
    this.clear();
    (d.licenses || []).forEach(l => this.addLicense(l));
    (d.usage || []).forEach(u => this.addUsage(u));
  }
  clone(): LicensingSynchronizer { const c = new LicensingSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
