/**
 * Phase 41B — SSO Runtime
 *
 * Enterprise Single Sign-On integration supporting Google Workspace,
 * Microsoft 365, Azure AD, Okta, Auth0, SAML 2.0, OIDC, and LDAP.
 */

// ─── Types ─────────────────────────────────────────────────────

export type SSOProvider = 'google' | 'microsoft' | 'azure_ad' | 'okta' | 'auth0' | 'saml' | 'oidc' | 'ldap';
export type SSOStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'pending';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface SSOConfiguration {
  readonly configId: string;
  readonly tenantId: string;
  readonly provider: SSOProvider;
  readonly clientId: string;
  readonly domain: string;
  readonly callbackUrl: string;
  readonly scopes: string[];
  readonly status: SSOStatus;
  readonly autoProvision: boolean;
  readonly roleMapping: Record<string, string>;
  readonly groupSync: boolean;
  readonly createdAt: number;
  readonly lastSyncAt: number | null;
}

export interface SSOSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly provider: SSOProvider;
  readonly externalId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: string[];
  readonly groups: string[];
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly createdAt: number;
}

export interface SSOUserSync {
  readonly syncId: string;
  readonly tenantId: string;
  readonly provider: SSOProvider;
  readonly direction: SyncDirection;
  readonly usersCreated: number;
  readonly usersUpdated: number;
  readonly usersDeactivated: number;
  readonly errors: SSOSyncError[];
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: 'running' | 'completed' | 'failed';
}

export interface SSOSyncError {
  readonly errorId: string;
  readonly externalId: string;
  readonly message: string;
  readonly timestamp: number;
}

export interface SSOGroupMapping {
  readonly mappingId: string;
  readonly externalGroup: string;
  readonly internalRole: string;
  readonly autoAssign: boolean;
  readonly memberCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `sso_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

export const SUPPORTED_SSO_PROVIDERS: SSOProvider[] = ['google', 'microsoft', 'azure_ad', 'okta', 'auth0', 'saml', 'oidc', 'ldap'];

const PROVIDER_SCOPES: Record<SSOProvider, string[]> = {
  google: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/classroom.courses.readonly'],
  microsoft: ['openid', 'profile', 'email', 'User.Read', 'EduRoster.ReadBasic'],
  azure_ad: ['openid', 'profile', 'email', 'Directory.Read.All', 'GroupMember.Read.All'],
  okta: ['openid', 'profile', 'email', 'groups'],
  auth0: ['openid', 'profile', 'email'],
  saml: ['urn:oasis:names:tc:SAML:2.0:attrname-format:basic'],
  oidc: ['openid', 'profile', 'email'],
  ldap: ['read', 'search', 'bind'],
};

// ─── Configuration ────────────────────────────────────────────

export function createSSOConfig(tenantId: string, provider: SSOProvider, clientId: string, domain: string, callbackUrl: string): SSOConfiguration {
  return {
    configId: uid(), tenantId, provider, clientId, domain, callbackUrl,
    scopes: PROVIDER_SCOPES[provider] ?? ['openid', 'profile', 'email'],
    status: 'pending', autoProvision: true,
    roleMapping: { admin: 'org_admin', teacher: 'teacher', student: 'student' },
    groupSync: true, createdAt: now(), lastSyncAt: null,
  };
}

export function activateSSOConfig(config: SSOConfiguration): SSOConfiguration {
  return { ...config, status: 'connected', lastSyncAt: now() };
}

export function deactivateSSOConfig(config: SSOConfiguration): SSOConfiguration {
  return { ...config, status: 'disconnected' };
}

export function updateSSOStatus(config: SSOConfiguration, status: SSOStatus): SSOConfiguration {
  return { ...config, status, lastSyncAt: status === 'connected' ? now() : config.lastSyncAt };
}

// ─── Authentication ────────────────────────────────────────────

export function ssoSignIn(provider: SSOProvider, externalId: string, email: string, displayName: string, roles: string[], groups: string[]): SSOSession {
  return {
    sessionId: uid(), userId: uid(), provider, externalId, email, displayName,
    roles, groups,
    accessToken: `at_${uid()}`, refreshToken: `rt_${uid()}`,
    expiresAt: now() + 3600000, createdAt: now(),
  };
}

export function ssoSignOut(session: SSOSession): SSOSession {
  return { ...session, expiresAt: 0 };
}

export function isSSOSessionValid(session: SSOSession): boolean {
  return session.expiresAt > now();
}

export function refreshSSOSession(session: SSOSession): SSOSession {
  return { ...session, accessToken: `at_${uid()}`, expiresAt: now() + 3600000 };
}

// ─── User Sync ─────────────────────────────────────────────────

export function startUserSync(tenantId: string, provider: SSOProvider, direction: SyncDirection): SSOUserSync {
  return {
    syncId: uid(), tenantId, provider, direction,
    usersCreated: 0, usersUpdated: 0, usersDeactivated: 0,
    errors: [], startedAt: now(), completedAt: null, status: 'running',
  };
}

export function completeUserSync(sync: SSOUserSync, created: number, updated: number, deactivated: number): SSOUserSync {
  return {
    ...sync, usersCreated: created, usersUpdated: updated, usersDeactivated: deactivated,
    completedAt: now(), status: 'completed',
  };
}

export function failUserSync(sync: SSOUserSync, error: string): SSOUserSync {
  const err: SSOSyncError = { errorId: uid(), externalId: '', message: error, timestamp: now() };
  return { ...sync, errors: [...sync.errors, err], status: 'failed', completedAt: now() };
}

// ─── Role Sync ─────────────────────────────────────────────────

export function mapExternalRole(config: SSOConfiguration, externalRole: string): string {
  return config.roleMapping[externalRole] ?? 'student';
}

export function updateRoleMapping(config: SSOConfiguration, externalRole: string, internalRole: string): SSOConfiguration {
  return { ...config, roleMapping: { ...config.roleMapping, [externalRole]: internalRole } };
}

// ─── Group Sync ────────────────────────────────────────────────

export function createGroupMapping(externalGroup: string, internalRole: string, autoAssign: boolean = true): SSOGroupMapping {
  return { mappingId: uid(), externalGroup, internalRole, autoAssign, memberCount: 0 };
}

export function syncGroupMembers(mapping: SSOGroupMapping, count: number): SSOGroupMapping {
  return { ...mapping, memberCount: count };
}

// ─── Provider Helpers ──────────────────────────────────────────

export function getProviderScopes(provider: SSOProvider): string[] {
  return [...(PROVIDER_SCOPES[provider] ?? ['openid', 'profile', 'email'])];
}

export function isProviderSupported(provider: string): boolean {
  return SUPPORTED_SSO_PROVIDERS.includes(provider as SSOProvider);
}
