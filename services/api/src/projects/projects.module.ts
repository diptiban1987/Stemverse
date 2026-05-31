import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, AuditService],
})
export class ProjectsModule {}
