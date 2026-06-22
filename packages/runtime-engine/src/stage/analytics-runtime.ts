/**
 * Phase 38A — Analytics Runtime
 *
 * Event tracking, page views, workspace/simulator/marketplace/
 * competition/learning/device/AI/collaboration actions.
 * Event batching, aggregation, retention.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type AnalyticsEventCategory =
  | 'page_view' | 'workspace' | 'simulator' | 'marketplace'
  | 'competition' | 'learning' | 'device' | 'ai' | 'collaboration'
  | 'auth' | 'system';

export interface AnalyticsEvent {
  eventId: string;
  category: AnalyticsEventCategory;
  action: string;
  label: string;
  value: number;
  userId: string | null;
  sessionId: string;
  tenantId: string | null;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface EventBatch {
  batchId: string;
  events: AnalyticsEvent[];
  createdAt: number;
  flushedAt: number | null;
  size: number;
}

export interface EventAggregation {
  aggregationId: string;
  category: AnalyticsEventCategory;
  action: string;
  count: number;
  totalValue: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  uniqueUsers: number;
  period: 'hour' | 'day' | 'week' | 'month';
  periodStart: number;
  periodEnd: number;
}

export interface EventRetentionPolicy {
  category: AnalyticsEventCategory;
  rawRetentionDays: number;
  aggregatedRetentionDays: number;
}

// ─── Event Tracking ──────────────────────────────────────────

function createEvent(category: AnalyticsEventCategory, action: string, label: string, value: number, userId: string | null, sessionId: string, tenantId: string | null = null, metadata: Record<string, unknown> = {}): AnalyticsEvent {
  return { eventId: uid(), category, action, label, value, userId, sessionId, tenantId, metadata, timestamp: now() };
}

export function trackEvent(category: AnalyticsEventCategory, action: string, label = '', value = 1, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent(category, action, label, value, userId, sessionId);
}

export function trackPageView(path: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('page_view', 'view', path, 1, userId, sessionId);
}

export function trackWorkspaceAction(action: string, projectId: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('workspace', action, projectId, 1, userId, sessionId, null, { projectId });
}

export function trackSimulatorAction(action: string, componentType: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('simulator', action, componentType, 1, userId, sessionId, null, { componentType });
}

export function trackMarketplaceAction(action: string, assetId: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('marketplace', action, assetId, 1, userId, sessionId, null, { assetId });
}

export function trackCompetitionAction(action: string, competitionId: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('competition', action, competitionId, 1, userId, sessionId, null, { competitionId });
}

export function trackLearningAction(action: string, lessonId: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('learning', action, lessonId, 1, userId, sessionId, null, { lessonId });
}

export function trackDeviceAction(action: string, boardType: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('device', action, boardType, 1, userId, sessionId, null, { boardType });
}

export function trackAIAction(action: string, model: string, tokens = 0, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('ai', action, model, tokens, userId, sessionId, null, { model, tokens });
}

export function trackCollaborationAction(action: string, roomId: string, userId: string | null = null, sessionId = 'anon'): AnalyticsEvent {
  return createEvent('collaboration', action, roomId, 1, userId, sessionId, null, { roomId });
}

// ─── Event Batching ──────────────────────────────────────────

export function createEventBatch(events: AnalyticsEvent[]): EventBatch {
  return { batchId: uid(), events: [...events], createdAt: now(), flushedAt: null, size: events.length };
}

export function flushBatch(batch: EventBatch): EventBatch {
  return { ...batch, flushedAt: now() };
}

export function mergeBatches(a: EventBatch, b: EventBatch): EventBatch {
  return createEventBatch([...a.events, ...b.events]);
}

// ─── Event Aggregation ───────────────────────────────────────

export function aggregateEvents(events: AnalyticsEvent[], category: AnalyticsEventCategory, action: string, period: EventAggregation['period'], periodStart: number, periodEnd: number): EventAggregation {
  const filtered = events.filter(e => e.category === category && e.action === action && e.timestamp >= periodStart && e.timestamp <= periodEnd);
  const values = filtered.map(e => e.value);
  const userSet = new Set(filtered.map(e => e.userId).filter(Boolean));
  return {
    aggregationId: uid(), category, action, count: filtered.length,
    totalValue: values.reduce((s, v) => s + v, 0),
    avgValue: values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0,
    minValue: values.length > 0 ? Math.min(...values) : 0,
    maxValue: values.length > 0 ? Math.max(...values) : 0,
    uniqueUsers: userSet.size, period, periodStart, periodEnd,
  };
}

export function getEventsByCategory(events: AnalyticsEvent[], category: AnalyticsEventCategory): AnalyticsEvent[] {
  return events.filter(e => e.category === category);
}

export function getEventsByUser(events: AnalyticsEvent[], userId: string): AnalyticsEvent[] {
  return events.filter(e => e.userId === userId);
}

export function getEventCountByAction(events: AnalyticsEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.action] = (counts[e.action] || 0) + 1; });
  return counts;
}

// ─── Retention ───────────────────────────────────────────────

export function getDefaultRetention(): EventRetentionPolicy[] {
  return [
    { category: 'page_view', rawRetentionDays: 30, aggregatedRetentionDays: 365 },
    { category: 'workspace', rawRetentionDays: 90, aggregatedRetentionDays: 730 },
    { category: 'simulator', rawRetentionDays: 90, aggregatedRetentionDays: 730 },
    { category: 'marketplace', rawRetentionDays: 180, aggregatedRetentionDays: 1095 },
    { category: 'competition', rawRetentionDays: 365, aggregatedRetentionDays: 1825 },
    { category: 'learning', rawRetentionDays: 365, aggregatedRetentionDays: 1825 },
    { category: 'device', rawRetentionDays: 90, aggregatedRetentionDays: 365 },
    { category: 'ai', rawRetentionDays: 90, aggregatedRetentionDays: 365 },
    { category: 'collaboration', rawRetentionDays: 30, aggregatedRetentionDays: 365 },
    { category: 'auth', rawRetentionDays: 365, aggregatedRetentionDays: 1825 },
    { category: 'system', rawRetentionDays: 30, aggregatedRetentionDays: 365 },
  ];
}

export function evictExpiredEvents(events: AnalyticsEvent[], retentionDays: number): AnalyticsEvent[] {
  const cutoff = now() - retentionDays * 86400000;
  return events.filter(e => e.timestamp >= cutoff);
}

// ─── DAU / WAU / MAU ─────────────────────────────────────────

export function calculateDAU(events: AnalyticsEvent[], date: number): number {
  const dayStart = date - (date % 86400000);
  const dayEnd = dayStart + 86400000;
  return new Set(events.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd).map(e => e.userId).filter(Boolean)).size;
}

export function calculateWAU(events: AnalyticsEvent[], weekEnd: number): number {
  const weekStart = weekEnd - 7 * 86400000;
  return new Set(events.filter(e => e.timestamp >= weekStart && e.timestamp < weekEnd).map(e => e.userId).filter(Boolean)).size;
}

export function calculateMAU(events: AnalyticsEvent[], monthEnd: number): number {
  const monthStart = monthEnd - 30 * 86400000;
  return new Set(events.filter(e => e.timestamp >= monthStart && e.timestamp < monthEnd).map(e => e.userId).filter(Boolean)).size;
}

// ─── Synchronizer ────────────────────────────────────────────

export class AnalyticsSynchronizer {
  private events: AnalyticsEvent[] = [];
  private aggregations = new Map<string, EventAggregation>();
  private batches = new Map<string, EventBatch>();

  addEvent(e: AnalyticsEvent) { this.events.push({ ...e }); if (this.events.length > 100000) this.events.shift(); }
  getEvents(n = 100) { return this.events.slice(-n).map(e => ({ ...e })); }
  getEventCount() { return this.events.length; }
  getEventsByCategory(cat: AnalyticsEventCategory) { return this.events.filter(e => e.category === cat).map(e => ({ ...e })); }

  addAggregation(a: EventAggregation) { this.aggregations.set(a.aggregationId, { ...a }); }
  getAllAggregations() { return Array.from(this.aggregations.values()).map(a => ({ ...a })); }

  addBatch(b: EventBatch) { this.batches.set(b.batchId, { ...b }); }
  getBatch(id: string) { const b = this.batches.get(id); return b ? { ...b } : undefined; }

  clear() { this.events = []; this.aggregations.clear(); this.batches.clear(); }

  toJSON() { return { events: this.getEvents(10000), aggregations: this.getAllAggregations() }; }
  fromJSON(d: { events?: AnalyticsEvent[]; aggregations?: EventAggregation[] }) {
    this.clear();
    (d.events || []).forEach(e => this.addEvent(e));
    (d.aggregations || []).forEach(a => this.addAggregation(a));
  }
  clone(): AnalyticsSynchronizer { const c = new AnalyticsSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
