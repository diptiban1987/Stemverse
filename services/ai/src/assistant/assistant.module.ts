import { Module } from '@nestjs/common';
import { ProviderRegistry } from '../providers/provider.registry';
import { AiModelRouterService } from '../routing/ai-model-router.service';
import { CopilotService } from '../copilot/copilot.service';
import { AiStreamService } from '../streaming/ai-stream.service';
import { UnifiedStreamingService } from '../streaming/unified-streaming.service';
import { AiMetricsService } from '../metrics/ai-metrics.service';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  controllers: [AssistantController],
  providers: [
    AssistantService,
    ProviderRegistry,
    AiModelRouterService,
    CopilotService,
    AiStreamService,
    UnifiedStreamingService,
    AiMetricsService,
  ],
  exports: [
    AssistantService,
    ProviderRegistry,
    AiModelRouterService,
    CopilotService,
    AiStreamService,
    UnifiedStreamingService,
    AiMetricsService,
  ],
})
export class AssistantModule {}
