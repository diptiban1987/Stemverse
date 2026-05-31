import { Body, Controller, Get, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiMetricsService } from '../metrics/ai-metrics.service';
import { AiStreamService } from '../streaming/ai-stream.service';
import { UnifiedStreamingService } from '../streaming/unified-streaming.service';
import { UnifiedStreamRequestDto } from './dto/unified-stream.dto';
import { initSseResponse, pipeStreamWithBatching } from '../streaming/stream-sse.helper';
import { AssistantService } from './assistant.service';
import {
  ExplainBlockDto,
  ExplainCodeDto,
  TextToBlocksDto,
  TextToProjectDto,
  WiringDto,
  CopilotDto,
  AutoFixDto,
  SimulatorAssistDto,
} from './dto/ai.dto';

@Controller('ai')
export class AssistantController {
  constructor(
    @Inject(AssistantService) private readonly assistant: AssistantService,
    @Inject(AiStreamService) private readonly stream: AiStreamService,
    @Inject(UnifiedStreamingService) private readonly unifiedStreaming: UnifiedStreamingService,
    @Inject(AiMetricsService) private readonly metrics: AiMetricsService,
  ) {}

  @Get('providers')
  listProviders() {
    return this.assistant.listProviders();
  }

  @Post('explain/block')
  explainBlock(@Body() dto: ExplainBlockDto) {
    return this.assistant.explainBlock(dto);
  }

  @Post('explain/code')
  explainCode(@Body() dto: ExplainCodeDto) {
    return this.assistant.explainCode(dto);
  }

  @Post('text-to-blocks')
  textToBlocks(@Body() dto: TextToBlocksDto) {
    return this.assistant.textToBlocks(dto);
  }

  @Post('text-to-project')
  textToProject(@Body() dto: TextToProjectDto) {
    return this.assistant.textToProject(dto);
  }

  @Post('wiring')
  wiring(@Body() dto: WiringDto) {
    return this.assistant.suggestWiring(dto);
  }

  @Get('models')
  listModels() {
    return this.assistant.listModels();
  }

  @Post('copilot')
  copilot(@Body() dto: CopilotDto) {
    return this.assistant.analyzeCopilot(dto);
  }

  /** Unified SSE pipeline for all AI Studio modes (Phase 5.1). */
  @Post('stream')
  async unifiedStream(@Body() dto: UnifiedStreamRequestDto, @Res() res: Response): Promise<void> {
    const ac = initSseResponse(res);
    await pipeStreamWithBatching(res, this.unifiedStreaming.stream(dto), ac.signal);
  }

  /** @deprecated Use POST /ai/stream — kept for backward compatibility. */
  @Post('copilot/stream')
  async copilotStream(@Body() dto: CopilotDto, @Res() res: Response): Promise<void> {
    const ac = initSseResponse(res);
    const unified: UnifiedStreamRequestDto = {
      mode: 'copilot',
      workspace: dto.workspace,
      generatedCode: dto.generatedCode,
      validationIssues: dto.validationIssues,
      simulatorMetadata: dto.simulatorMetadata,
      boardSlug: dto.boardSlug,
      model: dto.model,
      fallbackModel: dto.fallbackModel,
    };
    await pipeStreamWithBatching(res, this.unifiedStreaming.stream(unified), ac.signal);
  }

  @Get('providers/health')
  providerHealth() {
    return {
      streamingEnabled: this.stream.isStreamingEnabled(),
      providers: this.metrics.getProviderHealth(),
      freeModelPresets: this.metrics.getFreeModelPresets(),
      lastUsage: this.metrics.getLastUsage(),
    };
  }

  @Post('auto-fix')
  autoFix(@Body() dto: AutoFixDto) {
    return this.assistant.analyzeAutoFix(dto);
  }

  @Post('simulator')
  simulatorAssist(@Body() dto: SimulatorAssistDto) {
    return this.assistant.simulatorAssist(dto);
  }
}
