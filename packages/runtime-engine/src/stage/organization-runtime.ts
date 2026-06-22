/**
 * Phase 36A — Organization Runtime
 * Organization management, departments, campuses, members, roles,
 * permissions, subscriptions, analytics, districts, audit logging.
 */
import type {
  OrganizationModel, CampusModel, DepartmentModel, OrganizationMemberModel,
  OrganizationRoleModel, OrganizationSubscriptionModel, OrganizationAnalyticsModel,
  DistrictModel, AuditLogModel, OrganizationType, OrganizationRoleType,
  SubscriptionTier, SubscriptionStatus, AuditAction, DeploymentSnapshot,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 36A Org]';

export const VALID_ORG_ROLES: OrganizationRoleType[] = ['super_admin', 'district_admin', 'org_admin', 'principal', 'teacher', 'lab_instructor', 'judge', 'student', 'guest'];
export const VALID_SUBSCRIPTION_TIERS: SubscriptionTier[] = ['free', 'school', 'district', 'enterprise'];
export const VALID_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'expired', 'cancelled', 'trial'];
export const VALID_AUDIT_ACTIONS: AuditAction[] = ['login', 'role_change', 'project_publish', 'competition_action', 'certificate_issue', 'device_upload', 'org_update', 'tenant_update'];

// ─── Organization ───────────────────────────────────────────

export function createOrganization(
  tenantId: string, name: string, orgType: OrganizationType,
  contactEmail?: string, address?: string,
): OrganizationModel {
  return {
    organizationId: generateId(), tenantId, name, orgType,
    address: address ?? '', contactEmail: contactEmail ?? '',
    contactPhone: '', logoUrl: '', memberCount: 0, classroomCount: 0,
    createdAt: Date.now(), updatedAt: Date.now(), archived: false,
  };
}

export function updateOrganization(
  org: OrganizationModel,
  updates: Partial<Pick<OrganizationModel, 'name' | 'address' | 'contactEmail' | 'contactPhone' | 'logoUrl'>>,
): OrganizationModel {
  const o = deepCopy(org);
  if (updates.name !== undefined) o.name = updates.name;
  if (updates.address !== undefined) o.address = updates.address;
  if (updates.contactEmail !== undefined) o.contactEmail = updates.contactEmail;
  if (updates.contactPhone !== undefined) o.contactPhone = updates.contactPhone;
  if (updates.logoUrl !== undefined) o.logoUrl = updates.logoUrl;
  o.updatedAt = Date.now(); return o;
}

export function archiveOrganization(org: OrganizationModel): OrganizationModel {
  const o = deepCopy(org); o.archived = true; o.updatedAt = Date.now(); return o;
}

// ─── Campus ─────────────────────────────────────────────────

export function addCampus(organizationId: string, name: string, address?: string): CampusModel {
  return { campusId: generateId(), organizationId, name, address: address ?? '', labCount: 0, classroomCount: 0, createdAt: Date.now() };
}

export function removeCampus(campuses: CampusModel[], campusId: string): CampusModel[] {
  return campuses.filter(c => c.campusId !== campusId);
}

// ─── Department ─────────────────────────────────────────────

export function addDepartment(organizationId: string, name: string, headId: string, headName: string): DepartmentModel {
  return { departmentId: generateId(), organizationId, name, headId, headName, memberCount: 0, createdAt: Date.now() };
}

export function removeDepartment(departments: DepartmentModel[], departmentId: string): DepartmentModel[] {
  return departments.filter(d => d.departmentId !== departmentId);
}

// ─── Members ────────────────────────────────────────────────

export function addMember(
  organizationId: string, userId: string, userName: string,
  role: OrganizationRoleType, departmentId?: string, campusId?: string,
): OrganizationMemberModel {
  return {
    memberId: generateId(), organizationId, userId, userName, role,
    departmentId: departmentId ?? null, campusId: campusId ?? null,
    joinedAt: Date.now(), active: true,
  };
}

export function removeMember(member: OrganizationMemberModel): OrganizationMemberModel {
  const m = deepCopy(member); m.active = false; return m;
}

export function assignRole(member: OrganizationMemberModel, role: OrganizationRoleType): OrganizationMemberModel {
  const m = deepCopy(member); m.role = role; return m;
}

// ─── Roles & Permissions ────────────────────────────────────

const ROLE_PERMISSIONS: Record<OrganizationRoleType, string[]> = {
  super_admin: ['manage_tenants', 'manage_orgs', 'manage_users', 'manage_roles', 'manage_subscriptions', 'view_analytics', 'manage_competitions', 'manage_marketplace'],
  district_admin: ['manage_orgs', 'manage_users', 'manage_roles', 'view_analytics', 'manage_competitions'],
  org_admin: ['manage_users', 'manage_roles', 'view_analytics', 'manage_classrooms', 'manage_competitions'],
  principal: ['manage_users', 'view_analytics', 'manage_classrooms'],
  teacher: ['manage_classrooms', 'manage_assignments', 'view_analytics'],
  lab_instructor: ['manage_classrooms', 'manage_devices', 'view_analytics'],
  judge: ['manage_competitions', 'view_analytics'],
  student: ['view_assignments', 'submit_work', 'view_analytics'],
  guest: ['view_public'],
};

export function createRole(organizationId: string, roleName: OrganizationRoleType): OrganizationRoleModel {
  return { roleId: generateId(), organizationId, roleName, permissions: [...(ROLE_PERMISSIONS[roleName] || [])], createdAt: Date.now() };
}

export function validatePermission(role: OrganizationRoleType, permission: string): boolean {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function getRolePermissions(role: OrganizationRoleType): string[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

// ─── Subscriptions ──────────────────────────────────────────

const TIER_LIMITS: Record<SubscriptionTier, { maxUsers: number; maxStorage: number }> = {
  free: { maxUsers: 25, maxStorage: 1024 },
  school: { maxUsers: 500, maxStorage: 10240 },
  district: { maxUsers: 5000, maxStorage: 102400 },
  enterprise: { maxUsers: 50000, maxStorage: 1048576 },
};

export function createSubscription(tenantId: string, tier: SubscriptionTier): OrganizationSubscriptionModel {
  const limits = TIER_LIMITS[tier];
  return {
    subscriptionId: generateId(), tenantId, tier, status: 'active',
    maxUsers: limits.maxUsers, maxStorage: limits.maxStorage,
    startedAt: Date.now(), expiresAt: null, cancelledAt: null,
  };
}

export function upgradeSubscription(sub: OrganizationSubscriptionModel, newTier: SubscriptionTier): OrganizationSubscriptionModel {
  const s = deepCopy(sub); s.tier = newTier; const limits = TIER_LIMITS[newTier];
  s.maxUsers = limits.maxUsers; s.maxStorage = limits.maxStorage; return s;
}

export function downgradeSubscription(sub: OrganizationSubscriptionModel, newTier: SubscriptionTier): OrganizationSubscriptionModel {
  return upgradeSubscription(sub, newTier);
}

export function cancelSubscription(sub: OrganizationSubscriptionModel): OrganizationSubscriptionModel {
  const s = deepCopy(sub); s.status = 'cancelled'; s.cancelledAt = Date.now(); return s;
}

export function trackUsage(sub: OrganizationSubscriptionModel, currentUsers: number, currentStorageMB: number): {
  withinLimits: boolean; userUsage: number; storageUsage: number;
} {
  return {
    withinLimits: currentUsers <= sub.maxUsers && currentStorageMB <= sub.maxStorage,
    userUsage: Math.round((currentUsers / sub.maxUsers) * 100),
    storageUsage: Math.round((currentStorageMB / sub.maxStorage) * 100),
  };
}

// ─── Organization Analytics ─────────────────────────────────

export function generateOrgAnalytics(
  organizationId: string, activeStudents: number, activeTeachers: number,
  totalAssignments: number, totalCompetitions: number, deviceUploads: number,
  marketplaceUsage: number, aiUsage: number, storageUsedMB: number,
): OrganizationAnalyticsModel {
  return {
    analyticsId: generateId(), organizationId, activeStudents, activeTeachers,
    totalAssignments, totalCompetitions, deviceUploads, marketplaceUsage,
    aiUsage, storageUsedMB, generatedAt: Date.now(),
  };
}

// ─── District ───────────────────────────────────────────────

export function createDistrict(name: string, adminId: string, adminName: string, region?: string): DistrictModel {
  return {
    districtId: generateId(), name, adminId, adminName,
    schoolCount: 0, totalStudents: 0, totalTeachers: 0,
    region: region ?? '', createdAt: Date.now(),
  };
}

export function getDistrictSchools(orgs: OrganizationModel[], districtTenantId: string): OrganizationModel[] {
  return orgs.filter(o => o.tenantId === districtTenantId && !o.archived);
}

// ─── Audit Logging ──────────────────────────────────────────

export function createAuditLog(
  tenantId: string, userId: string, userName: string,
  action: AuditAction, details: string, ipAddress?: string,
): AuditLogModel {
  return { logId: generateId(), tenantId, userId, userName, action, details, ipAddress: ipAddress ?? '0.0.0.0', timestamp: Date.now() };
}

export function getAuditLogs(logs: AuditLogModel[], tenantId: string, action?: AuditAction): AuditLogModel[] {
  return logs.filter(l => l.tenantId === tenantId && (!action || l.action === action));
}

// ─── Reporting ──────────────────────────────────────────────

export function generateSchoolReport(org: OrganizationModel, analytics: OrganizationAnalyticsModel): string {
  return JSON.stringify({ type: 'school_report', organization: org.name, ...analytics, generatedAt: new Date().toISOString() }, null, 2);
}

export function generateDistrictReport(district: DistrictModel, orgs: OrganizationModel[]): string {
  return JSON.stringify({
    type: 'district_report', district: district.name,
    schoolCount: orgs.length, totalStudents: district.totalStudents,
    totalTeachers: district.totalTeachers, generatedAt: new Date().toISOString(),
  }, null, 2);
}

// ─── OrganizationSynchronizer ───────────────────────────────

export class OrganizationSynchronizer {
  private readonly orgs = new Map<string, OrganizationModel>();
  private readonly orgOrder: string[] = [];
  private readonly campuses = new Map<string, CampusModel>();
  private readonly campusOrder: string[] = [];
  private readonly departments = new Map<string, DepartmentModel>();
  private readonly departmentOrder: string[] = [];
  private readonly members = new Map<string, OrganizationMemberModel>();
  private readonly memberOrder: string[] = [];
  private readonly roles = new Map<string, OrganizationRoleModel>();
  private readonly roleOrder: string[] = [];
  private readonly subscriptions = new Map<string, OrganizationSubscriptionModel>();
  private readonly subscriptionOrder: string[] = [];
  private readonly analyticsMap = new Map<string, OrganizationAnalyticsModel>();
  private readonly analyticsOrder: string[] = [];
  private readonly districts = new Map<string, DistrictModel>();
  private readonly districtOrder: string[] = [];
  private readonly auditLogs = new Map<string, AuditLogModel>();
  private readonly auditLogOrder: string[] = [];

  // Org
  public registerOrg(o: OrganizationModel): void {
    if (!o.organizationId) { console.warn(`${W} empty orgId`); return; }
    const c = deepCopy(o);
    if (this.orgs.has(o.organizationId)) { this.orgs.set(o.organizationId, c); return; }
    this.orgs.set(o.organizationId, c); this.orgOrder.push(o.organizationId);
  }
  public getOrg(id: string): OrganizationModel | undefined { const v = this.orgs.get(id); return v ? deepCopy(v) : undefined; }
  public getAllOrgs(): OrganizationModel[] { return this.orgOrder.filter(id => this.orgs.has(id)).map(id => deepCopy(this.orgs.get(id)!)); }
  public clearOrgs(): void { this.orgs.clear(); this.orgOrder.length = 0; }

  // Campus
  public registerCampus(c: CampusModel): void {
    if (!c.campusId) { console.warn(`${W} empty campusId`); return; }
    const cp = deepCopy(c);
    if (this.campuses.has(c.campusId)) { this.campuses.set(c.campusId, cp); return; }
    this.campuses.set(c.campusId, cp); this.campusOrder.push(c.campusId);
  }
  public getAllCampuses(): CampusModel[] { return this.campusOrder.filter(id => this.campuses.has(id)).map(id => deepCopy(this.campuses.get(id)!)); }
  public clearCampuses(): void { this.campuses.clear(); this.campusOrder.length = 0; }

  // Department
  public registerDepartment(d: DepartmentModel): void {
    if (!d.departmentId) { console.warn(`${W} empty deptId`); return; }
    const c = deepCopy(d);
    if (this.departments.has(d.departmentId)) { this.departments.set(d.departmentId, c); return; }
    this.departments.set(d.departmentId, c); this.departmentOrder.push(d.departmentId);
  }
  public getAllDepartments(): DepartmentModel[] { return this.departmentOrder.filter(id => this.departments.has(id)).map(id => deepCopy(this.departments.get(id)!)); }
  public clearDepartments(): void { this.departments.clear(); this.departmentOrder.length = 0; }

  // Member
  public registerMember(m: OrganizationMemberModel): void {
    if (!m.memberId) { console.warn(`${W} empty memberId`); return; }
    const c = deepCopy(m);
    if (this.members.has(m.memberId)) { this.members.set(m.memberId, c); return; }
    this.members.set(m.memberId, c); this.memberOrder.push(m.memberId);
  }
  public getAllMembers(): OrganizationMemberModel[] { return this.memberOrder.filter(id => this.members.has(id)).map(id => deepCopy(this.members.get(id)!)); }
  public getActiveMembers(): OrganizationMemberModel[] { return this.getAllMembers().filter(m => m.active); }
  public clearMembers(): void { this.members.clear(); this.memberOrder.length = 0; }

  // Role
  public registerRole(r: OrganizationRoleModel): void {
    if (!r.roleId) { console.warn(`${W} empty roleId`); return; }
    const c = deepCopy(r);
    if (this.roles.has(r.roleId)) { this.roles.set(r.roleId, c); return; }
    this.roles.set(r.roleId, c); this.roleOrder.push(r.roleId);
  }
  public getAllRoles(): OrganizationRoleModel[] { return this.roleOrder.filter(id => this.roles.has(id)).map(id => deepCopy(this.roles.get(id)!)); }
  public clearRoles(): void { this.roles.clear(); this.roleOrder.length = 0; }

  // Subscription
  public registerSubscription(s: OrganizationSubscriptionModel): void {
    if (!s.subscriptionId) { console.warn(`${W} empty subId`); return; }
    const c = deepCopy(s);
    if (this.subscriptions.has(s.subscriptionId)) { this.subscriptions.set(s.subscriptionId, c); return; }
    this.subscriptions.set(s.subscriptionId, c); this.subscriptionOrder.push(s.subscriptionId);
  }
  public getAllSubscriptions(): OrganizationSubscriptionModel[] { return this.subscriptionOrder.filter(id => this.subscriptions.has(id)).map(id => deepCopy(this.subscriptions.get(id)!)); }
  public clearSubscriptions(): void { this.subscriptions.clear(); this.subscriptionOrder.length = 0; }

  // Analytics
  public registerAnalytics(a: OrganizationAnalyticsModel): void {
    if (!a.analyticsId) { console.warn(`${W} empty analyticsId`); return; }
    const c = deepCopy(a);
    if (this.analyticsMap.has(a.analyticsId)) { this.analyticsMap.set(a.analyticsId, c); return; }
    this.analyticsMap.set(a.analyticsId, c); this.analyticsOrder.push(a.analyticsId);
  }
  public getAllAnalytics(): OrganizationAnalyticsModel[] { return this.analyticsOrder.filter(id => this.analyticsMap.has(id)).map(id => deepCopy(this.analyticsMap.get(id)!)); }
  public clearAnalytics(): void { this.analyticsMap.clear(); this.analyticsOrder.length = 0; }

  // District
  public registerDistrict(d: DistrictModel): void {
    if (!d.districtId) { console.warn(`${W} empty districtId`); return; }
    const c = deepCopy(d);
    if (this.districts.has(d.districtId)) { this.districts.set(d.districtId, c); return; }
    this.districts.set(d.districtId, c); this.districtOrder.push(d.districtId);
  }
  public getAllDistricts(): DistrictModel[] { return this.districtOrder.filter(id => this.districts.has(id)).map(id => deepCopy(this.districts.get(id)!)); }
  public clearDistricts(): void { this.districts.clear(); this.districtOrder.length = 0; }

  // AuditLog
  public registerAuditLog(l: AuditLogModel): void {
    if (!l.logId) { console.warn(`${W} empty logId`); return; }
    const c = deepCopy(l);
    if (this.auditLogs.has(l.logId)) { this.auditLogs.set(l.logId, c); return; }
    this.auditLogs.set(l.logId, c); this.auditLogOrder.push(l.logId);
  }
  public getAllAuditLogs(): AuditLogModel[] { return this.auditLogOrder.filter(id => this.auditLogs.has(id)).map(id => deepCopy(this.auditLogs.get(id)!)); }
  public clearAuditLogs(): void { this.auditLogs.clear(); this.auditLogOrder.length = 0; }

  // Lifecycle
  public clear(): void {
    this.clearOrgs(); this.clearCampuses(); this.clearDepartments();
    this.clearMembers(); this.clearRoles(); this.clearSubscriptions();
    this.clearAnalytics(); this.clearDistricts(); this.clearAuditLogs();
  }

  public buildSnapshot(): DeploymentSnapshot {
    return {
      tenants: [], organizations: this.getAllOrgs(), campuses: this.getAllCampuses(),
      departments: this.getAllDepartments(), members: this.getAllMembers(),
      roles: this.getAllRoles(), subscriptions: this.getAllSubscriptions(),
      analytics: this.getAllAnalytics(), districts: this.getAllDistricts(),
      auditLogs: this.getAllAuditLogs(),
      totalTenants: 0, totalOrganizations: this.orgs.size, totalMembers: this.members.size,
    };
  }

  public toJSON(): DeploymentSnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<DeploymentSnapshot>): void {
    this.clear(); if (!json) return;
    for (const o of json.organizations || []) this.registerOrg(o);
    for (const c of json.campuses || []) this.registerCampus(c);
    for (const d of json.departments || []) this.registerDepartment(d);
    for (const m of json.members || []) this.registerMember(m);
    for (const r of json.roles || []) this.registerRole(r);
    for (const s of json.subscriptions || []) this.registerSubscription(s);
    for (const a of json.analytics || []) this.registerAnalytics(a);
    for (const d of json.districts || []) this.registerDistrict(d);
    for (const l of json.auditLogs || []) this.registerAuditLog(l);
  }

  public clone(): OrganizationSynchronizer { const c = new OrganizationSynchronizer(); c.fromJSON(this.toJSON()); return c; }

  public get orgSize(): number { return this.orgs.size; }
  public get campusSize(): number { return this.campuses.size; }
  public get departmentSize(): number { return this.departments.size; }
  public get memberSize(): number { return this.members.size; }
  public get roleSize(): number { return this.roles.size; }
  public get subscriptionSize(): number { return this.subscriptions.size; }
  public get analyticsSize(): number { return this.analyticsMap.size; }
  public get districtSize(): number { return this.districts.size; }
  public get auditLogSize(): number { return this.auditLogs.size; }
}
