import { describe, expect, it } from 'vitest';
import { QuestionType } from '@stemverse/database';
import {
  buildCertificateMetadata,
  gradeAssessment,
  isAnswerCorrect,
} from '../src/assessment/grading.util';

describe('assessment grading', () => {
  const questions = [
    {
      id: 'q1',
      type: QuestionType.MULTIPLE_CHOICE,
      points: 2,
      correctAnswer: 'b',
    },
    {
      id: 'q2',
      type: QuestionType.TRUE_FALSE,
      points: 1,
      correctAnswer: 'true',
    },
    {
      id: 'q3',
      type: QuestionType.MULTIPLE_SELECT,
      points: 2,
      correctAnswer: ['a', 'c'],
    },
  ];

  it('grades multiple choice and true/false', () => {
    expect(isAnswerCorrect(QuestionType.MULTIPLE_CHOICE, 'b', 'b')).toBe(true);
    expect(isAnswerCorrect(QuestionType.TRUE_FALSE, 'true', 'false')).toBe(false);
  });

  it('grades full assessment with passing score', () => {
    const result = gradeAssessment(questions, {
      q1: 'b',
      q2: 'true',
      q3: ['a', 'c'],
    });
    expect(result.score).toBe(5);
    expect(result.maxScore).toBe(5);
    expect(result.percent).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('builds PDF-ready certificate metadata', () => {
    const meta = buildCertificateMetadata({
      certificateId: 'cert-1',
      recipientName: 'Alex Student',
      courseTitle: 'Robotics Maker',
      level: 'BEGINNER',
      issuedAt: new Date('2026-05-30'),
      trackTitle: 'Robotics Maker',
    });
    expect(meta.pdfReady).toBe(true);
    expect(meta.recipientName).toBe('Alex Student');
    expect(meta.issuedDate).toContain('2026');
  });
});
