import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { CompileService } from './compile.service';
import { CreateCompileJobDto } from './dto/create-compile.dto';

@Controller('compile')
export class CompileController {
  constructor(@Inject(CompileService) private readonly compile: CompileService) {}

  @Post()
  create(@Body() dto: CreateCompileJobDto) {
    const job = this.compile.createJob(dto);
    return { jobId: job.id, status: job.status, board: job.board };
  }

  @Get('jobs')
  list() {
    return this.compile.listJobs();
  }

  @Get(':jobId')
  get(@Param('jobId') jobId: string) {
    const job = this.compile.getJob(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }
}
