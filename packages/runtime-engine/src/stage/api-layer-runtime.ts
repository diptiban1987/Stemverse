/**
 * Phase 36C — API Layer Runtime
 *
 * API route registry, request logging, rate limiting, WebSocket connections.
 * Provides backend API infrastructure for all platform features.
 */

import type {
  ApiRouteModel, ApiRequestLogModel, ApiMethod,
  WebSocketConnectionModel, OrganizationRoleType,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Default API Routes ─────────────────────────────────────

const DEFAULT_ROUTES: Array<Omit<ApiRouteModel, 'routeId'>> = [
  { path: '/api/auth/signup', method: 'POST', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 10, description: 'User signup' },
  { path: '/api/auth/signin', method: 'POST', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 20, description: 'User signin' },
  { path: '/api/auth/signout', method: 'POST', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'User signout' },
  { path: '/api/auth/refresh', method: 'POST', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'Refresh token' },
  { path: '/api/auth/forgot-password', method: 'POST', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 5, description: 'Forgot password' },
  { path: '/api/auth/reset-password', method: 'POST', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 5, description: 'Reset password' },
  { path: '/api/auth/verify-email', method: 'POST', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 10, description: 'Verify email' },
  { path: '/api/users', method: 'GET', requiresAuth: true, requiredRole: 'org_admin', rateLimitPerMinute: 60, description: 'List users' },
  { path: '/api/users/:id', method: 'GET', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 60, description: 'Get user' },
  { path: '/api/users/:id', method: 'PUT', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'Update user' },
  { path: '/api/projects', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'List projects' },
  { path: '/api/projects', method: 'POST', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'Create project' },
  { path: '/api/projects/:id', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'Get project' },
  { path: '/api/projects/:id', method: 'PUT', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'Update project' },
  { path: '/api/projects/:id', method: 'DELETE', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 10, description: 'Delete project' },
  { path: '/api/classrooms', method: 'GET', requiresAuth: true, requiredRole: 'teacher', rateLimitPerMinute: 60, description: 'List classrooms' },
  { path: '/api/classrooms', method: 'POST', requiresAuth: true, requiredRole: 'teacher', rateLimitPerMinute: 20, description: 'Create classroom' },
  { path: '/api/classrooms/:id', method: 'GET', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 60, description: 'Get classroom' },
  { path: '/api/assignments', method: 'GET', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 60, description: 'List assignments' },
  { path: '/api/assignments', method: 'POST', requiresAuth: true, requiredRole: 'teacher', rateLimitPerMinute: 20, description: 'Create assignment' },
  { path: '/api/assignments/:id', method: 'GET', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 60, description: 'Get assignment' },
  { path: '/api/certificates', method: 'GET', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 30, description: 'List certificates' },
  { path: '/api/certificates', method: 'POST', requiresAuth: true, requiredRole: 'teacher', rateLimitPerMinute: 10, description: 'Issue certificate' },
  { path: '/api/competitions', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'List competitions' },
  { path: '/api/competitions', method: 'POST', requiresAuth: true, requiredRole: 'org_admin', rateLimitPerMinute: 10, description: 'Create competition' },
  { path: '/api/competitions/:id', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'Get competition' },
  { path: '/api/marketplace', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'List marketplace items' },
  { path: '/api/marketplace', method: 'POST', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 20, description: 'Publish to marketplace' },
  { path: '/api/marketplace/:id', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'Get marketplace item' },
  { path: '/api/gallery', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'List gallery projects' },
  { path: '/api/gallery', method: 'POST', requiresAuth: true, requiredRole: null, rateLimitPerMinute: 20, description: 'Publish to gallery' },
  { path: '/api/gallery/:id', method: 'GET', requiresAuth: false, requiredRole: null, rateLimitPerMinute: 60, description: 'Get gallery project' },
  { path: '/api/organizations', method: 'GET', requiresAuth: true, requiredRole: 'district_admin', rateLimitPerMinute: 30, description: 'List organizations' },
  { path: '/api/organizations', method: 'POST', requiresAuth: true, requiredRole: 'super_admin', rateLimitPerMinute: 10, description: 'Create organization' },
  { path: '/api/tenants', method: 'GET', requiresAuth: true, requiredRole: 'super_admin', rateLimitPerMinute: 30, description: 'List tenants' },
  { path: '/api/tenants', method: 'POST', requiresAuth: true, requiredRole: 'super_admin', rateLimitPerMinute: 10, description: 'Create tenant' },
];

// ─── Route Registry ──────────────────────────────────────────

export function getDefaultApiRoutes(): ApiRouteModel[] {
  return DEFAULT_ROUTES.map(r => ({ ...r, routeId: uid() }));
}

export function registerApiRoute(
  path: string, method: ApiMethod, requiresAuth: boolean,
  requiredRole: OrganizationRoleType | null = null,
  rateLimitPerMinute = 60, description = '',
): ApiRouteModel {
  return { routeId: uid(), path, method, requiresAuth, requiredRole, rateLimitPerMinute, description };
}

export function matchRoute(routes: ApiRouteModel[], path: string, method: ApiMethod): ApiRouteModel | undefined {
  return routes.find(r => {
    if (r.method !== method) return false;
    const routeParts = r.path.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
  });
}

export function isRouteAuthorized(route: ApiRouteModel, role: OrganizationRoleType | null, isAuthenticated: boolean): boolean {
  if (!route.requiresAuth) return true;
  if (!isAuthenticated) return false;
  if (!route.requiredRole) return true;
  const hierarchy: OrganizationRoleType[] = ['super_admin', 'district_admin', 'org_admin', 'principal', 'teacher', 'lab_instructor', 'judge', 'student', 'guest'];
  const requiredIdx = hierarchy.indexOf(route.requiredRole);
  const userIdx = hierarchy.indexOf(role || 'guest');
  return userIdx <= requiredIdx;
}

// ─── Request Logging ─────────────────────────────────────────

export function logApiRequest(
  routeId: string, userId: string | null, method: ApiMethod,
  path: string, statusCode: number, durationMs: number,
): ApiRequestLogModel {
  return { logId: uid(), routeId, userId, method, path, statusCode, durationMs, timestamp: now() };
}

export function getRequestStats(logs: ApiRequestLogModel[]): {
  totalRequests: number; avgDurationMs: number; errorRate: number;
  routeBreakdown: Record<string, number>;
} {
  const total = logs.length;
  const avgMs = total > 0 ? logs.reduce((s, l) => s + l.durationMs, 0) / total : 0;
  const errors = logs.filter(l => l.statusCode >= 400).length;
  const breakdown: Record<string, number> = {};
  logs.forEach(l => { breakdown[l.path] = (breakdown[l.path] || 0) + 1; });
  return { totalRequests: total, avgDurationMs: Math.round(avgMs), errorRate: total > 0 ? errors / total : 0, routeBreakdown: breakdown };
}

// ─── Rate Limiting ───────────────────────────────────────────

export function checkRateLimit(
  logs: ApiRequestLogModel[], userId: string | null,
  route: ApiRouteModel, windowMs = 60000,
): boolean {
  const cutoff = now() - windowMs;
  const recentCount = logs.filter(l =>
    l.routeId === route.routeId && l.userId === userId && l.timestamp > cutoff
  ).length;
  return recentCount < route.rateLimitPerMinute;
}

// ─── WebSocket Connections ───────────────────────────────────

export function createWsConnection(userId: string, sessionId: string, channel: string): WebSocketConnectionModel {
  return { connectionId: uid(), userId, sessionId, channel, connectedAt: now(), lastPingAt: now(), active: true };
}

export function disconnectWs(conn: WebSocketConnectionModel): WebSocketConnectionModel {
  return { ...conn, active: false };
}

export function pingWs(conn: WebSocketConnectionModel): WebSocketConnectionModel {
  return { ...conn, lastPingAt: now() };
}

export function getActiveConnections(conns: WebSocketConnectionModel[], channel?: string): WebSocketConnectionModel[] {
  return conns.filter(c => c.active && (!channel || c.channel === channel));
}

export function broadcastToChannel(conns: WebSocketConnectionModel[], channel: string): string[] {
  return conns.filter(c => c.active && c.channel === channel).map(c => c.connectionId);
}

// ─── Synchronizer ────────────────────────────────────────────

export class ApiSynchronizer {
  private routes = new Map<string, ApiRouteModel>();
  private logs: ApiRequestLogModel[] = [];
  private connections = new Map<string, WebSocketConnectionModel>();
  private routeOrder: string[] = [];

  registerRoute(r: ApiRouteModel) { this.routes.set(r.routeId, { ...r }); if (!this.routeOrder.includes(r.routeId)) this.routeOrder.push(r.routeId); }
  getRoute(id: string) { const r = this.routes.get(id); return r ? { ...r } : undefined; }
  getAllRoutes() { return this.routeOrder.map(id => ({ ...this.routes.get(id)! })); }
  hasRoute(id: string) { return this.routes.has(id); }

  addLog(log: ApiRequestLogModel) { this.logs.push({ ...log }); }
  getLogs() { return this.logs.map(l => ({ ...l })); }

  registerConnection(c: WebSocketConnectionModel) { this.connections.set(c.connectionId, { ...c }); }
  getConnection(id: string) { const c = this.connections.get(id); return c ? { ...c } : undefined; }
  getAllConnections() { return Array.from(this.connections.values()).map(c => ({ ...c })); }

  clear() { this.routes.clear(); this.logs = []; this.connections.clear(); this.routeOrder = []; }

  toJSON() {
    return {
      routes: this.getAllRoutes(),
      logs: this.getLogs(),
      connections: this.getAllConnections(),
      totalRoutes: this.routes.size,
      totalLogs: this.logs.length,
      activeConnections: Array.from(this.connections.values()).filter(c => c.active).length,
    };
  }

  fromJSON(data: { routes?: ApiRouteModel[]; logs?: ApiRequestLogModel[]; connections?: WebSocketConnectionModel[] }) {
    this.clear();
    (data.routes || []).forEach(r => this.registerRoute(r));
    (data.logs || []).forEach(l => this.addLog(l));
    (data.connections || []).forEach(c => this.registerConnection(c));
  }

  clone(): ApiSynchronizer {
    const c = new ApiSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
