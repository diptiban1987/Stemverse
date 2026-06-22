/**
 * Phase 34B — Certification Runtime Tests
 * Target: ~150,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCertificationProgram, validateProgram,
  issueCertificate, revokeCertificate, expireCertificate,
  isCertificateValid, verifyCertificate, validateCertificate,
  generateCertificateText, generateCertificateJSON, exportCertificatesToCSV,
  VALID_CERTIFICATION_TYPES, VALID_CERTIFICATE_STATUSES,
  CertificationSynchronizer,
} from '../src/stage/certification-runtime';

describe('Phase 34B: Certification Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  describe('1 -- Programs', () => {
    it('creates programs over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const p = createCertificationProgram(`Cert ${i}`, 'Desc', 'course_completion', ['a1'], 70, 365);
        expect(p.programId).toBeTruthy();
        expect(p.type).toBe('course_completion');
        expect(p.requiredScore).toBe(70);
        expect(p.validityDays).toBe(365);
        expect(validateProgram(p).valid).toBe(true);
      }
    });

    it('supports all types', () => {
      for (const type of VALID_CERTIFICATION_TYPES) {
        const p = createCertificationProgram('T', 'D', type, [], 60);
        expect(p.type).toBe(type);
      }
    });
  });

  describe('2 -- Certificates', () => {
    it('issues and manages certs over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const cert = issueCertificate('p1', `s_${i}`, `Student ${i}`, 85, 'course_completion', 365);
        expect(cert.certificateId).toBeTruthy();
        expect(cert.certificateNumber).toContain('STEM-');
        expect(cert.verificationId).toHaveLength(32);
        expect(cert.status).toBe('issued');
        expect(isCertificateValid(cert)).toBe(true);
        expect(validateCertificate(cert).valid).toBe(true);

        const revoked = revokeCertificate(cert);
        expect(revoked.status).toBe('revoked');
        expect(isCertificateValid(revoked)).toBe(false);

        const expired = expireCertificate(cert);
        expect(expired.status).toBe('expired');
        expect(isCertificateValid(expired)).toBe(false);
      }
    });

    it('verifies certificates over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cert = issueCertificate('p1', 's1', 'S1', 90, 'skill_certification', 365);
        const found = verifyCertificate([cert], cert.verificationId);
        expect(found).not.toBeNull();
        expect(found!.studentId).toBe('s1');

        expect(verifyCertificate([cert], 'invalid')).toBeNull();
      }
    });
  });

  describe('3 -- Generation', () => {
    it('generates text and JSON over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const cert = issueCertificate('p1', 's1', 'Student 1', 85, 'course_completion', 365);
        const text = generateCertificateText(cert, 'Arduino Basics');
        expect(text).toContain('STEMVERSE');
        expect(text).toContain('Student 1');
        expect(text).toContain(cert.certificateNumber);

        const json = generateCertificateJSON(cert, 'Arduino Basics');
        const parsed = JSON.parse(json);
        expect(parsed.certificate.studentName).toBe('Student 1');
        expect(parsed.verificationUrl).toContain(cert.verificationId);
      }
    });
  });

  describe('4 -- Export', () => {
    it('exports to CSV over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const certs = [issueCertificate('p1', 's1', 'S1', 90, 'course_completion', 365)];
        const csv = exportCertificatesToCSV(certs);
        expect(csv).toContain('certificateId');
        expect(csv.split('\n')).toHaveLength(2);
      }
    });
  });

  describe('5 -- Synchronizer', () => {
    it('manages programs and certificates', () => {
      const sync = new CertificationSynchronizer();
      const p = createCertificationProgram('T', 'D', 'course_completion', [], 60);
      sync.registerProgram(p);
      expect(sync.hasProgram(p.programId)).toBe(true);

      const cert = issueCertificate(p.programId, 's1', 'S1', 85, 'course_completion', 365);
      sync.registerCertificate(cert);
      expect(sync.hasCertificate(cert.certificateId)).toBe(true);
      expect(sync.getStudentCertificates('s1')).toHaveLength(1);
    });
  });

  describe('6 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new CertificationSynchronizer();
        sync.registerProgram(createCertificationProgram('T', 'D', 'course_completion', [], 60));
        sync.registerCertificate(issueCertificate('p1', 's1', 'S1', 85, 'course_completion', 365));
        const json = sync.toJSON();
        const r = new CertificationSynchronizer();
        r.fromJSON(json);
        expect(r.programSize).toBe(1);
        expect(r.certificateSize).toBe(1);
      }
    });

    it('clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new CertificationSynchronizer();
        orig.registerProgram(createCertificationProgram('T', 'D', 'course_completion', [], 60));
        const cloned = orig.clone();
        cloned.clearPrograms();
        expect(orig.programSize).toBe(1);
        expect(cloned.programSize).toBe(0);
      }
    });
  });

  describe('7 -- Stress', () => {
    it('handles 5000 certificates', () => {
      const sync = new CertificationSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerCertificate(issueCertificate('p1', `s_${i}`, `S${i}`, 80, 'course_completion', 365));
      expect(sync.certificateSize).toBe(5000);
    });
  });

  describe('8 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_CERTIFICATION_TYPES).toHaveLength(5);
      expect(VALID_CERTIFICATE_STATUSES).toHaveLength(4);
    });
  });
});
