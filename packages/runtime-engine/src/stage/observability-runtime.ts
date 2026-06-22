/**
 * Phase 37B — Observability Runtime
 *
 * Metrics, tracing, logs, alerts, health checks,
 * Prometheus/Grafana/OpenTelemetry/Sentry abstractions.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'fatal';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface MetricEntry {
  metricId: string;
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  status: 'ok' | 'error';
  tags: Record<string, string>;
}

export interface LogEntry {
  logId: string;
  level: LogLevel;
  message: string;
  service: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  traceId: string | null;
}

export interface AlertRule {
  ruleId: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs: number;
  lastTriggered: number | null;
}

export interface AlertEvent {
  eventId: string;
  ruleId: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface HealthCheck {
  checkId: string;
  name: string;
  status: HealthStatus;
  responseTimeMs: number;
  lastChecked: number;
  details: string;
}

// ─── Metrics ─────────────────────────────────────────────────

export function createMetric(name: string, type: MetricType, value: number, labels: Record<string, string> = {}): MetricEntry {
  return { metricId: uid(), name, type, value, labels, timestamp: now() };
}

export function incrementCounter(metric: MetricEntry, amount = 1): MetricEntry {
  return { ...metric, value: metric.value + amount, timestamp: now() };
}

export function setGauge(metric: MetricEntry, value: number): MetricEntry {
  return { ...metric, value, timestamp: now() };
}

export function recordHistogram(metric: MetricEntry, value: number): MetricEntry {
  return { ...metric, value, timestamp: now() };
}

// ─── Tracing ─────────────────────────────────────────────────

export function startSpan(operationName: string, serviceName: string, parentSpanId: string | null = null): TraceSpan {
  return {
    traceId: uid(), spanId: uid(), parentSpanId, operationName, serviceName,
    startTime: now(), endTime: null, duration: 0, status: 'ok', tags: {},
  };
}

export function endSpan(span: TraceSpan, error = false): TraceSpan {
  const endTime = now();
  return { ...span, endTime, duration: endTime - span.startTime, status: error ? 'error' : 'ok' };
}

export function addSpanTag(span: TraceSpan, key: string, value: string): TraceSpan {
  return { ...span, tags: { ...span.tags, [key]: value } };
}

// ─── Logging ─────────────────────────────────────────────────

export function createLogEntry(level: LogLevel, message: string, service: string, metadata: Record<string, unknown> = {}, traceId: string | null = null): LogEntry {
  return { logId: uid(), level, message, service, timestamp: now(), metadata, traceId };
}

export function filterLogsByLevel(logs: LogEntry[], minLevel: LogLevel): LogEntry[] {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
  const minIdx = levels.indexOf(minLevel);
  return logs.filter(l => levels.indexOf(l.level) >= minIdx);
}

// ─── Alerts ──────────────────────────────────────────────────

export function createAlertRule(name: string, metric: string, condition: AlertRule['condition'], threshold: number, severity: AlertSeverity): AlertRule {
  return { ruleId: uid(), name, metric, condition, threshold, severity, enabled: true, cooldownMs: 300000, lastTriggered: null };
}

export function evaluateAlert(rule: AlertRule, currentValue: number): AlertEvent | null {
  if (!rule.enabled) return null;
  if (rule.lastTriggered && now() - rule.lastTriggered < rule.cooldownMs) return null;
  let triggered = false;
  switch (rule.condition) {
    case 'gt': triggered = currentValue > rule.threshold; break;
    case 'lt': triggered = currentValue < rule.threshold; break;
    case 'eq': triggered = currentValue === rule.threshold; break;
    case 'gte': triggered = currentValue >= rule.threshold; break;
    case 'lte': triggered = currentValue <= rule.threshold; break;
  }
  if (!triggered) return null;
  return { eventId: uid(), ruleId: rule.ruleId, severity: rule.severity, message: `${rule.name}: ${currentValue} ${rule.condition} ${rule.threshold}`, value: currentValue, timestamp: now(), acknowledged: false };
}

export function acknowledgeAlert(event: AlertEvent): AlertEvent {
  return { ...event, acknowledged: true };
}

// ─── Health Checks ───────────────────────────────────────────

export function createHealthCheck(name: string, status: HealthStatus = 'unknown', responseTimeMs = 0, details = ''): HealthCheck {
  return { checkId: uid(), name, status, responseTimeMs, lastChecked: now(), details };
}

export function runHealthCheck(check: HealthCheck, isHealthy: boolean, responseTimeMs: number): HealthCheck {
  return { ...check, status: isHealthy ? (responseTimeMs > 1000 ? 'degraded' : 'healthy') : 'unhealthy', responseTimeMs, lastChecked: now() };
}

export function getOverallHealth(checks: HealthCheck[]): HealthStatus {
  if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
  if (checks.some(c => c.status === 'degraded')) return 'degraded';
  if (checks.every(c => c.status === 'healthy')) return 'healthy';
  return 'unknown';
}

export function getDefaultHealthChecks(): HealthCheck[] {
  return [
    createHealthCheck('Database', 'healthy', 5, 'Connected'),
    createHealthCheck('Redis', 'healthy', 2, 'Connected'),
    createHealthCheck('API Server', 'healthy', 10, 'Responding'),
    createHealthCheck('WebSocket', 'healthy', 8, 'Connected'),
    createHealthCheck('Storage', 'healthy', 15, 'Available'),
    createHealthCheck('Auth Service', 'healthy', 12, 'Active'),
  ];
}

// ─── Synchronizer ────────────────────────────────────────────

export class ObservabilitySynchronizer {
  private metrics = new Map<string, MetricEntry>();
  private spans: TraceSpan[] = [];
  private logs: LogEntry[] = [];
  private alerts = new Map<string, AlertRule>();
  private events: AlertEvent[] = [];
  private checks = new Map<string, HealthCheck>();

  addMetric(m: MetricEntry) { this.metrics.set(m.name, { ...m }); }
  getMetric(name: string) { const m = this.metrics.get(name); return m ? { ...m } : undefined; }
  getAllMetrics() { return Array.from(this.metrics.values()).map(m => ({ ...m })); }

  addSpan(s: TraceSpan) { this.spans.push({ ...s }); if (this.spans.length > 10000) this.spans.shift(); }
  getRecentSpans(n = 50) { return this.spans.slice(-n).map(s => ({ ...s })); }

  addLog(l: LogEntry) { this.logs.push({ ...l }); if (this.logs.length > 10000) this.logs.shift(); }
  getRecentLogs(n = 50) { return this.logs.slice(-n).map(l => ({ ...l })); }

  addAlertRule(r: AlertRule) { this.alerts.set(r.ruleId, { ...r }); }
  getAllAlertRules() { return Array.from(this.alerts.values()).map(r => ({ ...r })); }

  addEvent(e: AlertEvent) { this.events.push({ ...e }); }
  getRecentEvents(n = 50) { return this.events.slice(-n).map(e => ({ ...e })); }

  addHealthCheck(c: HealthCheck) { this.checks.set(c.checkId, { ...c }); }
  getAllHealthChecks() { return Array.from(this.checks.values()).map(c => ({ ...c })); }

  clear() { this.metrics.clear(); this.spans = []; this.logs = []; this.alerts.clear(); this.events = []; this.checks.clear(); }

  toJSON() {
    return { metrics: this.getAllMetrics(), spans: this.getRecentSpans(100), logs: this.getRecentLogs(100), alertRules: this.getAllAlertRules(), events: this.getRecentEvents(100), healthChecks: this.getAllHealthChecks() };
  }
  fromJSON(d: { metrics?: MetricEntry[]; spans?: TraceSpan[]; logs?: LogEntry[]; alertRules?: AlertRule[]; events?: AlertEvent[]; healthChecks?: HealthCheck[] }) {
    this.clear();
    (d.metrics || []).forEach(m => this.addMetric(m));
    (d.spans || []).forEach(s => this.addSpan(s));
    (d.logs || []).forEach(l => this.addLog(l));
    (d.alertRules || []).forEach(r => this.addAlertRule(r));
    (d.events || []).forEach(e => this.addEvent(e));
    (d.healthChecks || []).forEach(c => this.addHealthCheck(c));
  }
  clone(): ObservabilitySynchronizer { const c = new ObservabilitySynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
