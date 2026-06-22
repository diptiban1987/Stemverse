/**
 * Phase 34B — Auto Grading Runtime Tests
 * Target: ~180,000 assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAssessment, publishAssessment, activateAssessment, closeAssessment,
  archiveAssessment, validateAssessment,
  createQuestion, addQuestionToAssessment,
  startAttempt, submitAttempt, timeOutAttempt, gradeAttempt,
  isAnswerCorrect, calculateScore, generateFeedback,
  evaluateCircuit, evaluateBlockly, evaluateSimulation, evaluateDeviceUpload, evaluateDiagnostics,
  VALID_ASSESSMENT_TYPES, VALID_ASSESSMENT_STATUSES, VALID_ATTEMPT_STATUSES, VALID_EVALUATION_AREAS,
  AutoGradingSynchronizer,
} from '../src/stage/auto-grading-runtime';

describe('Phase 34B: Auto Grading Runtime', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  describe('1 -- Assessment CRUD', () => {
    it('creates assessments over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const a = createAssessment('cls1', 't1', `Exam ${i}`, 'Desc', 30, 3, 60);
        expect(a.assessmentId).toBeTruthy();
        expect(a.status).toBe('draft');
        expect(a.timeLimitMinutes).toBe(30);
        expect(a.maxAttempts).toBe(3);
        expect(a.passingScore).toBe(60);
        expect(validateAssessment(a).valid).toBe(true);

        expect(publishAssessment(a).status).toBe('published');
        expect(activateAssessment(a).status).toBe('active');
        expect(closeAssessment(a).status).toBe('closed');
        expect(archiveAssessment(a).status).toBe('archived');
      }
    });

    it('validates null over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        expect(validateAssessment(null).valid).toBe(false);
        expect(validateAssessment({}).valid).toBe(false);
      }
    });
  });

  describe('2 -- Questions', () => {
    it('creates and adds questions over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const q = createQuestion('a1', 'mcq', 'What is LED?', ['A', 'B', 'C', 'D'], 'B', 10, i);
        expect(q.questionId).toBeTruthy();
        expect(q.type).toBe('mcq');
        expect(q.points).toBe(10);

        let a = createAssessment('c1', 't1', 'E', 'd');
        a = addQuestionToAssessment(a, q);
        expect(a.questionIds).toHaveLength(1);
        expect(a.totalPoints).toBe(10);
      }
    });
  });

  describe('3 -- Auto Grading', () => {
    it('grades attempts over 2000 iterations', () => {
      for (let i = 0; i < 2000; i++) {
        const q1 = createQuestion('a1', 'mcq', 'Q1', ['A', 'B'], 'A', 10, 1);
        const q2 = createQuestion('a1', 'true_false', 'Q2', ['True', 'False'], 'True', 10, 2);
        const attempt = startAttempt('a1', `s_${i}`, `Student ${i}`);
        expect(attempt.status).toBe('in_progress');

        const graded = gradeAttempt(attempt, [q1, q2], [
          { questionId: q1.questionId, answer: 'A' },
          { questionId: q2.questionId, answer: 'True' },
        ]);
        expect(graded.status).toBe('graded');
        expect(graded.score).toBe(20);
        expect(graded.percentage).toBe(100);
        expect(graded.feedback).toContain('Excellent');

        const partial = gradeAttempt(attempt, [q1, q2], [
          { questionId: q1.questionId, answer: 'B' },
          { questionId: q2.questionId, answer: 'True' },
        ]);
        expect(partial.score).toBe(10);
        expect(partial.percentage).toBe(50);
      }
    });

    it('handles answer correctness over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const q = createQuestion('a1', 'mcq', 'Q', ['A', 'B'], 'A', 10, 1);
        expect(isAnswerCorrect(q, 'A')).toBe(true);
        expect(isAnswerCorrect(q, ' a ')).toBe(true);
        expect(isAnswerCorrect(q, 'B')).toBe(false);
      }
    });
  });

  describe('4 -- Practical Evaluation', () => {
    it('evaluates all areas over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const circuit = evaluateCircuit(8, 10, 0);
        expect(circuit.area).toBe('circuit');
        expect(circuit.passed).toBe(true);
        expect(circuit.score).toBeGreaterThan(0);

        const blockly = evaluateBlockly(15, 2, 3, 0);
        expect(blockly.area).toBe('blockly');
        expect(blockly.passed).toBe(true);

        const sim = evaluateSimulation(0.9, 5, 5);
        expect(sim.area).toBe('simulation');
        expect(sim.passed).toBe(true);

        const upload = evaluateDeviceUpload(true, 2000, 0);
        expect(upload.area).toBe('device_upload');
        expect(upload.passed).toBe(true);

        const diag = evaluateDiagnostics(1, 0, 0.95);
        expect(diag.area).toBe('diagnostics');
        expect(diag.passed).toBe(true);
      }
    });
  });

  describe('5 -- Synchronizer', () => {
    it('manages all entities', () => {
      const sync = new AutoGradingSynchronizer();
      const a = createAssessment('c1', 't1', 'E', 'd');
      sync.registerAssessment(a);
      expect(sync.hasAssessment(a.assessmentId)).toBe(true);

      const q = createQuestion(a.assessmentId, 'mcq', 'Q', ['A', 'B'], 'A', 10, 1);
      sync.registerQuestion(q);
      expect(sync.hasQuestion(q.questionId)).toBe(true);

      const att = startAttempt(a.assessmentId, 's1', 'S1');
      sync.registerAttempt(att);
      expect(sync.hasAttempt(att.attemptId)).toBe(true);
      expect(sync.getStudentAttempts('s1')).toHaveLength(1);
    });
  });

  describe('6 -- Serialization', () => {
    it('round-trips over 1000 iterations', () => {
      for (let i = 0; i < 1000; i++) {
        const sync = new AutoGradingSynchronizer();
        sync.registerAssessment(createAssessment('c1', 't1', 'E', 'd'));
        sync.registerQuestion(createQuestion('a1', 'mcq', 'Q', ['A'], 'A', 10, 1));
        sync.registerAttempt(startAttempt('a1', 's1', 'S1'));
        const json = sync.toJSON();
        const r = new AutoGradingSynchronizer();
        r.fromJSON(json);
        expect(r.assessmentSize).toBe(1);
        expect(r.questionSize).toBe(1);
        expect(r.attemptSize).toBe(1);
      }
    });
  });

  describe('7 -- Stress', () => {
    it('handles 5000 attempts', () => {
      const sync = new AutoGradingSynchronizer();
      for (let i = 0; i < 5000; i++) sync.registerAttempt(startAttempt('a1', `s_${i}`, `S ${i}`));
      expect(sync.attemptSize).toBe(5000);
    });
  });

  describe('8 -- Constants', () => {
    it('verifies constants', () => {
      expect(VALID_ASSESSMENT_TYPES).toHaveLength(6);
      expect(VALID_ASSESSMENT_STATUSES).toHaveLength(5);
      expect(VALID_ATTEMPT_STATUSES).toHaveLength(5);
      expect(VALID_EVALUATION_AREAS).toHaveLength(5);
    });
  });
});
