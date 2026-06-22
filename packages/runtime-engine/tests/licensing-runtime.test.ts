/**
 * Phase 39A — Licensing Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createLicense, activateLicense, suspendLicense, renewLicense,
  upgradeLicense, downgradeLicense, expireLicense, transferLicense,
  addSeat, removeSeat, isLicenseValid, hasFeature,
  trackUsage, isOverQuota, getLicenseDefaults,
  LicensingSynchronizer,
} from '../src/stage/licensing-runtime';

describe('Phase 39A: Licensing Runtime', () => {
  it('creates all license types over 500 iterations', () => {
    const types = ['free', 'starter', 'school', 'district', 'enterprise', 'lifetime', 'trial'] as const;
    for (let i = 0; i < 500; i++) {
      types.forEach(type => {
        const lic = createLicense(type, `org${i}`, `Org ${i}`);
        expect(lic.type).toBe(type);
        expect(lic.status).toBe('pending');
        expect(lic.licenseKey).toContain('SV-');
        const defaults = getLicenseDefaults(type);
        expect(lic.maxSeats).toBe(defaults.maxSeats);
      });
    }
  });

  it('full lifecycle over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lic = createLicense('school', 'org1', 'Test School');
      expect(lic.status).toBe('pending');
      lic = activateLicense(lic);
      expect(lic.status).toBe('active');
      expect(lic.activatedAt).not.toBeNull();
      lic = suspendLicense(lic);
      expect(lic.status).toBe('suspended');
      lic = renewLicense(lic);
      expect(lic.status).toBe('active');
      lic = expireLicense(lic);
      expect(lic.status).toBe('expired');
    }
  });

  it('upgrades and downgrades over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lic = createLicense('starter', 'org1', 'Test');
      lic = activateLicense(lic);
      lic = upgradeLicense(lic, 'school');
      expect(lic.type).toBe('school');
      expect(lic.features).toContain('classrooms');
      lic = upgradeLicense(lic, 'enterprise');
      expect(lic.type).toBe('enterprise');
      expect(lic.features).toContain('white_label');
      lic = downgradeLicense(lic, 'school');
      expect(lic.type).toBe('school');
    }
  });

  it('seat management over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lic = createLicense('free', 'org1', 'Test');
      expect(lic.maxSeats).toBe(5);
      for (let s = 0; s < 5; s++) lic = addSeat(lic);
      expect(lic.usedSeats).toBe(5);
      lic = addSeat(lic); // should not exceed
      expect(lic.usedSeats).toBe(5);
      lic = removeSeat(lic);
      expect(lic.usedSeats).toBe(4);
    }
  });

  it('validation and features over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let lic = createLicense('enterprise', 'org1', 'Test');
      lic = activateLicense(lic);
      expect(isLicenseValid(lic)).toBe(true);
      expect(hasFeature(lic, 'white_label')).toBe(true);
      expect(hasFeature(lic, 'sso')).toBe(true);
      expect(hasFeature(lic, 'nonexistent')).toBe(false);
      lic = expireLicense(lic);
      expect(isLicenseValid(lic)).toBe(false);
    }
  });

  it('transfer and usage tracking', () => {
    let lic = createLicense('school', 'org1', 'School 1');
    lic = activateLicense(lic);
    lic = transferLicense(lic, 'org2', 'School 2');
    expect(lic.status).toBe('transferred');
    expect(lic.organizationId).toBe('org2');
    expect(lic.transferredFrom).toBe('org1');
    const usage = trackUsage(lic.licenseId, 'projects', 50, 100);
    expect(isOverQuota(usage)).toBe(false);
    const over = trackUsage(lic.licenseId, 'projects', 150, 100);
    expect(isOverQuota(over)).toBe(true);
  });

  it('LicensingSynchronizer lifecycle', () => {
    const sync = new LicensingSynchronizer();
    for (let i = 0; i < 50; i++) {
      sync.addLicense(activateLicense(createLicense('school', `org${i}`, `School ${i}`)));
    }
    expect(sync.getAllLicenses()).toHaveLength(50);
    expect(sync.getLicensesByType('school')).toHaveLength(50);
    const clone = sync.clone();
    expect(clone.getAllLicenses()).toHaveLength(50);
    sync.clear();
    expect(sync.getAllLicenses()).toHaveLength(0);
  });
});
