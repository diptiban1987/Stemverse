import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@stemverse/auth';
import type { CertificateListItem, ProgressDashboard } from '../types/prisma-payloads';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: { id: string }): Promise<ProgressDashboard> {
    return this.progress.getDashboard(user.id);
  }

  @Post('enroll/:courseId')
  enroll(@CurrentUser() user: { id: string }, @Param('courseId') courseId: string) {
    return this.progress.enroll(user.id, courseId);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
  ) {
    return this.progress.completeLesson(user.id, lessonId);
  }

  @Post('projects/:lessonProjectId/complete')
  completeProject(
    @CurrentUser() user: { id: string },
    @Param('lessonProjectId') lessonProjectId: string,
    @Body() body: { projectId?: string },
  ) {
    return this.progress.completeProject(user.id, lessonProjectId, body.projectId);
  }
}

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  list(@CurrentUser() user: { id: string }): Promise<CertificateListItem[]> {
    return this.progress.listCertificates(user.id);
  }
}
