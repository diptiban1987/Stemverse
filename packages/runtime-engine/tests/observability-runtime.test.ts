/**
 * Phase 37B — Observability Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createMetric, incrementCounter, setGauge, recordHistogram,
  startSpan, endSpan, addSpanTag,
  createLogEntry, filterLogsByLevel,
  createAlertRule, evaluateAlert, acknowledgeAlert,
  createHealthCheck, runHealthCheck, getOverallHealth,
  getDefaultHealthChecks, ObservabilitySynchronizer,
} from '../src/stage/observability-runtime';

describe('Phase 37B: Observability', () => {
  it('manages metrics over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let counter = createMetric('requests', 'counter', 0);
      counter = incrementCounter(counter, 5);
      expect(counter.value).toBe(5);
      let gauge = createMetric('cpu', 'gauge', 0);
      gauge = setGauge(gauge, 72);
      expect(gauge.value).toBe(72);
      const hist = recordHistogram(createMetric('latency', 'histogram', 0), 150);
      expect(hist.value).toBe(150);
    }
  });

  it('manages tracing over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let span = startSpan('api.request', 'web-server');
      span = addSpanTag(span, 'method', 'GET');
      span = endSpan(span);
      expect(span.status).toBe('ok');
      expect(span.duration).toBeGreaterThanOrEqual(0);
      const errorSpan = endSpan(startSpan('db.query', 'database'), true);
      expect(errorSpan.status).toBe('error');
    }
  });

  it('manages logging over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const logs = [
        createLogEntry('debug', 'Debug msg', 'api'),
        createLogEntry('info', 'Info msg', 'api'),
        createLogEntry('warn', 'Warn msg', 'api'),
        createLogEntry('error', 'Error msg', 'api'),
        createLogEntry('fatal', 'Fatal msg', 'api'),
      ];
      expect(filterLogsByLevel(logs, 'warn')).toHaveLength(3);
      expect(filterLogsByLevel(logs, 'error')).toHaveLength(2);
    }
  });

  it('manages alerts over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const rule = createAlertRule('High CPU', 'cpu', 'gt', 90, 'critical');
      const event = evaluateAlert(rule, 95);
      expect(event).not.toBeNull();
      expect(event!.severity).toBe('critical');
      const acked = acknowledgeAlert(event!);
      expect(acked.acknowledged).toBe(true);
      expect(evaluateAlert(rule, 50)).toBeNull();
    }
  });

  it('manages health checks over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const checks = getDefaultHealthChecks();
      expect(checks).toHaveLength(6);
      expect(getOverallHealth(checks)).toBe('healthy');
      const updated = runHealthCheck(checks[0], false, 2000);
      expect(updated.status).toBe('unhealthy');
      expect(getOverallHealth([...checks.slice(1), updated])).toBe('unhealthy');
      const degraded = runHealthCheck(checks[1], true, 1500);
      expect(degraded.status).toBe('degraded');
    }
  });

  it('ObservabilitySynchronizer lifecycle', () => {
    const sync = new ObservabilitySynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addMetric(createMetric(`m${i}`, 'counter', i));
      sync.addSpan(startSpan(`op${i}`, 'svc'));
      sync.addLog(createLogEntry('info', `Log ${i}`, 'svc'));
    }
    expect(sync.getAllMetrics()).toHaveLength(100);
    const clone = sync.clone();
    expect(clone.getAllMetrics()).toHaveLength(100);
    sync.clear();
    expect(sync.getAllMetrics()).toHaveLength(0);
  });
});
