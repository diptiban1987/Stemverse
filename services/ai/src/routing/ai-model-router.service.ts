import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveOpenRouterModels } from '../config/openrouter-config';
import type { UsageMetadata } from '../providers/openrouter-client';
import type { AiProvider } from '../providers/ai-provider.interface';
import { OpenRouterProvider } from '../providers/openrouter.provider';
import { ProviderRegistry } from '../providers/provider.registry';

export type AiTaskType =
  | 'explain_block'
  | 'explain_code'
  | 'copilot'
  | 'auto_fix'
  | 'simulator'
  | 'text_to_blocks'
  | 'text_to_project'
  | 'optimize'
  | 'debug';

const SIMPLE_TASKS = new Set<AiTaskType>([
  'explain_block',
  'explain_code',
  'copilot',
  'auto_fix',
  'simulator',
  'text_to_blocks',
]);

const COMPLEX_TASKS = new Set<AiTaskType>([
  'text_to_project',
  'optimize',
  'debug',
]);

export type RouteRequest = {
  task: AiTaskType;
  preferredModel?: string;
  fallbackModel?: string;
  provider?: string;
};

export type RouteResult = {
  provider: AiProvider;
  providerName: string;
  model?: string;
  fallbackModel?: string;
  taskComplexity: 'simple' | 'complex';
  usage?: UsageMetadata;
};

@Injectable()
export class AiModelRouterService {
  private openRouter: OpenRouterProvider;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(ProviderRegistry) private readonly registry: ProviderRegistry,
  ) {
    this.openRouter = new OpenRouterProvider(
      this.config.get<string>('OPENROUTER_API_KEY'),
      this.config.get<string>('OPENROUTER_DEFAULT_MODEL'),
      this.config.get<string>('OPENROUTER_FALLBACK_MODEL'),
      this.config.get<string>('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1',
    );
  }

  classifyTask(task: AiTaskType): 'simple' | 'complex' {
    if (COMPLEX_TASKS.has(task)) return 'complex';
    if (SIMPLE_TASKS.has(task)) return 'simple';
    return 'simple';
  }

  resolve(req: RouteRequest): RouteResult {
    const taskComplexity = this.classifyTask(req.task);
    const envModels = resolveOpenRouterModels(this.config);
    const preferredModel = req.preferredModel ?? envModels.primary ?? undefined;
    const fallbackModel = req.fallbackModel ?? envModels.fallback ?? undefined;

    if (this.openRouter.isAvailable()) {
      return {
        provider: this.openRouter,
        providerName: 'openrouter',
        model: preferredModel,
        fallbackModel,
        taskComplexity,
      };
    }

    const provider = this.registry.resolve(req.provider);
    return {
      provider,
      providerName: provider.name,
      taskComplexity,
    };
  }

  async chatWithFallback(
    prompt: string,
    req: RouteRequest,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{ content: string; route: RouteResult }> {
    const route = this.resolve(req);

    if (route.providerName === 'openrouter' && this.openRouter.isAvailable()) {
      const { content, usage } = await this.openRouter.chat(
        prompt,
        route.taskComplexity,
        route.model,
        options,
      );
      if (content) {
        return { content, route: { ...route, usage } };
      }
      if (route.fallbackModel && route.fallbackModel !== route.model) {
        const retry = await this.openRouter.chat(
          prompt,
          route.taskComplexity,
          route.fallbackModel,
          options,
        );
        if (retry.content) {
          return {
            content: retry.content,
            route: { ...route, usage: retry.usage },
          };
        }
      }
    }

    const ruleBased = this.registry.resolve('rule-based');
    return {
      content: '',
      route: { ...route, provider: ruleBased, providerName: ruleBased.name },
    };
  }

  async *streamChat(
    prompt: string,
    req: RouteRequest,
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<{
    delta: string;
    done: boolean;
    provider: string;
    usage?: UsageMetadata;
    fallbackSummary?: string;
  }> {
    const route = this.resolve(req);

    if (route.providerName === 'openrouter' && this.openRouter.isAvailable()) {
      try {
        for await (const chunk of this.openRouter.streamChat(
          prompt,
          route.taskComplexity,
          route.model,
          options,
        )) {
          if (chunk.done) {
            yield {
              delta: '',
              done: true,
              provider: 'openrouter',
              usage: chunk.usage,
            };
            return;
          }
          if (chunk.delta) {
            yield { delta: chunk.delta, done: false, provider: 'openrouter' };
          }
        }
        return;
      } catch {
        /* fall through to rule-based */
      }
    }

    const { content } = await this.chatWithFallback(prompt, req, options);
    const parts = (content || 'STEMVerse rule-based assistant is ready to help with your robotics project.')
      .split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      if (part.trim()) {
        yield { delta: part + ' ', done: false, provider: 'rule-based' };
        await new Promise((r) => setTimeout(r, 40));
      }
    }
    yield {
      delta: '',
      done: true,
      provider: 'rule-based',
      fallbackSummary: content || undefined,
    };
  }

  listAvailableModels(): Array<{ id: string; tier: 'free' | 'paid'; label: string }> {
    const models: Array<{ id: string; tier: 'free' | 'paid'; label: string }> = [];
    const { primary: defaultModel, fallback: fallbackModel, fast } = resolveOpenRouterModels(
      this.config,
    );
    if (fast && fast !== defaultModel) {
      models.push({
        id: fast,
        tier: fast.includes(':free') ? 'free' : 'paid',
        label: `${fast} (fast)`,
      });
    }
    if (defaultModel) {
      models.push({
        id: defaultModel,
        tier: defaultModel.includes(':free') ? 'free' : 'paid',
        label: defaultModel,
      });
    }
    if (fallbackModel && fallbackModel !== defaultModel) {
      models.push({
        id: fallbackModel,
        tier: fallbackModel.includes(':free') ? 'free' : 'paid',
        label: fallbackModel,
      });
    }
    models.push({ id: 'rule-based', tier: 'free', label: 'Local rule-based (offline)' });
    return models;
  }
}
