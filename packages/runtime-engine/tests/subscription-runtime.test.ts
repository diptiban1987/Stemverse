/**
 * Phase 39A — Subscription Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  PLAN_CATALOG, getPlanDefinition, getAllPlans,
  createSubscription, renewSubscription, cancelSubscription,
  pauseSubscription, upgradeSubscription, convertTrial, isTrialExpired,
  createInvoice, markInvoicePaid, markInvoiceOverdue, createLineItem,
  SubscriptionSynchronizer,
} from '../src/stage/subscription-runtime';

describe('Phase 39A: Subscription Runtime', () => {
  it('has 7 plans', () => {
    expect(PLAN_CATALOG).toHaveLength(7);
    const plans = getAllPlans();
    expect(plans).toHaveLength(7);
    expect(plans.map(p => p.plan)).toEqual(['free', 'starter', 'school', 'district', 'enterprise', 'lifetime', 'trial']);
  });

  it('creates subscriptions over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const sub = createSubscription(`c${i}`, 'school', 'annual');
      expect(sub.plan).toBe('school');
      expect(sub.status).toBe('trialing');
      expect(sub.trialStart).not.toBeNull();
      const free = createSubscription(`c${i}`, 'free');
      expect(free.status).toBe('active');
      expect(free.trialStart).toBeNull();
    }
  });

  it('subscription lifecycle over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let sub = createSubscription(`c${i}`, 'school');
      sub = convertTrial(sub);
      expect(sub.status).toBe('active');
      sub = pauseSubscription(sub);
      expect(sub.status).toBe('paused');
      sub = renewSubscription(sub);
      expect(sub.status).toBe('active');
      sub = cancelSubscription(sub);
      expect(sub.status).toBe('cancelled');
      expect(sub.cancelledAt).not.toBeNull();
    }
  });

  it('plan upgrades over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let sub = createSubscription(`c${i}`, 'starter');
      sub = upgradeSubscription(sub, 'enterprise');
      expect(sub.plan).toBe('enterprise');
      const def = getPlanDefinition('enterprise');
      expect(sub.seatsLimit).toBe(def.maxSeats);
    }
  });

  it('invoicing over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const sub = createSubscription(`c${i}`, 'school');
      const items = [createLineItem('School Plan - Annual', 1, 499), createLineItem('Extra seats x10', 10, 5)];
      let inv = createInvoice(sub, items);
      expect(inv.amount).toBe(549);
      expect(inv.status).toBe('draft');
      inv = markInvoicePaid(inv);
      expect(inv.status).toBe('paid');
      inv = markInvoiceOverdue(createInvoice(sub, items));
      expect(inv.status).toBe('overdue');
    }
  });

  it('trial expiration detection', () => {
    const sub = createSubscription('c1', 'school');
    expect(isTrialExpired(sub)).toBe(false);
    const expired = { ...sub, trialEnd: Date.now() - 1000 };
    expect(isTrialExpired(expired)).toBe(true);
  });

  it('SubscriptionSynchronizer lifecycle', () => {
    const sync = new SubscriptionSynchronizer();
    for (let i = 0; i < 50; i++) sync.addSubscription(createSubscription(`c${i}`, 'school'));
    expect(sync.getAllSubscriptions()).toHaveLength(50);
    const clone = sync.clone();
    expect(clone.getAllSubscriptions()).toHaveLength(50);
    sync.clear();
    expect(sync.getAllSubscriptions()).toHaveLength(0);
  });
});
