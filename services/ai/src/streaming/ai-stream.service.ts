import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';
import { CopilotService } from '../copilot/copilot.service';
import { AiModelRouterService } from '../routing/ai-model-router.service';
import type { CopilotDto } from '../assistant/dto/ai.dto';

export type AiStreamEvent =
  | { type: 'start'; provider: string; model?: string }
  | { type: 'delta'; content: string }
  | { type: 'done'; summary: string; provider: string; usage?: Record<string, unknown> }
  | { type: 'error'; message: string };

@Injectable()
export class AiStreamService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AiModelRouterService) private readonly router: AiModelRouterService,
    @Inject(CopilotService) private readonly copilot: CopilotService,
  ) {}

  isStreamingEnabled(): boolean {
    return this.config.get<string>('AI_STREAMING_ENABLED', 'true') !== 'false';
  }

  async *streamCopilot(dto: CopilotDto): AsyncGenerator<AiStreamEvent> {
    const board = dto.boardSlug ?? (dto.workspace as WorkspaceDocument).board ?? 'arduino_uno';
    const route = this.router.resolve({
      task: 'copilot',
      preferredModel: dto.model,
      fallbackModel: dto.fallbackModel,
    });

    yield { type: 'start', provider: route.providerName, model: route.model };

    if (!this.isStreamingEnabled()) {
      const full = await this.copilot.analyzeCopilot({
        workspace: dto.workspace as WorkspaceDocument,
        generatedCode: dto.generatedCode,
        validationIssues: dto.validationIssues,
        simulatorMetadata: dto.simulatorMetadata,
        boardSlug: dto.boardSlug,
        model: dto.model,
        fallbackModel: dto.fallbackModel,
      });
      yield { type: 'delta', content: full.summary };
      yield {
        type: 'done',
        summary: full.summary,
        provider: full.provider,
        usage: full.usage,
      };
      return;
    }

    const prompt = this.buildCopilotPrompt(dto, board);
    let summary = '';

    try {
      for await (const chunk of this.router.streamChat(prompt, {
        task: 'copilot',
        preferredModel: dto.model,
        fallbackModel: dto.fallbackModel,
      })) {
        if (chunk.delta) {
          summary += chunk.delta;
          yield { type: 'delta', content: chunk.delta };
        }
        if (chunk.done) {
          yield {
            type: 'done',
            summary: summary || chunk.fallbackSummary || 'No response from model.',
            provider: chunk.provider,
            usage: chunk.usage as Record<string, unknown> | undefined,
          };
          return;
        }
      }
    } catch (err) {
      const fallback = await this.copilot.analyzeCopilot({
        workspace: dto.workspace as WorkspaceDocument,
        generatedCode: dto.generatedCode,
        validationIssues: dto.validationIssues,
        simulatorMetadata: dto.simulatorMetadata,
        boardSlug: dto.boardSlug,
      });
      yield { type: 'delta', content: fallback.summary };
      yield {
        type: 'done',
        summary: fallback.summary,
        provider: fallback.provider,
        usage: { fallbackUsed: true, reason: err instanceof Error ? err.message : 'stream_error' },
      };
    }
  }

  private buildCopilotPrompt(dto: CopilotDto, board: string): string {
    const ws = dto.workspace as WorkspaceDocument;
    const blockCount = Array.isArray(ws.blocks)
      ? ws.blocks.length
      : ws.blocks && typeof ws.blocks === 'object'
        ? Object.keys(ws.blocks).length
        : 0;
    const issues = dto.validationIssues?.map((v) => v.message).join('; ') ?? 'none';
    return `Robotics Blockly copilot on ${board}. ${blockCount} blocks. Validation: ${issues}. Give concise actionable guidance for the student.`;
  }
}
