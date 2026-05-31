import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceDocument } from '@stemverse/blockly-engine';
import { randomUUID } from 'crypto';
import { resolveOpenRouterModels } from '../config/openrouter-config';
import { AssistantService } from '../assistant/assistant.service';
import { CopilotService } from '../copilot/copilot.service';
import { AiMetricsService } from '../metrics/ai-metrics.service';
import { AiModelRouterService, type AiTaskType } from '../routing/ai-model-router.service';
import type { UnifiedStreamRequestDto } from '../assistant/dto/unified-stream.dto';
import type { AiStreamMode, UnifiedStreamEvent } from './stream-events';

const STREAM_TIMEOUT_MS = 90_000;

@Injectable()
export class UnifiedStreamingService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AssistantService) private readonly assistant: AssistantService,
    @Inject(CopilotService) private readonly copilot: CopilotService,
    @Inject(AiModelRouterService) private readonly router: AiModelRouterService,
    @Inject(AiMetricsService) private readonly metrics: AiMetricsService,
  ) {}

  isStreamingEnabled(): boolean {
    return this.config.get<string>('AI_STREAMING_ENABLED', 'true') !== 'false';
  }

  async *stream(request: UnifiedStreamRequestDto): AsyncGenerator<UnifiedStreamEvent> {
    const requestId = request.requestId ?? randomUUID();
    const mode = request.mode;
    const started = Date.now();
    const models = resolveOpenRouterModels(this.config);
    const preferredModel = request.model ?? models.primary;
    const fallbackModel = request.fallbackModel ?? models.fallback;

    const route = this.router.resolve({
      task: this.modeToTask(mode),
      preferredModel,
      fallbackModel,
      provider: request.provider,
    });

    yield {
      type: 'start',
      mode,
      provider: route.providerName,
      model: route.model,
      requestId,
    };

    const timeout = setTimeout(() => {
      /* consumer should abort via signal; timeout yields error in wrapper */
    }, STREAM_TIMEOUT_MS);

    try {
      if (!this.isStreamingEnabled()) {
        yield* this.runNonStreaming(mode, request, route.providerName);
        return;
      }

      yield* this.runStreaming(mode, request, {
        preferredModel,
        fallbackModel,
        providerName: route.providerName,
      });

      const latencyMs = Date.now() - started;
      this.metrics.recordUsage({
        provider: route.providerName,
        model: route.model ?? 'unknown',
        latencyMs,
      });
      yield {
        type: 'metrics',
        latencyMs,
        provider: route.providerName,
        model: route.model,
      };
    } catch (err) {
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : 'Stream failed',
        retryable: true,
      };
      yield* this.runFallbackNonStream(mode, request, route.providerName);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *runStreaming(
    mode: AiStreamMode,
    request: UnifiedStreamRequestDto,
    opts: { preferredModel?: string; fallbackModel?: string; providerName: string },
  ): AsyncGenerator<UnifiedStreamEvent> {
    if (mode === 'text_to_blocks' || mode === 'chat') {
      yield* this.streamChatPipeline(mode, request, opts);
      return;
    }

    const prompt = this.buildPrompt(mode, request);
    let summary = '';

    for await (const chunk of this.router.streamChat(prompt, {
      task: this.modeToTask(mode),
      preferredModel: opts.preferredModel,
      fallbackModel: opts.fallbackModel,
    })) {
      if (chunk.delta) {
        summary += chunk.delta;
        yield { type: 'delta', content: chunk.delta, markdown: true };
      }
      if (chunk.done) {
        if (mode === 'debug' || mode === 'auto_fix') {
          yield* this.emitDebugArtifacts(request);
        }
        yield {
          type: 'done',
          summary: summary || chunk.fallbackSummary || '',
          provider: chunk.provider,
          usage: chunk.usage as Record<string, unknown> | undefined,
        };
        return;
      }
    }
  }

  private async *streamChatPipeline(
    mode: AiStreamMode,
    request: UnifiedStreamRequestDto,
    opts: { preferredModel?: string; fallbackModel?: string; providerName: string },
  ): AsyncGenerator<UnifiedStreamEvent> {
    const prompt = request.prompt ?? request.message ?? '';
    const boardSlug = request.boardSlug ?? 'arduino_uno';

    if (prompt.trim()) {
      const blocksResult = await this.assistant.textToBlocks({
        prompt,
        boardSlug,
        provider: request.provider,
      });
      yield {
        type: 'artifact',
        artifact: 'workspace',
        data: blocksResult,
      };
      yield {
        type: 'delta',
        content: `**${blocksResult.summary}**\n\nPattern: \`${blocksResult.matchedPattern}\` (${blocksResult.provider})\n\n`,
        markdown: true,
      };

      const ws = blocksResult.workspace as WorkspaceDocument;
      request.workspace = ws;

      const wiring = await this.assistant.suggestWiring({
        workspace: ws,
        provider: request.provider,
      });
      yield { type: 'artifact', artifact: 'wiring', data: wiring };
    }

    const copilotPrompt = this.buildPrompt('copilot', request);
    let summary = '';

    for await (const chunk of this.router.streamChat(copilotPrompt, {
      task: 'copilot',
      preferredModel: opts.preferredModel,
      fallbackModel: opts.fallbackModel,
    })) {
      if (chunk.delta) {
        summary += chunk.delta;
        yield { type: 'delta', content: chunk.delta, markdown: true };
      }
      if (chunk.done) {
        yield {
          type: 'done',
          summary: summary || chunk.fallbackSummary || 'Ready.',
          provider: chunk.provider,
          usage: chunk.usage as Record<string, unknown> | undefined,
        };
        return;
      }
    }
  }

  private async *runNonStreaming(
    mode: AiStreamMode,
    request: UnifiedStreamRequestDto,
    provider: string,
  ): AsyncGenerator<UnifiedStreamEvent> {
    const result = await this.executeMode(mode, request);
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    yield { type: 'delta', content: text, markdown: mode !== 'auto_fix' };
    yield { type: 'done', summary: text.slice(0, 500), provider };
  }

  private async *runFallbackNonStream(
    mode: AiStreamMode,
    request: UnifiedStreamRequestDto,
    provider: string,
  ): AsyncGenerator<UnifiedStreamEvent> {
    try {
      yield* this.runNonStreaming(mode, request, provider);
    } catch {
      yield { type: 'error', message: 'All providers failed', retryable: false };
    }
  }

  private async *emitDebugArtifacts(
    request: UnifiedStreamRequestDto,
  ): AsyncGenerator<UnifiedStreamEvent> {
    if (!request.workspace) return;
    const fix = await this.copilot.analyzeAutoFix({
      workspace: request.workspace as WorkspaceDocument,
      boardSlug: request.boardSlug,
    });
    yield { type: 'artifact', artifact: 'validation', data: fix };
  }

  private async executeMode(mode: AiStreamMode, request: UnifiedStreamRequestDto): Promise<unknown> {
    switch (mode) {
      case 'explain_block':
        return this.assistant.explainBlock({
          blockType: request.blockType!,
          fields: request.fields,
          level: request.level!,
          boardSlug: request.boardSlug,
          provider: request.provider,
        });
      case 'explain_code':
        return this.assistant.explainCode({
          code: request.code!,
          level: request.level!,
          boardSlug: request.boardSlug,
          provider: request.provider,
        });
      case 'text_to_blocks':
      case 'chat':
        return this.assistant.textToBlocks({
          prompt: request.prompt ?? request.message ?? '',
          boardSlug: request.boardSlug,
          provider: request.provider,
        });
      case 'copilot':
      case 'optimize':
        return this.assistant.analyzeCopilot({
          workspace: request.workspace!,
          generatedCode: request.generatedCode,
          validationIssues: request.validationIssues,
          simulatorMetadata: request.simulatorMetadata,
          boardSlug: request.boardSlug,
          model: request.model,
          fallbackModel: request.fallbackModel,
        });
      case 'debug':
      case 'auto_fix':
        return this.assistant.analyzeAutoFix({
          workspace: request.workspace!,
          boardSlug: request.boardSlug,
        });
      default:
        return { message: 'Unsupported mode' };
    }
  }

  private buildPrompt(mode: AiStreamMode, request: UnifiedStreamRequestDto): string {
    const board = request.boardSlug ?? (request.workspace as WorkspaceDocument)?.board ?? 'arduino_uno';
    switch (mode) {
      case 'explain_block':
        return `Explain Blockly block ${request.blockType} for ${request.level} level on ${board}. Fields: ${JSON.stringify(request.fields ?? {})}`;
      case 'explain_code':
        return `Explain this code for ${request.level} on ${board}:\n${(request.code ?? '').slice(0, 4000)}`;
      case 'optimize':
        return `Optimize this ${board} robotics Blockly project. Workspace summary provided. Give 3 concrete optimizations.`;
      case 'debug':
      case 'auto_fix':
        return `Debug this ${board} robotics workspace. List issues and fixes clearly.`;
      case 'copilot':
      default: {
        const ws = request.workspace as WorkspaceDocument | undefined;
        const blockCount =
          ws?.blocks && typeof ws.blocks === 'object'
            ? Array.isArray(ws.blocks)
              ? ws.blocks.length
              : Object.keys(ws.blocks).length
            : 0;
        return `Robotics copilot on ${board}. ${blockCount} blocks. ${request.prompt ?? request.message ?? ''}`;
      }
    }
  }

  private modeToTask(mode: AiStreamMode): AiTaskType {
    switch (mode) {
      case 'text_to_blocks':
      case 'chat':
        return 'text_to_blocks';
      case 'explain_block':
        return 'explain_block';
      case 'explain_code':
        return 'explain_code';
      case 'optimize':
        return 'optimize';
      case 'debug':
      case 'auto_fix':
        return 'debug';
      default:
        return 'copilot';
    }
  }
}
