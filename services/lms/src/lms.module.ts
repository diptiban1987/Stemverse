import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessment/assessments.controller';
import { AssessmentsService } from './assessment/assessments.service';
import { AuthModule } from './auth/auth.module';
import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import {
  CertificatesController,
  ProgressController,
} from './progress/progress.controller';
import { ProgressService } from './progress/progress.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    CoursesController,
    AssessmentsController,
    ProgressController,
    CertificatesController,
  ],
  providers: [CoursesService, AssessmentsService, ProgressService],
})
export class LmsModule {}
