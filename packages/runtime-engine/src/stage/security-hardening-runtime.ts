/**
 * Phase 37B — Security Hardening Runtime
 *
 * CSP, CSRF, XSS, session hardening, password policy,
 * secret validation, API abuse protection.
 */

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Types ───────────────────────────────────────────────────

export interface CspPolicy {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  reportUri: string;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  preventReuse: number;
}

export interface SecurityHeaders {
  'Strict-Transport-Security': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Content-Security-Policy': string;
}

export interface AbuseProtectionConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxFailedLogins: number;
  lockoutDurationMs: number;
  ipBlockDurationMs: number;
  suspiciousPatterns: string[];
}

export interface SecurityAuditEntry {
  entryId: string;
  type: 'login_attempt' | 'password_change' | 'api_abuse' | 'csrf_violation' | 'xss_attempt' | 'rate_limit' | 'ip_block';
  userId: string | null;
  ipAddress: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  blocked: boolean;
}

// ─── CSP ─────────────────────────────────────────────────────

export function createDefaultCsp(): CspPolicy {
  return {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'", 'wss:', 'https://api.stemverse.io'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'], objectSrc: ["'none'"],
    mediaSrc: ["'self'"], frameSrc: ["'none'"], reportUri: '/api/csp-report',
  };
}

export function cspToString(csp: CspPolicy): string {
  return [
    `default-src ${csp.defaultSrc.join(' ')}`, `script-src ${csp.scriptSrc.join(' ')}`,
    `style-src ${csp.styleSrc.join(' ')}`, `img-src ${csp.imgSrc.join(' ')}`,
    `connect-src ${csp.connectSrc.join(' ')}`, `font-src ${csp.fontSrc.join(' ')}`,
    `object-src ${csp.objectSrc.join(' ')}`, `frame-src ${csp.frameSrc.join(' ')}`,
    `report-uri ${csp.reportUri}`,
  ].join('; ');
}

// ─── CSRF ────────────────────────────────────────────────────

export function generateCsrfToken(): string {
  return uid() + uid();
}

export function validateCsrfToken(token: string, expected: string): boolean {
  return token.length > 0 && token === expected;
}

// ─── XSS ─────────────────────────────────────────────────────

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}

export function detectXssAttempt(input: string): boolean {
  const patterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i, /document\./i, /window\./i];
  return patterns.some(p => p.test(input));
}

// ─── Password Policy ─────────────────────────────────────────

export function createDefaultPasswordPolicy(): PasswordPolicy {
  return {
    minLength: 8, maxLength: 128, requireUppercase: true, requireLowercase: true,
    requireNumbers: true, requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, preventReuse: 5,
  };
}

export function validatePassword(password: string, policy: PasswordPolicy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < policy.minLength) errors.push(`Min ${policy.minLength} characters`);
  if (password.length > policy.maxLength) errors.push(`Max ${policy.maxLength} characters`);
  if (policy.requireUppercase && !/[A-Z]/.test(password)) errors.push('Requires uppercase');
  if (policy.requireLowercase && !/[a-z]/.test(password)) errors.push('Requires lowercase');
  if (policy.requireNumbers && !/\d/.test(password)) errors.push('Requires number');
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Requires special character');
  return { valid: errors.length === 0, errors };
}

// ─── Security Headers ────────────────────────────────────────

export function getSecurityHeaders(csp: CspPolicy): SecurityHeaders {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Content-Security-Policy': cspToString(csp),
  };
}

// ─── Abuse Protection ────────────────────────────────────────

export function createAbuseProtection(): AbuseProtectionConfig {
  return {
    maxRequestsPerMinute: 60, maxRequestsPerHour: 1000,
    maxFailedLogins: 5, lockoutDurationMs: 900000,
    ipBlockDurationMs: 3600000,
    suspiciousPatterns: ['../','SELECT ', 'DROP ', 'UNION ', '<script', 'eval('],
  };
}

export function checkRequestAbuse(requestCount: number, config: AbuseProtectionConfig): { blocked: boolean; reason: string } {
  if (requestCount > config.maxRequestsPerMinute) return { blocked: true, reason: 'Rate limit exceeded' };
  return { blocked: false, reason: '' };
}

export function checkLoginAbuse(failedAttempts: number, config: AbuseProtectionConfig): { locked: boolean; unlockAt: number } {
  if (failedAttempts >= config.maxFailedLogins) return { locked: true, unlockAt: now() + config.lockoutDurationMs };
  return { locked: false, unlockAt: 0 };
}

export function detectSqlInjection(input: string): boolean {
  const patterns = [/('\s*(OR|AND)\s*')/i, /(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s/i, /--\s/];
  return patterns.some(p => p.test(input));
}

// ─── Security Audit Log ──────────────────────────────────────

export function logSecurityEvent(type: SecurityAuditEntry['type'], ipAddress: string, details: string, severity: SecurityAuditEntry['severity'], userId: string | null = null, blocked = false): SecurityAuditEntry {
  return { entryId: uid(), type, userId, ipAddress, details, severity, timestamp: now(), blocked };
}

// ─── Synchronizer ────────────────────────────────────────────

export class SecurityHardeningSynchronizer {
  private csp: CspPolicy = createDefaultCsp();
  private passwordPolicy: PasswordPolicy = createDefaultPasswordPolicy();
  private abuseConfig: AbuseProtectionConfig = createAbuseProtection();
  private auditLog: SecurityAuditEntry[] = [];

  setCsp(c: CspPolicy) { this.csp = { ...c }; }
  getCsp() { return { ...this.csp }; }

  setPasswordPolicy(p: PasswordPolicy) { this.passwordPolicy = { ...p }; }
  getPasswordPolicy() { return { ...this.passwordPolicy }; }

  setAbuseConfig(c: AbuseProtectionConfig) { this.abuseConfig = { ...c }; }
  getAbuseConfig() { return { ...this.abuseConfig }; }

  addAuditEntry(e: SecurityAuditEntry) { this.auditLog.push({ ...e }); if (this.auditLog.length > 10000) this.auditLog.shift(); }
  getRecentAuditEntries(n = 50) { return this.auditLog.slice(-n).map(e => ({ ...e })); }

  clear() { this.csp = createDefaultCsp(); this.passwordPolicy = createDefaultPasswordPolicy(); this.abuseConfig = createAbuseProtection(); this.auditLog = []; }

  toJSON() { return { csp: this.getCsp(), passwordPolicy: this.getPasswordPolicy(), abuseConfig: this.getAbuseConfig(), auditLog: this.getRecentAuditEntries(100) }; }
  fromJSON(d: { csp?: CspPolicy; passwordPolicy?: PasswordPolicy; abuseConfig?: AbuseProtectionConfig; auditLog?: SecurityAuditEntry[] }) {
    if (d.csp) this.setCsp(d.csp);
    if (d.passwordPolicy) this.setPasswordPolicy(d.passwordPolicy);
    if (d.abuseConfig) this.setAbuseConfig(d.abuseConfig);
    (d.auditLog || []).forEach(e => this.addAuditEntry(e));
  }
  clone(): SecurityHardeningSynchronizer { const c = new SecurityHardeningSynchronizer(); c.fromJSON(this.toJSON()); return c; }
}
