import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@stemverse/database';
import { PrismaService } from '../prisma/prisma.service';
import type { AssessmentForStudent, AssessmentWithQuestions } from '../types/prisma-payloads';
import { gradeAssessment } from './grading.util';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForStudent(assessmentId: string): Promise<AssessmentForStudent> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            type: true,
            prompt: true,
            options: true,
            points: true,
            sortOrder: true,
          },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async submit(userId: string, assessmentId: string, answers: Record<string, unknown>) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const graded = gradeAssessment(
      assessment.questions.map((q) => ({
        id: q.id,
        type: q.type,
        points: q.points,
        correctAnswer: q.correctAnswer,
      })),
      answers,
    );

    const passingScore = assessment.passingScore;
    const passed = graded.percent >= passingScore;

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        userId,
        assessmentId,
        score: graded.score,
        maxScore: graded.maxScore,
        passed,
        answers: { ...answers, _results: graded.results },
      },
    });

    return {
      attemptId: attempt.id,
      score: graded.score,
      maxScore: graded.maxScore,
      percent: Math.round(graded.percent),
      passed,
      passingScore,
      results: graded.results,
    };
  }

  createAssessment(data: {
    lessonId?: string;
    moduleId?: string;
    title: string;
    description?: string;
    passingScore?: number;
    questions: Array<{
      type: QuestionType;
      prompt: string;
      options?: unknown;
      correctAnswer: unknown;
      points?: number;
    }>;
  }): Promise<AssessmentWithQuestions> {
    const { questions, ...rest } = data;
    return this.prisma.assessment.create({
      data: {
        ...rest,
        questions: {
          create: questions.map((q, i) => ({
            type: q.type,
            prompt: q.prompt,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer as object,
            points: q.points ?? 1,
            sortOrder: i,
          })),
        },
      },
      include: { questions: true },
    });
  }
}
