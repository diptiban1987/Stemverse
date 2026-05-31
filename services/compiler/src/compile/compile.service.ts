import { Inject, Injectable } from '@nestjs/common';
import {
  generateEsp32ProjectExport,
  generatePlatformioIni,
  generateSdkconfigDefaults,
  type Esp32BoardSlug,
} from '@stemverse/blockly-engine';
import { v4 as uuidv4 } from 'uuid';
import { BuildQueueService, type CompileJob } from './build-queue.service';
import { CompileBoard, CreateCompileJobDto } from './dto/create-compile.dto';

@Injectable()
export class CompileService {
  constructor(@Inject(BuildQueueService) private readonly queue: BuildQueueService) {}

  createJob(dto: CreateCompileJobDto): CompileJob {
    const id = uuidv4();
    const now = new Date().toISOString();
    const board = dto.board;

    let artifacts: Record<string, string> | undefined;
    const logs: string[] = [`[${now}] Job queued for board ${board}`];

    if (board === CompileBoard.ESP32 || board === CompileBoard.ESP32_S3) {
      const slug = board as Esp32BoardSlug;
      const mainSource =
        dto.sourceCode ??
        `#include "freertos/FreeRTOS.h"\nvoid app_main(void) { while(1) {} }`;
      const exportData = generateEsp32ProjectExport(
        slug,
        mainSource,
        dto.projectName ?? 'stemverse_project',
      );
      artifacts = exportData.files;
      logs.push(`Generated platformio.ini for ${slug}`);
      logs.push(`Generated sdkconfig.defaults`);
    } else {
      const sketch =
        dto.sourceCode ??
        'void setup() {\n}\n\nvoid loop() {\n}\n';
      artifacts = { 'sketch.ino': sketch };
      logs.push('Arduino sketch queued for arduino-cli compile');
    }

    const job: CompileJob = {
      id,
      projectId: dto.projectId,
      board,
      status: 'queued',
      logs,
      artifacts,
      createdAt: now,
      updatedAt: now,
    };

    this.queue.enqueue(job);
    return job;
  }

  getJob(id: string): CompileJob | undefined {
    return this.queue.getJob(id);
  }

  listJobs(): CompileJob[] {
    return this.queue.listJobs();
  }

  previewEsp32Export(board: Esp32BoardSlug) {
    return {
      platformioIni: generatePlatformioIni(board),
      sdkconfigDefaults: generateSdkconfigDefaults(board),
    };
  }
}
