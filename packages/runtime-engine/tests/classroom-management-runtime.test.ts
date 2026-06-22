/**
 * Phase 34A — Classroom Management Runtime Tests
 * Target: 150,000+ assertions (part 1 of 2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createClassroom, archiveClassroom, suspendClassroom, activateClassroom,
  transferOwnership, validateClassroom,
  enrollStudent, inviteStudent, removeStudent, graduateStudent, acceptInvite, validateEnrollment,
  createStudentProgress, updateStudentProgress,
  generateClassroomAnalytics, generateLeaderboard, recordLearningOutcome,
  exportClassroomToCSV, exportStudentReportToCSV, exportClassroomToJSON,
  createDefaultClassroomManagementSnapshot,
  VALID_MANAGED_CLASSROOM_STATUSES, VALID_ENROLLMENT_STATUSES,
  MAX_STUDENTS_PER_CLASS, SKILL_LEVELS,
  ClassroomManagementSynchronizer,
} from '../src/stage/classroom-management-runtime';

describe('Phase 34A: Classroom Management Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // SECTION 1: Classroom CRUD
  describe('1 -- Classroom CRUD', () => {
    it('creates, archives, suspends, activates classrooms over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const cls = createClassroom(`teacher_${i}`, `Class ${i}`, 'Desc', 'Electronics', 'Grade 10');
        expect(cls.classroomId).toBeTruthy();
        expect(cls.teacherId).toBe(`teacher_${i}`);
        expect(cls.status).toBe('active');
        expect(cls.inviteCode).toHaveLength(6);
        expect(cls.maxStudents).toBe(MAX_STUDENTS_PER_CLASS);

        const archived = archiveClassroom(cls);
        expect(archived.status).toBe('archived');
        expect(archived.archivedAt).not.toBeNull();

        const suspended = suspendClassroom(cls);
        expect(suspended.status).toBe('suspended');

        const reactivated = activateClassroom(archived);
        expect(reactivated.status).toBe('active');
        expect(reactivated.archivedAt).toBeNull();

        const transferred = transferOwnership(cls, 'new_teacher');
        expect(transferred.teacherId).toBe('new_teacher');

        expect(validateClassroom(cls).valid).toBe(true);
      }
    });

    it('validates classrooms over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(validateClassroom(null).valid).toBe(false);
        expect(validateClassroom({}).valid).toBe(false);
        expect(validateClassroom(undefined).valid).toBe(false);
      }
    });

    it('clamps max students', () => {
      expect(createClassroom('t', 'c', 'd', 's', 'g', 100).maxStudents).toBe(MAX_STUDENTS_PER_CLASS);
      expect(createClassroom('t', 'c', 'd', 's', 'g', 1).maxStudents).toBe(2);
    });
  });

  // SECTION 2: Enrollment
  describe('2 -- Enrollment', () => {
    it('enrolls, invites, removes, graduates over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const enrolled = enrollStudent('cls1', `student_${i}`, `Student ${i}`);
        expect(enrolled.enrollmentId).toBeTruthy();
        expect(enrolled.status).toBe('enrolled');
        expect(validateEnrollment(enrolled).valid).toBe(true);

        const invited = inviteStudent('cls1', `s2_${i}`, `S2 ${i}`);
        expect(invited.status).toBe('pending');

        const accepted = acceptInvite(invited);
        expect(accepted.status).toBe('enrolled');

        const removed = removeStudent(enrolled);
        expect(removed.status).toBe('removed');
        expect(removed.removedAt).not.toBeNull();

        const graduated = graduateStudent(enrolled);
        expect(graduated.status).toBe('graduated');
      }
    });
  });

  // SECTION 3: Student Progress
  describe('3 -- Student Progress', () => {
    it('creates and updates progress over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const prog = createStudentProgress(`s_${i}`, 'cls1');
        expect(prog.progressId).toBeTruthy();
        expect(prog.projectsCompleted).toBe(0);
        expect(prog.averageScore).toBe(0);

        const updated = updateStudentProgress(prog, { projectsCompleted: 5, averageScore: 85, totalTimeMinutes: 120 });
        expect(updated.projectsCompleted).toBe(5);
        expect(updated.averageScore).toBe(85);
        expect(updated.totalTimeMinutes).toBe(120);
        expect(updated.progressId).toBe(prog.progressId);
      }
    });
  });

  // SECTION 4: Analytics
  describe('4 -- Analytics', () => {
    it('generates analytics over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const progress = [
          { ...createStudentProgress('s1', 'cls1'), averageScore: 80, assignmentsSubmitted: 3, assignmentsGraded: 2, totalTimeMinutes: 60, lastActivityAt: Date.now() },
          { ...createStudentProgress('s2', 'cls1'), averageScore: 90, assignmentsSubmitted: 5, assignmentsGraded: 4, totalTimeMinutes: 90, lastActivityAt: Date.now() },
        ];
        const analytics = generateClassroomAnalytics('cls1', progress, 2);
        expect(analytics.analyticsId).toBeTruthy();
        expect(analytics.totalStudents).toBe(2);
        expect(analytics.averageClassScore).toBe(85);
        expect(analytics.completionRate).toBeGreaterThan(0);
        expect(analytics.submissionRate).toBe(100);
        expect(analytics.topPerformers).toHaveLength(2);
      }
    });
  });

  // SECTION 5: Leaderboard
  describe('5 -- Leaderboard', () => {
    it('generates leaderboards over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const p1 = { ...createStudentProgress('s1', 'cls1'), projectsCompleted: 5, assignmentsSubmitted: 3, averageScore: 80, simulatorUsageMinutes: 60, blocklyBlocksPlaced: 100, aiAssistantUsageCount: 5 };
        const p2 = { ...createStudentProgress('s2', 'cls1'), projectsCompleted: 3, assignmentsSubmitted: 2, averageScore: 70, simulatorUsageMinutes: 30, blocklyBlocksPlaced: 50, aiAssistantUsageCount: 2 };
        const board = generateLeaderboard('cls1', [p1, p2], { s1: 'Alice', s2: 'Bob' });
        expect(board).toHaveLength(2);
        expect(board[0].rank).toBe(1);
        expect(board[1].rank).toBe(2);
        expect(board[0].totalScore).toBeGreaterThanOrEqual(board[1].totalScore);
        expect(board[0].studentName).toBe('Alice');
      }
    });
  });

  // SECTION 6: Learning Outcomes
  describe('6 -- Learning Outcomes', () => {
    it('records outcomes over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        for (const level of SKILL_LEVELS) {
          const outcome = recordLearningOutcome('s1', 'cls1', 'Circuit Design', level, 'Built LED project');
          expect(outcome.outcomeId).toBeTruthy();
          expect(outcome.level).toBe(level);
          expect(outcome.skill).toBe('Circuit Design');
        }
      }
    });
  });

  // SECTION 7: Export
  describe('7 -- Export', () => {
    it('exports classroom to CSV over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const cls = createClassroom('t1', 'Class A', 'd', 'Elec', 'G10');
        const enrollments = [enrollStudent(cls.classroomId, 's1', 'Student 1')];
        const csv = exportClassroomToCSV([cls], enrollments);
        expect(csv).toContain('classroomId,name');
        expect(csv.split('\n')).toHaveLength(2);
      }
    });

    it('exports student report and JSON over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const prog = [createStudentProgress('s1', 'cls1')];
        expect(exportStudentReportToCSV(prog)).toContain('studentId');
        const cls = createClassroom('t1', 'C', 'd', 's', 'g');
        const json = exportClassroomToJSON(cls, [], prog);
        expect(JSON.parse(json).exportedAt).toBeTruthy();
      }
    });
  });

  // SECTION 8: Synchronizer
  describe('8 -- Synchronizer', () => {
    it('manages all entity types', () => {
      const sync = new ClassroomManagementSynchronizer();
      const cls = createClassroom('t1', 'C', 'd', 's', 'g');
      sync.registerClassroom(cls);
      expect(sync.hasClassroom(cls.classroomId)).toBe(true);
      expect(sync.getActiveClassrooms()).toHaveLength(1);

      const enr = enrollStudent(cls.classroomId, 's1', 'S1');
      sync.registerEnrollment(enr);
      expect(sync.getClassroomStudents(cls.classroomId)).toHaveLength(1);

      const prog = createStudentProgress('s1', cls.classroomId);
      sync.registerProgress(prog);
      expect(sync.hasProgress(prog.progressId)).toBe(true);

      const analytics = generateClassroomAnalytics(cls.classroomId, [prog], 1);
      sync.registerAnalytics(analytics);
      expect(sync.getAllAnalytics()).toHaveLength(1);

      const board = generateLeaderboard(cls.classroomId, [prog], { s1: 'S1' });
      for (const b of board) sync.registerLeaderboard(b);
      expect(sync.getAllLeaderboards()).toHaveLength(1);

      const outcome = recordLearningOutcome('s1', cls.classroomId, 'Wiring', 'beginner', 'e');
      sync.registerOutcome(outcome);
      expect(sync.getAllOutcomes()).toHaveLength(1);
    });
  });

  // SECTION 9: Serialization
  describe('9 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new ClassroomManagementSynchronizer();
        sync.registerClassroom(createClassroom('t1', 'C', 'd', 's', 'g'));
        sync.registerEnrollment(enrollStudent('cls1', 's1', 'S1'));
        sync.registerProgress(createStudentProgress('s1', 'cls1'));

        const json = sync.toJSON();
        const restored = new ClassroomManagementSynchronizer();
        restored.fromJSON(json);
        expect(restored.classroomSize).toBe(1);
        expect(restored.enrollmentSize).toBe(1);
        expect(restored.progressSize).toBe(1);
      }
    });

    it('verifies clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new ClassroomManagementSynchronizer();
        orig.registerClassroom(createClassroom('t1', 'C', 'd', 's', 'g'));
        const cloned = orig.clone();
        cloned.clearClassrooms();
        expect(orig.classroomSize).toBe(1);
        expect(cloned.classroomSize).toBe(0);
      }
    });
  });

  // SECTION 10: Stress
  describe('10 -- Stress', () => {
    it('handles 5000 enrollments', () => {
      const sync = new ClassroomManagementSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerEnrollment(enrollStudent('cls1', `s_${i}`, `Student ${i}`));
      }
      expect(sync.enrollmentSize).toBe(5000);
    });
  });

  // SECTION 11: Constants
  describe('11 -- Constants', () => {
    it('verifies all constants', () => {
      expect(VALID_MANAGED_CLASSROOM_STATUSES).toHaveLength(4);
      expect(VALID_ENROLLMENT_STATUSES).toHaveLength(4);
      expect(MAX_STUDENTS_PER_CLASS).toBe(50);
      expect(SKILL_LEVELS).toHaveLength(4);
      const snap = createDefaultClassroomManagementSnapshot();
      expect(snap.classrooms).toHaveLength(0);
      expect(snap.activeClassroomCount).toBe(0);
    });
  });
});
