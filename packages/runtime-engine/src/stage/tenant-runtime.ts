/**
 * Phase 36A — Tenant Runtime
 * Multi-tenant management, tenant lifecycle, ownership transfer.
 */
import type { TenantModel, TenantStatus, OrganizationType } from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 36A Tenant]';

export const VALID_TENANT_STATUSES: TenantStatus[] = ['active', 'suspended', 'archived', 'pending'];
export const VALID_ORGANIZATION_TYPES: OrganizationType[] = ['school', 'college', 'university', 'robotics_lab', 'coaching_center', 'corporate', 'district'];

export function createTenant(
  name: string, slug: string, ownerId: string, ownerName: string,
  orgType: OrganizationType, maxUsers?: number, maxStorage?: number,
): TenantModel {
  return {
    tenantId: generateId(), name, slug, ownerId, ownerName,
    status: 'active', orgType, maxUsers: maxUsers ?? 100,
    maxStorage: maxStorage ?? 5120, createdAt: Date.now(), updatedAt: Date.now(),
  };
}

export function archiveTenant(tenant: TenantModel): TenantModel {
  const t = deepCopy(tenant); t.status = 'archived'; t.updatedAt = Date.now(); return t;
}

export function suspendTenant(tenant: TenantModel): TenantModel {
  const t = deepCopy(tenant); t.status = 'suspended'; t.updatedAt = Date.now(); return t;
}

export function activateTenant(tenant: TenantModel): TenantModel {
  const t = deepCopy(tenant); t.status = 'active'; t.updatedAt = Date.now(); return t;
}

export function transferTenantOwnership(tenant: TenantModel, newOwnerId: string, newOwnerName: string): TenantModel {
  const t = deepCopy(tenant); t.ownerId = newOwnerId; t.ownerName = newOwnerName; t.updatedAt = Date.now(); return t;
}

export function cloneTenant(tenant: TenantModel, newName: string, newSlug: string): TenantModel {
  const t = deepCopy(tenant); t.tenantId = generateId(); t.name = newName; t.slug = newSlug;
  t.createdAt = Date.now(); t.updatedAt = Date.now(); return t;
}

export function updateTenant(tenant: TenantModel, updates: Partial<Pick<TenantModel, 'name' | 'maxUsers' | 'maxStorage'>>): TenantModel {
  const t = deepCopy(tenant);
  if (updates.name !== undefined) t.name = updates.name;
  if (updates.maxUsers !== undefined) t.maxUsers = updates.maxUsers;
  if (updates.maxStorage !== undefined) t.maxStorage = updates.maxStorage;
  t.updatedAt = Date.now(); return t;
}

export function validateTenant(t: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!t || typeof t !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = t as Record<string, unknown>;
  if (typeof o.tenantId !== 'string' || !o.tenantId) { warnings.push(`${W} empty tenantId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── TenantSynchronizer ─────────────────────────────────────

export class TenantSynchronizer {
  private readonly tenants = new Map<string, TenantModel>();
  private readonly tenantOrder: string[] = [];

  public registerTenant(t: TenantModel): void {
    if (!t.tenantId) { console.warn(`${W} empty id`); return; }
    const c = deepCopy(t);
    if (this.tenants.has(t.tenantId)) { this.tenants.set(t.tenantId, c); return; }
    this.tenants.set(t.tenantId, c); this.tenantOrder.push(t.tenantId);
  }
  public getTenant(id: string): TenantModel | undefined { const v = this.tenants.get(id); return v ? deepCopy(v) : undefined; }
  public getAllTenants(): TenantModel[] { return this.tenantOrder.filter(id => this.tenants.has(id)).map(id => deepCopy(this.tenants.get(id)!)); }
  public getActiveTenants(): TenantModel[] { return this.getAllTenants().filter(t => t.status === 'active'); }
  public hasTenant(id: string): boolean { return this.tenants.has(id); }
  public removeTenant(id: string): void { this.tenants.delete(id); const i = this.tenantOrder.indexOf(id); if (i !== -1) this.tenantOrder.splice(i, 1); }
  public clear(): void { this.tenants.clear(); this.tenantOrder.length = 0; }
  public toJSON(): TenantModel[] { return this.getAllTenants(); }
  public fromJSON(data: TenantModel[]): void { this.clear(); for (const t of data || []) this.registerTenant(t); }
  public clone(): TenantSynchronizer { const c = new TenantSynchronizer(); c.fromJSON(this.toJSON()); return c; }
  public get size(): number { return this.tenants.size; }
}
