/**
 * Phase 39A — Quota Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createQuota, consumeQuota, resetQuota, isQuotaExceeded,
  getQuotaPercent, checkQuotaAlert, increaseQuotaLimit,
  trackQuotaUsage, getDefaultQuotas,
  QuotaSynchronizer,
} from '../src/stage/quota-runtime';

describe('Phase 39A: Quota Runtime', () => {
  it('creates and consumes quotas over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let q = createQuota('t1', 'projects', 100);
      expect(q.used).toBe(0);
      q = consumeQuota(q, 50);
      expect(q.used).toBe(50);
      expect(isQuotaExceeded(q)).toBe(false);
      q = consumeQuota(q, 60);
      expect(isQuotaExceeded(q)).toBe(true);
    }
  });

  it('quota percent and alerts over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let q = createQuota('t1', 'storage_gb', 100);
      q = consumeQuota(q, 50);
      expect(getQuotaPercent(q)).toBe(50);
      expect(checkQuotaAlert(q)).toBeNull();
      q = consumeQuota(q, 35);
      let alert = checkQuotaAlert(q);
      expect(alert?.threshold).toBe('warning');
      q = consumeQuota(q, 10);
      alert = checkQuotaAlert(q);
      expect(alert?.threshold).toBe('critical');
      q = consumeQuota(q, 10);
      alert = checkQuotaAlert(q);
      expect(alert?.threshold).toBe('exceeded');
    }
  });

  it('reset and increase over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let q = createQuota('t1', 'ai_credits', 100);
      q = consumeQuota(q, 80);
      q = resetQuota(q);
      expect(q.used).toBe(0);
      q = increaseQuotaLimit(q, 200);
      expect(q.limit).toBe(200);
    }
  });

  it('tracks usage events over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const event = trackQuotaUsage('t1', 'device_uploads', 5, 'Upload firmware');
      expect(event.metric).toBe('device_uploads');
      expect(event.amount).toBe(5);
    }
  });

  it('default quotas by plan', () => {
    const plans = ['free', 'starter', 'school', 'district', 'enterprise'];
    plans.forEach(plan => {
      const quotas = getDefaultQuotas('t1', plan);
      expect(quotas).toHaveLength(10);
      const users = quotas.find(q => q.metric === 'users');
      expect(users).toBeDefined();
    });
  });

  it('QuotaSynchronizer lifecycle', () => {
    const sync = new QuotaSynchronizer();
    const quotas = getDefaultQuotas('t1', 'school');
    quotas.forEach(q => sync.addQuota(q));
    expect(sync.getTenantQuotas('t1')).toHaveLength(10);
    const clone = sync.clone();
    expect(clone.getTenantQuotas('t1')).toHaveLength(10);
    sync.clear();
    expect(sync.getTenantQuotas('t1')).toHaveLength(0);
  });
});
