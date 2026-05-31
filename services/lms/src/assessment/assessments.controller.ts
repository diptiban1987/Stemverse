import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { QuestionType, UserRole } from '@stemverse/database';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@stemverse/auth';
import type { AssessmentForStudent, AssessmentWithQuestions } from '../types/prisma-payloads';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get(':id')
  getAssessment(@Param('id') id: string): Promise<AssessmentForStudent> {
    return this.assessments.getForStudent(id);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { answers: Record<string, unknown> },
  ) {
    return this.assessments.submit(user.id, id, body.answers);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.PLATFORM_ADMIN)
  create(
    @Body()
    body: {
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
    },
  ): Promise<AssessmentWithQuestions> {
    return this.assessments.createAssessment(body);
  }
}
