import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { LocalProvider } from './local.provider';
import { OpenAiProvider } from './openai.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { RuleBasedProvider } from './rule-based.provider';

@Injectable()
export class ProviderRegistry {
  private providers = new Map<string, AiProvider>();

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.providers.set('rule-based', new RuleBasedProvider());

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.providers.set('openai', new OpenAiProvider(openaiKey));
    }

    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.providers.set('anthropic', new AnthropicProvider(anthropicKey));
    }

    const localUrl = this.config.get<string>('LOCAL_LLM_URL');
    this.providers.set('local', new LocalProvider(localUrl));

    const openRouterKey = this.config.get<string>('OPENROUTER_API_KEY');
    const openRouter = new OpenRouterProvider(
      openRouterKey,
      this.config.get<string>('OPENROUTER_DEFAULT_MODEL'),
      this.config.get<string>('OPENROUTER_FALLBACK_MODEL'),
      this.config.get<string>('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1',
    );
    if (openRouterKey) {
      this.providers.set('openrouter', openRouter);
    }
  }

  resolve(preferred?: string): AiProvider {
    const localUrl = this.config.get<string>('LOCAL_LLM_URL');
    const order = [
      preferred,
      this.config.get<string>('AI_PROVIDER'),
      'openrouter',
      'openai',
      'anthropic',
      ...(localUrl ? (['local'] as const) : []),
      'rule-based',
    ].filter(Boolean) as string[];

    for (const key of order) {
      const provider = this.providers.get(key);
      if (provider) return provider;
    }
    return this.providers.get('rule-based')!;
  }

  listProviders(): string[] {
    return [...this.providers.keys()];
  }
}
