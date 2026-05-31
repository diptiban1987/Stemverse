import { describe, expect, it } from 'vitest';
import { OpenRouterClient } from '../src/providers/openrouter-client';
import { AiModelRouterService } from '../src/routing/ai-model-router.service';
import { ProviderRegistry } from '../src/providers/provider.registry';
import { ConfigService } from '@nestjs/config';

describe('OpenRouterClient', () => {
  it('reports not configured without API key', () => {
    const client = new OpenRouterClient(undefined, 'https://openrouter.ai/api/v1');
    expect(client.isConfigured()).toBe(false);
  });

  it('throws when chat requested without key', async () => {
    const client = new OpenRouterClient(undefined, 'https://openrouter.ai/api/v1');
    await expect(
      client.chatCompletion({
        model: 'test/model',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toThrow('OPENROUTER_API_KEY');
  });
});

describe('AiModelRouterService', () => {
  const registry = new ProviderRegistry(
    new ConfigService({
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_DEFAULT_MODEL: 'deepseek/deepseek-chat:free',
      OPENROUTER_FALLBACK_MODEL: 'qwen/qwen-2.5-72b-instruct:free',
    }),
  );
  const router = new AiModelRouterService(
    new ConfigService({
      OPENROUTER_API_KEY: undefined,
      OPENROUTER_DEFAULT_MODEL: 'deepseek/deepseek-chat:free',
      OPENROUTER_FALLBACK_MODEL: 'qwen/qwen-2.5-72b-instruct:free',
    }),
    registry,
  );

  it('classifies copilot as simple task', () => {
    expect(router.classifyTask('copilot')).toBe('simple');
  });

  it('classifies text_to_project as complex', () => {
    expect(router.classifyTask('text_to_project')).toBe('complex');
  });

  it('falls back to rule-based without OpenRouter key', () => {
    const route = router.resolve({ task: 'copilot' });
    expect(route.providerName).toBe('rule-based');
  });

  it('lists rule-based model when no env models', () => {
    const models = router.listAvailableModels();
    expect(models.some((m) => m.id === 'rule-based')).toBe(true);
  });
});
