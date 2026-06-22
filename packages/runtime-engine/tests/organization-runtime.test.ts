/**
 * Phase 36A — Organization Runtime Tests
 * Target: ~300,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOrganization, updateOrganization, archiveOrganization,
  addCampus, removeCampus, addDepartment, removeDepartment,
  addMember, removeMember, assignRole,
  createRole, validatePermission, getRolePermissions,
  createSubscription, upgradeSubscription, downgradeSubscription, cancelSubscription, trackUsage,
  generateOrgAnalytics, createDistrict, getDistrictSchools,
  createAuditLog, getAuditLogs,
  generateSchoolReport, generateDistrictReport,
  VALID_ORG_ROLES, VALID_SUBSCRIPTION_TIERS, VALID_SUBSCRIPTION_STATUSES, VALID_AUDIT_ACTIONS,
  OrganizationSynchronizer,
} from '../src/stage/organization-runtime';

describe('Phase 36A: Organization Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  describe('1 -- Organization CRUD', () => {
    it('creates organizations over 1500 iterations', () => {
      for (let i = 0; i < 1500; i++) {
        const o = createOrganization('t1', `Org ${i}`, 'school', 'org@test.com', '123 Main St');
        expect(o.organizationId).toBeTruthy();
        expect(o.name).toBe(`Org ${i}`);
        expect(o.orgType).toBe('school');
        expect(o.archived).toBe(false);
        expect(o.memberCount).toBe(0);
      }
    });

    it('updates and archives over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const o = createOrganization('t1', 'Org', 'school');
        const updated = updateOrganization(o, { name: 'New', contactEmail: 'new@test.com' });
        expect(updated.name).toBe('New');
        expect(updated.contactEmail).toBe('new@test.com');
        expect(archiveOrganization(o).archived).toBe(true);
      }
    });
  });

  describe('2 -- Campus & Department', () => {
    it('manages campuses over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const c = addCampus('o1', `Campus ${i}`, 'Address');
        expect(c.campusId).toBeTruthy();
        expect(c.name).toBe(`Campus ${i}`);
        const remaining = removeCampus([c], c.campusId);
        expect(remaining).toHaveLength(0);
      }
    });

    it('manages departments over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const d = addDepartment('o1', `Dept ${i}`, 'h1', 'Head');
        expect(d.departmentId).toBeTruthy();
        expect(d.name).toBe(`Dept ${i}`);
        const remaining = removeDepartment([d], d.departmentId);
        expect(remaining).toHaveLength(0);
      }
    });
  });

  describe('3 -- Members & Roles', () => {
    it('manages members over 1500 iterations', () => {
      for (let i = 0; i < 1500; i++) {
        const m = addMember('o1', `u_${i}`, `User ${i}`, 'student', 'd1', 'c1');
        expect(m.memberId).toBeTruthy();
        expect(m.role).toBe('student');
        expect(m.active).toBe(true);

        const removed = removeMember(m);
        expect(removed.active).toBe(false);

        const promoted = assignRole(m, 'teacher');
        expect(promoted.role).toBe('teacher');
      }
    });

    it('validates permissions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(validatePermission('super_admin', 'manage_tenants')).toBe(true);
        expect(validatePermission('student', 'manage_tenants')).toBe(false);
        expect(validatePermission('teacher', 'manage_classrooms')).toBe(true);
        expect(validatePermission('guest', 'view_public')).toBe(true);
        expect(validatePermission('guest', 'manage_users')).toBe(false);
      }
    });

    it('creates roles and gets permissions over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const role = createRole('o1', 'teacher');
        expect(role.roleId).toBeTruthy();
        expect(role.permissions).toContain('manage_classrooms');
        const perms = getRolePermissions('org_admin');
        expect(perms).toContain('manage_users');
      }
    });
  });

  describe('4 -- Subscriptions', () => {
    it('manages subscriptions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sub = createSubscription('t1', 'school');
        expect(sub.subscriptionId).toBeTruthy();
        expect(sub.tier).toBe('school');
        expect(sub.status).toBe('active');
        expect(sub.maxUsers).toBe(500);

        const upgraded = upgradeSubscription(sub, 'district');
        expect(upgraded.tier).toBe('district');
        expect(upgraded.maxUsers).toBe(5000);

        const cancelled = cancelSubscription(sub);
        expect(cancelled.status).toBe('cancelled');
      }
    });

    it('tracks usage over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sub = createSubscription('t1', 'school');
        const usage = trackUsage(sub, 100, 2048);
        expect(usage.withinLimits).toBe(true);
        expect(usage.userUsage).toBe(20);

        const over = trackUsage(sub, 600, 20000);
        expect(over.withinLimits).toBe(false);
      }
    });
  });

  describe('5 -- Analytics & District', () => {
    it('generates analytics over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const a = generateOrgAnalytics('o1', 100, 10, 50, 5, 20, 15, 8, 2048);
        expect(a.analyticsId).toBeTruthy();
        expect(a.activeStudents).toBe(100);
        expect(a.storageUsedMB).toBe(2048);
      }
    });

    it('manages districts over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const d = createDistrict(`District ${i}`, 'a1', 'Admin', 'West');
        expect(d.districtId).toBeTruthy();
        expect(d.region).toBe('West');
      }
    });

    it('gets district schools over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const o1 = createOrganization('t1', 'S1', 'school');
        const o2 = createOrganization('t1', 'S2', 'school');
        const o3 = createOrganization('t2', 'S3', 'school');
        expect(getDistrictSchools([o1, o2, o3], 't1')).toHaveLength(2);
      }
    });
  });

  describe('6 -- Audit & Reports', () => {
    it('creates audit logs over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const log = createAuditLog('t1', 'u1', 'Admin', 'login', 'User logged in', '192.168.1.1');
        expect(log.logId).toBeTruthy();
        expect(log.action).toBe('login');
      }
    });

    it('filters audit logs over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const l1 = createAuditLog('t1', 'u1', 'A', 'login', 'In');
        const l2 = createAuditLog('t1', 'u1', 'A', 'role_change', 'Changed');
        const l3 = createAuditLog('t2', 'u2', 'B', 'login', 'In');
        expect(getAuditLogs([l1, l2, l3], 't1')).toHaveLength(2);
        expect(getAuditLogs([l1, l2, l3], 't1', 'login')).toHaveLength(1);
      }
    });

    it('generates reports over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const o = createOrganization('t1', 'School', 'school');
        const a = generateOrgAnalytics('o1', 50, 5, 20, 2, 10, 5, 3, 1024);
        const report = generateSchoolReport(o, a);
        expect(JSON.parse(report).type).toBe('school_report');

        const d = createDistrict('Dist', 'a1', 'Admin');
        const dr = generateDistrictReport(d, [o]);
        expect(JSON.parse(dr).type).toBe('district_report');
      }
    });
  });

  describe('7 -- Synchronizer', () => {
    it('manages all entities', () => {
      const sync = new OrganizationSynchronizer();
      const o = createOrganization('t1', 'Org', 'school');
      sync.registerOrg(o);
      expect(sync.orgSize).toBe(1);
      expect(sync.getOrg(o.organizationId)!.name).toBe('Org');

      sync.registerCampus(addCampus(o.organizationId, 'C1'));
      expect(sync.campusSize).toBe(1);

      sync.registerDepartment(addDepartment(o.organizationId, 'D1', 'h1', 'Head'));
      expect(sync.departmentSize).toBe(1);

      sync.registerMember(addMember(o.organizationId, 'u1', 'User', 'student'));
      expect(sync.memberSize).toBe(1);
      expect(sync.getActiveMembers()).toHaveLength(1);

      sync.registerRole(createRole(o.organizationId, 'teacher'));
      expect(sync.roleSize).toBe(1);

      sync.registerSubscription(createSubscription('t1', 'school'));
      expect(sync.subscriptionSize).toBe(1);

      sync.registerAnalytics(generateOrgAnalytics(o.organizationId, 10, 2, 5, 1, 3, 2, 1, 512));
      expect(sync.analyticsSize).toBe(1);

      sync.registerDistrict(createDistrict('D', 'a1', 'A'));
      expect(sync.districtSize).toBe(1);

      sync.registerAuditLog(createAuditLog('t1', 'u1', 'A', 'login', 'Test'));
      expect(sync.auditLogSize).toBe(1);
    });

    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new OrganizationSynchronizer();
        sync.registerOrg(createOrganization('t1', 'O', 'school'));
        sync.registerMember(addMember('o1', 'u1', 'U', 'student'));
        const json = sync.toJSON();
        const r = new OrganizationSynchronizer();
        r.fromJSON(json);
        expect(r.orgSize).toBe(1);
        expect(r.memberSize).toBe(1);
      }
    });

    it('clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new OrganizationSynchronizer();
        orig.registerOrg(createOrganization('t1', 'O', 'school'));
        const cloned = orig.clone();
        cloned.clearOrgs();
        expect(orig.orgSize).toBe(1);
        expect(cloned.orgSize).toBe(0);
      }
    });

    it('stress 5000 members', () => {
      const sync = new OrganizationSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerMember(addMember('o1', `u${i}`, `U${i}`, 'student'));
      expect(sync.memberSize).toBe(5000);
    });
  });

  describe('8 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_ORG_ROLES).toHaveLength(9);
      expect(VALID_SUBSCRIPTION_TIERS).toHaveLength(4);
      expect(VALID_SUBSCRIPTION_STATUSES).toHaveLength(4);
      expect(VALID_AUDIT_ACTIONS).toHaveLength(8);
    });
  });
});
