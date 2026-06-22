/**
 * Phase 39A — Quota Runtime
 *
 * Usage quotas: users, projects, storage, uploads,
 * AI usage, device uploads, competitions, marketplace.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type QuotaMetric = 'users' | 'projects' | 'storage_gb' | 'uploads' | 'ai_credits' | 'device_uploads' | 'competitions' | 'marketplace_installs' | 'classrooms' | 'certificates';

export interface QuotaLimit {
  quotaId: string;
  tenantId: string;
  metric: QuotaMetric;
  limit: number;
  used: number;
  resetPeriod: 'daily' | 'monthly' | 'annual' | 'lifetime';
  lastReset: number;
  warningThreshold: number;
}

export interface QuotaUsageEvent {
  eventId: string;
  tenantId: string;
  metric: QuotaMetric;
  amount: number;
  timestamp: number;
  description: string;
}

export interface QuotaAlert {
  alertId: string;
  tenantId: string;
  metric: QuotaMetric;
  percentUsed: number;
  threshold: 'warning' | 'critical' | 'exceeded';
  timestamp: number;
}

// ─── Quota Operations ────────────────────────────────────────

export function createQuota(tenantId: string, metric: QuotaMetric, limit: number, resetPeriod: QuotaLimit['resetPeriod'] = 'monthly'): QuotaLimit {
  return { quotaId: uid(), tenantId, metric, limit, used: 0, resetPeriod, lastReset: now(), warningThreshold: 0.8 };
}

export function consumeQuota(quota: QuotaLimit, amount: number): QuotaLimit {
  return { ...quota, used: quota.used + amount };
}

export function resetQuota(quota: QuotaLimit): QuotaLimit {
  return { ...quota, used: 0, lastReset: now() };
}

export function isQuotaExceeded(quota: QuotaLimit): boolean {
  return quota.used >= quota.limit;
}

export function getQuotaPercent(quota: QuotaLimit): number {
  return quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;
}

export function checkQuotaAlert(quota: QuotaLimit): QuotaAlert | null {
  const pct = quota.used / quota.limit;
  if (pct >= 1.0) return { alertId: uid(), tenantId: quota.tenantId, metric: quota.metric, percentUsed: pct * 100, threshold: 'exceeded', timestamp: now() };
  if (pct >= 0.9) return { alertId: uid(), tenantId: quota.tenantId, metric: quota.metric, percentUsed: pct * 100, threshold: 'critical', timestamp: now() };
  if (pct >= quota.warningThreshold) return { alertId: uid(), tenantId: quota.tenantId, metric: quota.metric, percentUsed: pct * 100, threshold: 'warning', timestamp: now() };
  return null;
}

export function increaseQuotaLimit(quota: QuotaLimit, newLimit: number): QuotaLimit {
  return { ...quota, limit: Math.max(quota.limit, newLimit) };
}

export function trackQuotaUsage(tenantId: string, metric: QuotaMetric, amount: number, description = ''): QuotaUsageEvent {
  return { eventId: uid(), tenantId, metric, amount, timestamp: now(), description };
}

export function getDefaultQuotas(tenantId: string, plan: string): QuotaLimit[] {
  const limits: Record<string, Record<QuotaMetric, number>> = {
    free: { users: 5, projects: 10, storage_gb: 1, uploads: 50, ai_credits: 10, device_uploads: 5, competitions: 0, marketplace_installs: 5, classrooms: 0, certificates: 0 },
    starter: { users: 25, projects: 100, storage_gb: 10, uploads: 500, ai_credits: 100, device_uploads: 50, competitions: 1, marketplace_installs: 50, classrooms: 0, certificates: 10 },
    school: { users: 200, projects: 1000, storage_gb: 50, uploads: 5000, ai_credits: 500, device_uploads: 200, competitions: 5, marketplace_installs: 200, classrooms: 20, certificates: 200 },
    district: { users: 5000, projects: 50000, storage_gb: 500, uploads: 50000, ai_credits: 5000, device_uploads: 2000, competitions: 50, marketplace_installs: 5000, classrooms: 500, certificates: 5000 },
    enterprise: { users: 50000, projects: 500000, storage_gb: 5000, uploads: 500000, ai_credits: 50000, device_uploads: 20000, competitions: 500, marketplace_installs: 50000, classrooms: 5000, certificates: 50000 },
  };
  const planLimits = limits[plan] || limits['free'];
  return (Object.entries(planLimits) as [QuotaMetric, number][]).map(([metric, limit]) => createQuota(tenantId, metric, limit, 'monthly'));
}

// ─── Synchronizer ────────────────────────────────────────────

export class QuotaSynchronizer {
  private quotas = new Map<string, QuotaLimit>();
  private events: QuotaUsageEvent[] = [];
  private alerts: QuotaAlert[] = [];

  addQuota(q: QuotaLimit) { this.quotas.set(`${q.tenantId}:${q.metric}`, { ...q }); }
  getQuota(tenantId: string, metric: QuotaMetric) { const q = this.quotas.get(`${tenantId}:${metric}`); return q ? { ...q } : undefined; }
  getTenantQuotas(tenantId: string) { return Array.from(this.quotas.values()).filter(q => q.tenantId === tenantId).map(q => ({ ...q })); }

  addEvent(e: QuotaUsageEvent) { this.events.push({ ...e }); if (this.events.length > 50000) this.events.shift(); }
  addAlert(a: QuotaAlert) { this.alerts.push({ ...a }); }
  getAlerts(tenantId: string) { return this.alerts.filter(a => a.tenantId === tenantId).map(a => ({ ...a })); }

  clear() { this.quotas.clear(); this.events = []; this.alerts = []; }

  toJSON() { return { quotas: Array.from(this.quotas.values()), alerts: this.alerts.slice(-100) }; }
  fromJSON(d: { quotas?: QuotaLimit[]; alerts?: QuotaAlert[] }) {
    this.clear();
    (d.quotas || []).forEach(q => this.addQuota(q));
    (d.alerts || []).forEach(a => this.addAlert(a));
  }
  clone(): QuotaSynchronizer { const c = new QuotaSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
