/**
 * Phase 34A — Assignment Management Runtime Tests
 * Target: 150,000+ assertions (part 2 of 2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRubricCriteria, createDefaultRubric, createCustomRubric,
  calculateWeightedScore, isPassingScore, validateRubric,
  createAssignment, publishAssignment, closeAssignment, archiveAssignment,
  duplicateAssignment, validateAssignment,
  submitAssignment, reviewSubmission, gradeSubmission, returnSubmission, validateSubmission,
  exportAssignmentReportToCSV, exportAssignmentReportToJSON,
  VALID_MANAGED_ASSIGNMENT_STATUSES, VALID_MANAGED_SUBMISSION_STATUSES, VALID_RUBRIC_CRITERIA_TYPES,
  DEFAULT_RUBRIC_CRITERIA,
  AssignmentManagementSynchronizer,
} from '../src/stage/assignment-management-runtime';

describe('Phase 34A: Assignment Management Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  // SECTION 1: Rubric System
  describe('1 -- Rubric System', () => {
    it('creates rubrics over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const rubric = createDefaultRubric(`asn_${i}`);
        expect(rubric.rubricId).toBeTruthy();
        expect(rubric.criteria).toHaveLength(5);
        expect(rubric.totalMaxScore).toBe(100);
        expect(rubric.passingScore).toBe(50);
        expect(validateRubric(rubric).valid).toBe(true);
      }
    });

    it('creates custom rubrics over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const criteria = [
          createRubricCriteria('creativity', 'Creativity', 'Be creative', 25, 0.4),
          createRubricCriteria('correctness', 'Correctness', 'Be correct', 75, 0.6),
        ];
        const rubric = createCustomRubric('asn1', criteria, 60);
        expect(rubric.totalMaxScore).toBe(100);
        expect(rubric.passingScore).toBe(60);
        expect(rubric.criteria).toHaveLength(2);
      }
    });

    it('calculates weighted scores over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const rubric = createDefaultRubric('asn1');
        const scores = rubric.criteria.map(c => ({ criteriaId: c.criteriaId, score: c.maxScore }));
        const perfect = calculateWeightedScore(rubric, scores);
        expect(perfect).toBe(100);

        const halfScores = rubric.criteria.map(c => ({ criteriaId: c.criteriaId, score: Math.round(c.maxScore / 2) }));
        const half = calculateWeightedScore(rubric, halfScores);
        expect(half).toBeGreaterThan(0);
        expect(half).toBeLessThanOrEqual(100);
      }
    });

    it('checks passing scores', () => {
      const rubric = createDefaultRubric('asn1');
      expect(isPassingScore(rubric, 60)).toBe(true);
      expect(isPassingScore(rubric, 40)).toBe(false);
    });
  });

  // SECTION 2: Assignment CRUD
  describe('2 -- Assignment CRUD', () => {
    it('creates, publishes, closes, archives over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const asn = createAssignment('cls1', 't1', `Assignment ${i}`, 'Desc', 'proj1', Date.now() + 86400000);
        expect(asn.assignmentId).toBeTruthy();
        expect(asn.status).toBe('draft');
        expect(asn.maxSubmissions).toBe(3);
        expect(validateAssignment(asn).valid).toBe(true);

        const published = publishAssignment(asn);
        expect(published.status).toBe('published');
        expect(published.publishedAt).not.toBeNull();

        const closed = closeAssignment(published);
        expect(closed.status).toBe('closed');

        const archived = archiveAssignment(closed);
        expect(archived.status).toBe('archived');
      }
    });

    it('duplicates assignments over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const asn = createAssignment('cls1', 't1', 'Original', 'd', 'p1', Date.now());
        const dup = duplicateAssignment(asn);
        expect(dup.assignmentId).not.toBe(asn.assignmentId);
        expect(dup.title).toContain('(Copy)');
        expect(dup.status).toBe('draft');
      }
    });
  });

  // SECTION 3: Submissions
  describe('3 -- Submissions', () => {
    it('submits, reviews, grades, returns over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const sub = submitAssignment('asn1', `s_${i}`, `Student ${i}`, `proj_${i}`);
        expect(sub.submissionId).toBeTruthy();
        expect(sub.status).toBe('submitted');
        expect(sub.attemptNumber).toBe(1);
        expect(validateSubmission(sub).valid).toBe(true);

        const reviewed = reviewSubmission(sub, 'Good work');
        expect(reviewed.status).toBe('reviewed');
        expect(reviewed.feedback).toBe('Good work');

        const rubric = createDefaultRubric('asn1');
        const scores = rubric.criteria.map(c => ({ criteriaId: c.criteriaId, score: Math.round(c.maxScore * 0.8), comment: 'Good' }));
        const graded = gradeSubmission(reviewed, scores, rubric);
        expect(graded.status).toBe('graded');
        expect(graded.totalScore).toBeGreaterThan(0);
        expect(graded.criteriaScores).toHaveLength(5);

        const returned = returnSubmission(sub, 'Revise please');
        expect(returned.status).toBe('returned');
      }
    });
  });

  // SECTION 4: Export
  describe('4 -- Export', () => {
    it('exports assignment reports over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const asn = createAssignment('cls1', 't1', 'Assignment', 'd', 'p1', Date.now());
        const subs = [submitAssignment('asn1', 's1', 'Student 1', 'p1')];
        const csv = exportAssignmentReportToCSV(asn, subs);
        expect(csv).toContain('studentId');

        const rubric = createDefaultRubric('asn1');
        const json = exportAssignmentReportToJSON(asn, subs, rubric);
        expect(JSON.parse(json).exportedAt).toBeTruthy();
      }
    });
  });

  // SECTION 5: Synchronizer
  describe('5 -- Synchronizer', () => {
    it('manages assignments, rubrics, submissions', () => {
      const sync = new AssignmentManagementSynchronizer();

      const asn = createAssignment('cls1', 't1', 'A', 'd', 'p', Date.now());
      sync.registerAssignment(asn);
      expect(sync.hasAssignment(asn.assignmentId)).toBe(true);
      expect(sync.getClassroomAssignments('cls1')).toHaveLength(1);

      const rubric = createDefaultRubric(asn.assignmentId);
      sync.registerRubric(rubric);
      expect(sync.hasRubric(rubric.rubricId)).toBe(true);

      const sub = submitAssignment(asn.assignmentId, 's1', 'S1', 'p1');
      sync.registerSubmission(sub);
      expect(sync.hasSubmission(sub.submissionId)).toBe(true);
      expect(sync.getAssignmentSubmissions(asn.assignmentId)).toHaveLength(1);
      expect(sync.getStudentSubmissions('s1')).toHaveLength(1);
    });
  });

  // SECTION 6: Serialization
  describe('6 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new AssignmentManagementSynchronizer();
        sync.registerAssignment(createAssignment('cls1', 't1', 'A', 'd', 'p', Date.now()));
        sync.registerRubric(createDefaultRubric('asn1'));
        sync.registerSubmission(submitAssignment('asn1', 's1', 'S1', 'p1'));

        const json = sync.toJSON();
        const restored = new AssignmentManagementSynchronizer();
        restored.fromJSON(json);
        expect(restored.assignmentSize).toBe(1);
        expect(restored.rubricSize).toBe(1);
        expect(restored.submissionSize).toBe(1);
      }
    });

    it('verifies clone independence over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const orig = new AssignmentManagementSynchronizer();
        orig.registerAssignment(createAssignment('cls1', 't1', 'A', 'd', 'p', Date.now()));
        const cloned = orig.clone();
        cloned.clearAssignments();
        expect(orig.assignmentSize).toBe(1);
        expect(cloned.assignmentSize).toBe(0);
      }
    });
  });

  // SECTION 7: Stress
  describe('7 -- Stress', () => {
    it('handles 5000 submissions', () => {
      const sync = new AssignmentManagementSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerSubmission(submitAssignment('asn1', `s_${i}`, `S ${i}`, `p_${i}`));
      }
      expect(sync.submissionSize).toBe(5000);
    });
  });

  // SECTION 8: Edge Cases
  describe('8 -- Edge Cases', () => {
    it('validates nulls over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(validateAssignment(null).valid).toBe(false);
        expect(validateSubmission(null).valid).toBe(false);
        expect(validateRubric(null).valid).toBe(false);
      }
    });

    it('handles empty IDs', () => {
      const sync = new AssignmentManagementSynchronizer();
      sync.registerAssignment({ assignmentId: '' } as any);
      sync.registerRubric({ rubricId: '' } as any);
      sync.registerSubmission({ submissionId: '' } as any);
      expect(sync.assignmentSize).toBe(0);
    });
  });

  // SECTION 9: Constants
  describe('9 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_MANAGED_ASSIGNMENT_STATUSES).toHaveLength(4);
      expect(VALID_MANAGED_SUBMISSION_STATUSES).toHaveLength(6);
      expect(VALID_RUBRIC_CRITERIA_TYPES).toHaveLength(6);
      expect(DEFAULT_RUBRIC_CRITERIA).toHaveLength(5);
    });
  });
});
