import { QuestionType } from '@stemverse/database';

export type QuestionInput = {
  id: string;
  type: QuestionType;
  points: number;
  correctAnswer: unknown;
};

export type GradedAnswer = {
  questionId: string;
  correct: boolean;
  pointsEarned: number;
  pointsPossible: number;
};

export function gradeAnswer(
  question: QuestionInput,
  answer: unknown,
): GradedAnswer {
  const correct = isAnswerCorrect(question.type, question.correctAnswer, answer);
  return {
    questionId: question.id,
    correct,
    pointsEarned: correct ? question.points : 0,
    pointsPossible: question.points,
  };
}

export function gradeAssessment(
  questions: QuestionInput[],
  answers: Record<string, unknown>,
): {
  results: GradedAnswer[];
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  passingScore: number;
} {
  const results = questions.map((q) => gradeAnswer(q, answers[q.id]));
  const score = results.reduce((s, r) => s + r.pointsEarned, 0);
  const maxScore = results.reduce((s, r) => s + r.pointsPossible, 0);
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passingScore = 70;
  return {
    results,
    score,
    maxScore,
    percent,
    passed: percent >= passingScore,
    passingScore,
  };
}

export function isAnswerCorrect(
  type: QuestionType,
  correct: unknown,
  answer: unknown,
): boolean {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.TRUE_FALSE:
    case QuestionType.BLOCKLY_CHALLENGE:
    case QuestionType.CODE_REVIEW:
      return String(correct) === String(answer);
    case QuestionType.MULTIPLE_SELECT: {
      const a = normalizeSet(answer);
      const c = normalizeSet(correct);
      return a.length === c.length && a.every((v, i) => v === c[i]);
    }
    default:
      return false;
  }
}

function normalizeSet(value: unknown): string[] {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(String).sort();
}

export function buildCertificateMetadata(input: {
  certificateId: string;
  recipientName: string;
  courseTitle: string;
  level: string;
  issuedAt: Date;
  trackTitle?: string;
}) {
  return {
    certificateId: input.certificateId,
    recipientName: input.recipientName,
    courseTitle: input.courseTitle,
    trackTitle: input.trackTitle ?? null,
    level: input.level,
    issuedAt: input.issuedAt.toISOString(),
    issuedDate: input.issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    pdfReady: true,
    template: 'stemverse-certificate-v1',
  };
}
