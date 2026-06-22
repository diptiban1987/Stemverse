/**
 * Phase 34B — Certification Runtime
 *
 * Certification programs, certificate generation,
 * verification IDs, certificate lifecycle.
 */

import type {
  CertificationProgramModel, CertificateModel,
  CertificationType, CertificateStatus,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 34B Cert]';

function generateCertificateNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'STEM-';
  for (let i = 0; i < 12; i++) { if (i > 0 && i % 4 === 0) s += '-'; s += chars.charAt(Math.floor(Math.random() * chars.length)); }
  return s;
}

function generateVerificationId(): string {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

export const VALID_CERTIFICATION_TYPES: CertificationType[] = ['course_completion', 'skill_certification', 'competition_certification', 'teacher_certification', 'robothrone_certification'];
export const VALID_CERTIFICATE_STATUSES: CertificateStatus[] = ['pending', 'issued', 'revoked', 'expired'];

// ─── Program CRUD ───────────────────────────────────────────

export function createCertificationProgram(
  title: string, description: string, type: CertificationType,
  requiredAssessmentIds: string[], requiredScore: number, validityDays?: number,
): CertificationProgramModel {
  return {
    programId: generateId(), title, description, type,
    requiredAssessmentIds: [...requiredAssessmentIds],
    requiredScore: Math.max(0, Math.min(100, requiredScore)),
    validityDays: validityDays ?? 365,
    createdAt: Date.now(), deleted: false,
  };
}

export function validateProgram(p: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!p || typeof p !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = p as Record<string, unknown>;
  if (typeof o.programId !== 'string' || !o.programId) { warnings.push(`${W} empty programId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Certificate Lifecycle ──────────────────────────────────

export function issueCertificate(
  programId: string, studentId: string, studentName: string,
  score: number, type: CertificationType, validityDays: number,
): CertificateModel {
  const now = Date.now();
  return {
    certificateId: generateId(), programId, studentId, studentName,
    certificateNumber: generateCertificateNumber(),
    verificationId: generateVerificationId(),
    status: 'issued', issuedAt: now,
    expiresAt: validityDays > 0 ? now + validityDays * 24 * 60 * 60 * 1000 : null,
    revokedAt: null, score, type,
  };
}

export function revokeCertificate(cert: CertificateModel): CertificateModel {
  const c = deepCopy(cert); c.status = 'revoked'; c.revokedAt = Date.now(); return c;
}

export function expireCertificate(cert: CertificateModel): CertificateModel {
  const c = deepCopy(cert); c.status = 'expired'; return c;
}

export function isCertificateValid(cert: CertificateModel): boolean {
  if (cert.status !== 'issued') return false;
  if (cert.expiresAt && Date.now() > cert.expiresAt) return false;
  return true;
}

export function verifyCertificate(certs: CertificateModel[], verificationId: string): CertificateModel | null {
  return certs.find(c => c.verificationId === verificationId && isCertificateValid(c)) || null;
}

export function validateCertificate(c: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!c || typeof c !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = c as Record<string, unknown>;
  if (typeof o.certificateId !== 'string' || !o.certificateId) { warnings.push(`${W} empty certificateId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Certificate Generation (text representations) ──────────

export function generateCertificateText(cert: CertificateModel, programTitle: string): string {
  return [
    '═══════════════════════════════════════════════',
    '       STEMVERSE CERTIFICATE OF ACHIEVEMENT    ',
    '═══════════════════════════════════════════════',
    '',
    `  This certifies that ${cert.studentName}`,
    `  has successfully completed: ${programTitle}`,
    `  with a score of ${cert.score}%`,
    '',
    `  Certificate Number: ${cert.certificateNumber}`,
    `  Verification ID: ${cert.verificationId}`,
    `  Issued: ${new Date(cert.issuedAt).toISOString().split('T')[0]}`,
    cert.expiresAt ? `  Expires: ${new Date(cert.expiresAt).toISOString().split('T')[0]}` : '  Validity: Lifetime',
    '',
    '═══════════════════════════════════════════════',
  ].join('\n');
}

export function generateCertificateJSON(cert: CertificateModel, programTitle: string): string {
  return JSON.stringify({
    certificate: deepCopy(cert), programTitle,
    verificationUrl: `https://stemverse.app/verify/${cert.verificationId}`,
    generatedAt: new Date().toISOString(),
  }, null, 2);
}

// ─── Export ─────────────────────────────────────────────────

export function exportCertificatesToCSV(certs: CertificateModel[]): string {
  const lines = ['certificateId,studentName,certificateNumber,status,type,score,issuedAt'];
  for (const c of certs) lines.push(`${c.certificateId},${c.studentName},${c.certificateNumber},${c.status},${c.type},${c.score},${c.issuedAt}`);
  return lines.join('\n');
}

// ─── CertificationSynchronizer ──────────────────────────────

export class CertificationSynchronizer {
  private readonly programs = new Map<string, CertificationProgramModel>();
  private readonly programOrder: string[] = [];
  private readonly certificates = new Map<string, CertificateModel>();
  private readonly certificateOrder: string[] = [];

  public registerProgram(p: CertificationProgramModel): void {
    if (!p.programId) { console.warn(`${W} empty programId`); return; }
    const c = deepCopy(p);
    if (this.programs.has(p.programId)) { this.programs.set(p.programId, c); return; }
    this.programs.set(p.programId, c); this.programOrder.push(p.programId);
  }
  public getProgram(id: string): CertificationProgramModel | undefined { const v = this.programs.get(id); return v ? deepCopy(v) : undefined; }
  public getAllPrograms(): CertificationProgramModel[] { return this.programOrder.filter(id => this.programs.has(id)).map(id => deepCopy(this.programs.get(id)!)); }
  public hasProgram(id: string): boolean { return this.programs.has(id); }
  public clearPrograms(): void { this.programs.clear(); this.programOrder.length = 0; }

  public registerCertificate(c: CertificateModel): void {
    if (!c.certificateId) { console.warn(`${W} empty certificateId`); return; }
    const cp = deepCopy(c);
    if (this.certificates.has(c.certificateId)) { this.certificates.set(c.certificateId, cp); return; }
    this.certificates.set(c.certificateId, cp); this.certificateOrder.push(c.certificateId);
  }
  public getCertificate(id: string): CertificateModel | undefined { const v = this.certificates.get(id); return v ? deepCopy(v) : undefined; }
  public getAllCertificates(): CertificateModel[] { return this.certificateOrder.filter(id => this.certificates.has(id)).map(id => deepCopy(this.certificates.get(id)!)); }
  public getStudentCertificates(studentId: string): CertificateModel[] { return this.getAllCertificates().filter(c => c.studentId === studentId); }
  public hasCertificate(id: string): boolean { return this.certificates.has(id); }
  public clearCertificates(): void { this.certificates.clear(); this.certificateOrder.length = 0; }

  public clear(): void { this.clearPrograms(); this.clearCertificates(); }
  public toJSON() { return { programs: this.getAllPrograms(), certificates: this.getAllCertificates() }; }
  public fromJSON(j: Partial<{ programs: CertificationProgramModel[]; certificates: CertificateModel[] }>): void {
    this.clear(); if (!j) return;
    for (const p of j.programs || []) this.registerProgram(p);
    for (const c of j.certificates || []) this.registerCertificate(c);
  }
  public clone(): CertificationSynchronizer { const c = new CertificationSynchronizer(); c.fromJSON(this.toJSON()); return c; }
  public get programSize(): number { return this.programs.size; }
  public get certificateSize(): number { return this.certificates.size; }
}
