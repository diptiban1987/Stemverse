/**
 * Phase 37B — Security Hardening Tests
 */
import { describe, it, expect } from 'vitest';
import {
  createDefaultCsp, cspToString, generateCsrfToken, validateCsrfToken,
  sanitizeInput, detectXssAttempt, createDefaultPasswordPolicy,
  validatePassword, getSecurityHeaders, createAbuseProtection,
  checkRequestAbuse, checkLoginAbuse, detectSqlInjection,
  logSecurityEvent, SecurityHardeningSynchronizer,
} from '../src/stage/security-hardening-runtime';

describe('Phase 37B: Security Hardening', () => {
  it('CSP management over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const csp = createDefaultCsp();
      expect(csp.defaultSrc).toContain("'self'");
      const str = cspToString(csp);
      expect(str).toContain("default-src 'self'");
      expect(str).toContain("object-src 'none'");
    }
  });

  it('CSRF token management over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const token = generateCsrfToken();
      expect(token.length).toBeGreaterThan(10);
      expect(validateCsrfToken(token, token)).toBe(true);
      expect(validateCsrfToken(token, 'wrong')).toBe(false);
      expect(validateCsrfToken('', token)).toBe(false);
    }
  });

  it('XSS prevention over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(detectXssAttempt('<script>alert(1)</script>')).toBe(true);
      expect(detectXssAttempt('javascript:void(0)')).toBe(true);
      expect(detectXssAttempt('onclick=hack()')).toBe(true);
      expect(detectXssAttempt('Hello World')).toBe(false);
    }
  });

  it('password validation over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const policy = createDefaultPasswordPolicy();
      expect(validatePassword('Str0ng!Pass', policy).valid).toBe(true);
      expect(validatePassword('weak', policy).valid).toBe(false);
      expect(validatePassword('nouppercase1!', policy).valid).toBe(false);
      expect(validatePassword('NOLOWERCASE1!', policy).valid).toBe(false);
      expect(validatePassword('NoNumbers!', policy).valid).toBe(false);
    }
  });

  it('security headers over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const headers = getSecurityHeaders(createDefaultCsp());
      expect(headers['Strict-Transport-Security']).toContain('max-age');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    }
  });

  it('abuse protection over 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const config = createAbuseProtection();
      expect(checkRequestAbuse(100, config).blocked).toBe(true);
      expect(checkRequestAbuse(30, config).blocked).toBe(false);
      expect(checkLoginAbuse(5, config).locked).toBe(true);
      expect(checkLoginAbuse(3, config).locked).toBe(false);
      expect(detectSqlInjection("SELECT * FROM users")).toBe(true);
      expect(detectSqlInjection("Hello World")).toBe(false);
    }
  });

  it('SecurityHardeningSynchronizer lifecycle', () => {
    const sync = new SecurityHardeningSynchronizer();
    for (let i = 0; i < 100; i++) {
      sync.addAuditEntry(logSecurityEvent('login_attempt', '1.2.3.4', `Attempt ${i}`, 'low'));
    }
    expect(sync.getRecentAuditEntries(50)).toHaveLength(50);
    const clone = sync.clone();
    expect(clone.getRecentAuditEntries(100)).toHaveLength(100);
    sync.clear();
    expect(sync.getRecentAuditEntries()).toHaveLength(0);
  });
});
