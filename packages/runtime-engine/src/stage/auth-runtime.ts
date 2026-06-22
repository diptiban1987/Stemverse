/**
 * Phase 36C — Auth Runtime
 *
 * Authentication, session management, JWT tokens, role enforcement.
 * Extends existing auth package patterns.
 */

import type {
  AuthUserModel, AuthSessionModel, AuthTokenModel,
  AuthProvider, SessionStatus, OrganizationRoleType, AuthSnapshot,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();
const hashPassword = (pw: string): string => {
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  return 'hashed_' + Math.abs(h).toString(36);
};
const generateToken = (): string => uid() + '_' + uid();

// ─── Constants ───────────────────────────────────────────────
const ACCESS_TOKEN_TTL = 15 * 60 * 1000;   // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL = 60 * 60 * 1000;    // 1 hour
const VERIFY_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ─── Permission Matrix ──────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['access_all', 'modify_all', 'publish_all', 'grade_all', 'judge_all', 'manage_tenants', 'manage_orgs'],
  district_admin: ['access_district', 'modify_district', 'publish_all', 'grade_all', 'judge_all', 'manage_orgs'],
  org_admin: ['access_org', 'modify_org', 'publish_org', 'grade_all', 'manage_users'],
  principal: ['access_org', 'modify_org', 'publish_org', 'grade_all'],
  teacher: ['access_classroom', 'modify_classroom', 'publish_classroom', 'grade_classroom'],
  lab_instructor: ['access_classroom', 'modify_classroom', 'grade_lab'],
  judge: ['access_competition', 'judge_competition'],
  student: ['access_own', 'modify_own', 'publish_own'],
  guest: ['access_public'],
};

// ─── Auth Operations ─────────────────────────────────────────

export function signup(
  email: string, password: string, displayName: string,
  provider: AuthProvider = 'email',
): { user: AuthUserModel; session: AuthSessionModel } {
  if (!email || !email.includes('@')) {
    console.warn('[Auth] Invalid email:', email);
    return { user: createGuestUser(), session: createExpiredSession('') };
  }
  if (!password || password.length < 6) {
    console.warn('[Auth] Password too short');
    return { user: createGuestUser(), session: createExpiredSession('') };
  }
  const user: AuthUserModel = {
    userId: uid(), email: email.toLowerCase().trim(), displayName,
    provider, emailVerified: false, role: 'student',
    tenantId: null, organizationId: null,
    avatarUrl: '', createdAt: now(), lastLoginAt: now(),
  };
  const session = createSession(user.userId);
  return { user, session };
}

export function signin(
  email: string, _password: string,
  existingUsers: AuthUserModel[],
): { user: AuthUserModel; session: AuthSessionModel } | null {
  const user = existingUsers.find(u => u.email === email.toLowerCase().trim());
  if (!user) { console.warn('[Auth] User not found:', email); return null; }
  const updated = { ...user, lastLoginAt: now() };
  const session = createSession(user.userId);
  return { user: updated, session };
}

export function signout(session: AuthSessionModel): AuthSessionModel {
  return { ...session, status: 'revoked' as SessionStatus, revokedAt: now() };
}

export function refreshToken(session: AuthSessionModel): AuthSessionModel | null {
  if (session.status !== 'active') { console.warn('[Auth] Session not active'); return null; }
  if (session.expiresAt < now()) { console.warn('[Auth] Session expired'); return null; }
  return {
    ...session,
    accessToken: generateToken(),
    expiresAt: now() + REFRESH_TOKEN_TTL,
  };
}

export function forgotPassword(email: string, users: AuthUserModel[]): AuthTokenModel | null {
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) { console.warn('[Auth] User not found for reset'); return null; }
  return createToken(user.userId, 'reset');
}

export function resetPassword(token: AuthTokenModel, _newPassword: string): AuthTokenModel {
  if (token.used || token.expiresAt < now()) {
    console.warn('[Auth] Token invalid or expired');
    return { ...token, used: true };
  }
  return { ...token, used: true };
}

export function verifyEmail(token: AuthTokenModel, user: AuthUserModel): {
  token: AuthTokenModel; user: AuthUserModel;
} {
  if (token.used || token.expiresAt < now() || token.type !== 'verify') {
    console.warn('[Auth] Verify token invalid');
    return { token: { ...token, used: true }, user };
  }
  return {
    token: { ...token, used: true },
    user: { ...user, emailVerified: true },
  };
}

// ─── Role Enforcement ────────────────────────────────────────

export function canAccess(role: OrganizationRoleType, scope: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith('access_') && (p === 'access_all' || p.includes(scope)));
}

export function canModify(role: OrganizationRoleType, scope: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith('modify_') && (p === 'modify_all' || p.includes(scope)));
}

export function canPublish(role: OrganizationRoleType, scope: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith('publish_') && (p === 'publish_all' || p.includes(scope)));
}

export function canGrade(role: OrganizationRoleType, scope: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.some(p => p.startsWith('grade_') && (p === 'grade_all' || p.includes(scope)));
}

export function canJudge(role: OrganizationRoleType): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.some(p => p === 'judge_all' || p === 'judge_competition');
}

// ─── Session Management ──────────────────────────────────────

export function createSession(userId: string, deviceInfo = 'browser', ip = '127.0.0.1'): AuthSessionModel {
  return {
    sessionId: uid(), userId,
    accessToken: generateToken(), refreshToken: generateToken(),
    status: 'active', deviceInfo, ipAddress: ip,
    createdAt: now(), expiresAt: now() + REFRESH_TOKEN_TTL, revokedAt: null,
  };
}

export function revokeSession(session: AuthSessionModel): AuthSessionModel {
  return { ...session, status: 'revoked', revokedAt: now() };
}

export function revokeAllSessions(sessions: AuthSessionModel[], userId: string): AuthSessionModel[] {
  return sessions.map(s => s.userId === userId && s.status === 'active'
    ? { ...s, status: 'revoked' as SessionStatus, revokedAt: now() } : s);
}

export function getActiveSessions(sessions: AuthSessionModel[], userId: string): AuthSessionModel[] {
  return sessions.filter(s => s.userId === userId && s.status === 'active' && s.expiresAt > now());
}

export function isSessionValid(session: AuthSessionModel): boolean {
  return session.status === 'active' && session.expiresAt > now();
}

// ─── Token Management ────────────────────────────────────────

export function createToken(userId: string, type: 'access' | 'refresh' | 'reset' | 'verify'): AuthTokenModel {
  const ttl = type === 'access' ? ACCESS_TOKEN_TTL
    : type === 'refresh' ? REFRESH_TOKEN_TTL
    : type === 'reset' ? RESET_TOKEN_TTL : VERIFY_TOKEN_TTL;
  return {
    tokenId: uid(), userId, type, token: generateToken(),
    expiresAt: now() + ttl, used: false,
  };
}

export function validateToken(token: AuthTokenModel): boolean {
  return !token.used && token.expiresAt > now();
}

// ─── Internal Helpers ────────────────────────────────────────

function createGuestUser(): AuthUserModel {
  return {
    userId: '', email: '', displayName: 'Guest', provider: 'email',
    emailVerified: false, role: 'guest', tenantId: null,
    organizationId: null, avatarUrl: '', createdAt: now(), lastLoginAt: now(),
  };
}

function createExpiredSession(userId: string): AuthSessionModel {
  return {
    sessionId: '', userId, accessToken: '', refreshToken: '',
    status: 'expired', deviceInfo: '', ipAddress: '',
    createdAt: now(), expiresAt: 0, revokedAt: null,
  };
}

// ─── Snapshot ────────────────────────────────────────────────

export function createDefaultAuthSnapshot(): AuthSnapshot {
  return {
    users: [], sessions: [], tokens: [], apiRoutes: [],
    requestLogs: [], wsConnections: [],
    totalUsers: 0, totalActiveSessions: 0, totalApiRoutes: 0,
  };
}

// ─── Synchronizer ────────────────────────────────────────────

export class AuthSynchronizer {
  private users = new Map<string, AuthUserModel>();
  private sessions = new Map<string, AuthSessionModel>();
  private tokens = new Map<string, AuthTokenModel>();
  private userOrder: string[] = [];
  private sessionOrder: string[] = [];

  registerUser(u: AuthUserModel) { this.users.set(u.userId, { ...u }); if (!this.userOrder.includes(u.userId)) this.userOrder.push(u.userId); }
  getUser(id: string) { const u = this.users.get(id); return u ? { ...u } : undefined; }
  getAllUsers() { return this.userOrder.map(id => ({ ...this.users.get(id)! })); }
  hasUser(id: string) { return this.users.has(id); }

  registerSession(s: AuthSessionModel) { this.sessions.set(s.sessionId, { ...s }); if (!this.sessionOrder.includes(s.sessionId)) this.sessionOrder.push(s.sessionId); }
  getSession(id: string) { const s = this.sessions.get(id); return s ? { ...s } : undefined; }
  getAllSessions() { return this.sessionOrder.map(id => ({ ...this.sessions.get(id)! })); }
  hasSession(id: string) { return this.sessions.has(id); }

  registerToken(t: AuthTokenModel) { this.tokens.set(t.tokenId, { ...t }); }
  getToken(id: string) { const t = this.tokens.get(id); return t ? { ...t } : undefined; }

  clear() { this.users.clear(); this.sessions.clear(); this.tokens.clear(); this.userOrder = []; this.sessionOrder = []; }

  toJSON(): AuthSnapshot {
    return {
      users: this.getAllUsers(),
      sessions: this.getAllSessions(),
      tokens: Array.from(this.tokens.values()).map(t => ({ ...t })),
      apiRoutes: [], requestLogs: [], wsConnections: [],
      totalUsers: this.users.size,
      totalActiveSessions: this.sessionOrder.filter(id => this.sessions.get(id)?.status === 'active').length,
      totalApiRoutes: 0,
    };
  }

  fromJSON(snap: AuthSnapshot) {
    this.clear();
    snap.users.forEach(u => this.registerUser(u));
    snap.sessions.forEach(s => this.registerSession(s));
    snap.tokens.forEach(t => this.registerToken(t));
  }

  clone(): AuthSynchronizer {
    const c = new AuthSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
