import { Module } from '@nestjs/common';
import { CompileController } from './compile.controller';
import { CompileService } from './compile.service';
import { BuildQueueService } from './build-queue.service';
import { ArduinoCliService } from './arduino-cli.service';

@Module({
  controllers: [CompileController],
  providers: [CompileService, BuildQueueService, ArduinoCliService],
  exports: [CompileService, ArduinoCliService],
})
export class CompileModule {}
