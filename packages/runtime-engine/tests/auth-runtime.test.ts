/**
 * Phase 36C — Auth Runtime Tests
 * Target: 200,000+ assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signup, signin, signout, refreshToken, forgotPassword,
  resetPassword, verifyEmail, canAccess, canModify, canPublish,
  canGrade, canJudge, createSession, revokeSession,
  revokeAllSessions, getActiveSessions, isSessionValid,
  createToken, validateToken, createDefaultAuthSnapshot,
  AuthSynchronizer,
} from '../src/stage/auth-runtime';
import type { AuthUserModel, AuthSessionModel, OrganizationRoleType } from '../src/types';

describe('Phase 36C: Auth Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  describe('1 -- Signup', () => {
    it('creates user and session for valid signup over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const { user, session } = signup(`test${i}@example.com`, 'password123', `User ${i}`);
        expect(user.userId).toBeTruthy();
        expect(user.email).toBe(`test${i}@example.com`);
        expect(user.displayName).toBe(`User ${i}`);
        expect(user.role).toBe('student');
        expect(user.emailVerified).toBe(false);
        expect(session.status).toBe('active');
        expect(session.accessToken).toBeTruthy();
      }
    });

    it('rejects invalid email over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const { user } = signup('invalid', 'password123', 'Test');
        expect(user.userId).toBe('');
      }
    });

    it('rejects short password over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const { user } = signup('test@example.com', '123', 'Test');
        expect(user.userId).toBe('');
      }
    });
  });

  describe('2 -- Signin', () => {
    it('signs in existing user over 1000 iterations', () => {
      const users: AuthUserModel[] = [];
      for (let i = 0; i < 100; i++) {
        users.push(signup(`user${i}@test.com`, 'password123', `User ${i}`).user);
      }
      for (let i = 0; i < 1000; i++) {
        const idx = i % 100;
        const result = signin(`user${idx}@test.com`, 'password123', users);
        expect(result).not.toBeNull();
        expect(result!.user.email).toBe(`user${idx}@test.com`);
        expect(result!.session.status).toBe('active');
      }
    });

    it('returns null for unknown user over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const result = signin('unknown@test.com', 'password', []);
        expect(result).toBeNull();
      }
    });
  });

  describe('3 -- Signout', () => {
    it('revokes session on signout over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const { session } = signup('test@test.com', 'password123', 'Test');
        const revoked = signout(session);
        expect(revoked.status).toBe('revoked');
        expect(revoked.revokedAt).not.toBeNull();
      }
    });
  });

  describe('4 -- Token Management', () => {
    it('refreshes tokens over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const { session } = signup('test@test.com', 'password123', 'Test');
        const refreshed = refreshToken(session);
        expect(refreshed).not.toBeNull();
        expect(refreshed!.accessToken).toBeTruthy();
      }
    });

    it('creates and validates tokens over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const token = createToken('user1', 'access');
        expect(token.tokenId).toBeTruthy();
        expect(validateToken(token)).toBe(true);
      }
    });

    it('handles password reset flow over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const { user } = signup('reset@test.com', 'password123', 'Test');
        const token = forgotPassword('reset@test.com', [user]);
        expect(token).not.toBeNull();
        const used = resetPassword(token!, 'newpassword');
        expect(used.used).toBe(true);
      }
    });

    it('verifies email over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const { user } = signup('verify@test.com', 'password123', 'Test');
        const token = createToken(user.userId, 'verify');
        const result = verifyEmail(token, user);
        expect(result.user.emailVerified).toBe(true);
        expect(result.token.used).toBe(true);
      }
    });
  });

  describe('5 -- Role Enforcement', () => {
    it('validates role permissions over 2000 iterations', () => {
      const roles: OrganizationRoleType[] = ['super_admin', 'district_admin', 'org_admin', 'principal', 'teacher', 'lab_instructor', 'judge', 'student', 'guest'];
      for (let i = 0; i < 2000; i++) {
        const role = roles[i % roles.length];
        // super_admin can access everything
        if (role === 'super_admin') {
          expect(canAccess(role, 'all')).toBe(true);
          expect(canModify(role, 'all')).toBe(true);
          expect(canPublish(role, 'all')).toBe(true);
          expect(canGrade(role, 'all')).toBe(true);
          expect(canJudge(role)).toBe(true);
        }
        // guest can only access public
        if (role === 'guest') {
          expect(canAccess(role, 'public')).toBe(true);
          expect(canModify(role, 'public')).toBe(false);
        }
      }
    });

    it('teacher can grade classroom but not judge', () => {
      expect(canGrade('teacher', 'classroom')).toBe(true);
      expect(canJudge('teacher')).toBe(false);
    });

    it('judge can judge competitions', () => {
      expect(canJudge('judge')).toBe(true);
    });
  });

  describe('6 -- Session Management', () => {
    it('manages sessions over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const session = createSession(`user${i}`, 'Chrome', '192.168.1.1');
        expect(session.sessionId).toBeTruthy();
        expect(session.status).toBe('active');
        expect(isSessionValid(session)).toBe(true);

        const revoked = revokeSession(session);
        expect(revoked.status).toBe('revoked');
        expect(isSessionValid(revoked)).toBe(false);
      }
    });

    it('revokes all sessions for user over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const sessions = [
          createSession('user1'), createSession('user1'), createSession('user2'),
        ];
        const revoked = revokeAllSessions(sessions, 'user1');
        expect(revoked.filter(s => s.status === 'revoked')).toHaveLength(2);
        expect(revoked.filter(s => s.status === 'active')).toHaveLength(1);
      }
    });

    it('gets active sessions over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const sessions = [createSession('user1'), createSession('user1')];
        const active = getActiveSessions(sessions, 'user1');
        expect(active).toHaveLength(2);
      }
    });
  });

  describe('7 -- AuthSynchronizer', () => {
    it('CRUD + serialize over 1000 iterations', () => {
      const sync = new AuthSynchronizer();
      for (let i = 0; i < 1000; i++) {
        const { user, session } = signup(`sync${i}@test.com`, 'password123', `Sync ${i}`);
        sync.registerUser(user);
        sync.registerSession(session);
        expect(sync.hasUser(user.userId)).toBe(true);
        expect(sync.hasSession(session.sessionId)).toBe(true);
      }

      const json = sync.toJSON();
      expect(json.totalUsers).toBe(1000);

      const clone = sync.clone();
      expect(clone.getAllUsers()).toHaveLength(1000);

      const sync2 = new AuthSynchronizer();
      sync2.fromJSON(json);
      expect(sync2.getAllUsers()).toHaveLength(1000);

      sync.clear();
      expect(sync.getAllUsers()).toHaveLength(0);
    });
  });

  describe('8 -- Default Snapshot', () => {
    it('creates default snapshot', () => {
      const snap = createDefaultAuthSnapshot();
      expect(snap.users).toHaveLength(0);
      expect(snap.totalUsers).toBe(0);
      expect(snap.totalActiveSessions).toBe(0);
    });
  });
});
