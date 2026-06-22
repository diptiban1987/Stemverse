/**
 * Phase 41B — School ERP Runtime Tests
 */
import { describe, it, expect } from 'vitest';
import {
  connectERP, disconnectERP, isERPProviderSupported, SUPPORTED_ERP_PROVIDERS,
  importERPStudent, linkERPStudent,
  importERPTeacher, linkERPTeacher,
  importERPClass, linkERPClass,
  syncAttendance, generateSyncReport,
} from '../src/stage/school-erp-runtime';

describe('School ERP: Connection', () => {
  it('connect all 4 providers — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      for (const provider of SUPPORTED_ERP_PROVIDERS) {
        let conn = connectERP(`t${i}`, provider, `https://erp.school${i}.edu`, `key_${i}`);
        expect(conn.status).toBe('connected');
        expect(conn.provider).toBe(provider);
        conn = disconnectERP(conn);
        expect(conn.status).toBe('disconnected');
      }
    }
  });

  it('provider support check', () => {
    for (let i = 0; i < 500; i++) {
      expect(isERPProviderSupported('fedena')).toBe(true);
      expect(isERPProviderSupported('openeducat')).toBe(true);
      expect(isERPProviderSupported('erpnext')).toBe(true);
      expect(isERPProviderSupported('custom_sis')).toBe(true);
      expect(isERPProviderSupported('invalid')).toBe(false);
    }
  });
});

describe('School ERP: Student Sync', () => {
  it('import and link students — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let student = importERPStudent(`ext_${i}`, `First${i}`, `Last${i}`, `student${i}@school.edu`, '8th', 'A', `R${i}`);
      expect(student.syncStatus).toBe('synced');
      expect(student.grade).toBe('8th');
      student = linkERPStudent(student, `user_${i}`);
      expect(student.stemverseUserId).toBe(`user_${i}`);
    }
  });
});

describe('School ERP: Teacher Sync', () => {
  it('import and link teachers — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let teacher = importERPTeacher(`ext_t${i}`, `Teacher${i}`, `Last${i}`, `teacher${i}@school.edu`, 'Science', ['Physics', 'Chemistry']);
      expect(teacher.syncStatus).toBe('synced');
      expect(teacher.subjects).toHaveLength(2);
      teacher = linkERPTeacher(teacher, `user_t${i}`);
      expect(teacher.stemverseUserId).toBe(`user_t${i}`);
    }
  });
});

describe('School ERP: Class Sync', () => {
  it('import and link classes — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      let cls = importERPClass(`ext_c${i}`, `Class ${i}`, '8th', 'A', '2025-26', `t${i}`, 30);
      expect(cls.syncStatus).toBe('synced');
      expect(cls.studentCount).toBe(30);
      cls = linkERPClass(cls, `classroom_${i}`);
      expect(cls.stemverseClassroomId).toBe(`classroom_${i}`);
    }
  });
});

describe('School ERP: Attendance', () => {
  it('sync attendance — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const present = syncAttendance(`s${i}`, '2026-06-22', true);
      expect(present.present).toBe(true);
      const absent = syncAttendance(`s${i}`, '2026-06-23', false);
      expect(absent.present).toBe(false);
    }
  });
});

describe('School ERP: Sync Report', () => {
  it('generate sync reports — 500 iterations', () => {
    for (let i = 0; i < 500; i++) {
      const report = generateSyncReport('fedena', 100, 10, 5, [], 2500);
      expect(report.studentsImported).toBe(100);
      expect(report.teachersImported).toBe(10);
      expect(report.classesImported).toBe(5);
      expect(report.errors).toHaveLength(0);

      const errorReport = generateSyncReport('erpnext', 80, 8, 3, ['Duplicate email'], 3000);
      expect(errorReport.errors).toHaveLength(1);
    }
  });
});
