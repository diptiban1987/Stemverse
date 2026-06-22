/**
 * Phase 39A — Customer Success Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createAccount, updateHealthScore, updateEngagementScore, calculateHealthScore,
  createContact, markContacted,
  createContract, activateContract, renewContract, isContractExpiring, getRenewalForecast,
  CustomerSuccessSynchronizer,
} from '../src/stage/customer-success-runtime';

describe('Phase 39A: Customer Success Runtime', () => {
  it('creates accounts for all tiers over 500 iterations', () => {
    const tiers = ['free', 'starter', 'school', 'district', 'enterprise'] as const;
    for (let i = 0; i < 500; i++) {
      tiers.forEach(tier => {
        const acc = createAccount(`Org ${i}`, tier, 'India', 'education');
        expect(acc.tier).toBe(tier);
        expect(acc.healthScore).toBe(100);
        expect(acc.healthLevel).toBe('healthy');
      });
    }
  });

  it('health score management over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let acc = createAccount('Test', 'school');
      acc = updateHealthScore(acc, 80);
      expect(acc.healthLevel).toBe('healthy');
      acc = updateHealthScore(acc, 50);
      expect(acc.healthLevel).toBe('at_risk');
      acc = updateHealthScore(acc, 20);
      expect(acc.healthLevel).toBe('critical');
    }
  });

  it('health score calculation over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const good = calculateHealthScore(10, 10, 5, 0);
      expect(good).toBeGreaterThan(70);
      const bad = calculateHealthScore(0, 0, 0, 5);
      expect(bad).toBeLessThan(30);
    }
  });

  it('engagement scores over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let acc = createAccount('Test', 'school');
      acc = updateEngagementScore(acc, 75);
      expect(acc.engagementScore).toBe(75);
      acc = updateEngagementScore(acc, 150);
      expect(acc.engagementScore).toBe(100); // capped
    }
  });

  it('contact management over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let contact = createContact('acc1', `Contact ${i}`, `c${i}@school.edu`, 'admin', i === 0);
      expect(contact.isPrimary).toBe(i === 0);
      contact = markContacted(contact);
      expect(contact.lastContactedAt).not.toBeNull();
    }
  });

  it('contract lifecycle over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let contract = createContract('acc1', 2999, 365, 'USD', true);
      expect(contract.status).toBe('draft');
      contract = activateContract(contract, 'Admin');
      expect(contract.status).toBe('active');
      expect(contract.signedBy).toBe('Admin');
      contract = renewContract(contract);
      expect(contract.status).toBe('renewed');
    }
  });

  it('contract expiring detection', () => {
    let contract = createContract('acc1', 999);
    contract = activateContract(contract, 'Admin');
    expect(isContractExpiring(contract, 30)).toBe(false);
    const expiring = { ...contract, endDate: Date.now() + 10 * 86400000 };
    expect(isContractExpiring(expiring, 30)).toBe(true);
  });

  it('renewal forecast', () => {
    const contracts = [
      activateContract({ ...createContract('a1', 999), endDate: Date.now() + 15 * 86400000 }, 'A'),
      activateContract({ ...createContract('a2', 2999), endDate: Date.now() + 60 * 86400000 }, 'B'),
      activateContract({ ...createContract('a3', 499), endDate: Date.now() + 365 * 86400000 }, 'C'),
    ];
    const forecast = getRenewalForecast(contracts);
    expect(forecast.expiringThisMonth).toBe(1);
    expect(forecast.expiringThisQuarter).toBe(2);
    expect(forecast.totalRenewalValue).toBe(3998);
  });

  it('CustomerSuccessSynchronizer lifecycle', () => {
    const sync = new CustomerSuccessSynchronizer();
    for (let i = 0; i < 50; i++) {
      sync.addAccount(createAccount(`Org ${i}`, 'school'));
      sync.addContact(createContact(`acc${i}`, `C ${i}`, `c${i}@x.com`, 'admin'));
      sync.addContract(createContract(`acc${i}`, 999));
    }
    expect(sync.getAllAccounts()).toHaveLength(50);
    expect(sync.getAllContracts()).toHaveLength(50);
    expect(sync.getAccountsByHealth('healthy')).toHaveLength(50);
    const clone = sync.clone();
    expect(clone.getAllAccounts()).toHaveLength(50);
    sync.clear();
    expect(sync.getAllAccounts()).toHaveLength(0);
  });
});
