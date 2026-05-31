import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UsageMetadata } from '../providers/openrouter-client';

export type ProviderHealth = {
  provider: string;
  available: boolean;
  defaultModel?: string;
  fallbackModel?: string;
  lastLatencyMs?: number;
  fallbackUsed?: boolean;
};

@Injectable()
export class AiMetricsService {
  private lastUsage: UsageMetadata | null = null;
  private providerHealth = new Map<string, ProviderHealth>();

  constructor(private readonly config: ConfigService) {}

  recordUsage(usage: UsageMetadata): void {
    this.lastUsage = usage;
    const existing = this.providerHealth.get(usage.provider) ?? {
      provider: usage.provider,
      available: true,
    };
    this.providerHealth.set(usage.provider, {
      ...existing,
      available: true,
      lastLatencyMs: usage.latencyMs,
      fallbackUsed: usage.fallbackUsed,
      defaultModel: usage.model,
    });
  }

  getLastUsage(): UsageMetadata | null {
    return this.lastUsage;
  }

  getProviderHealth(): ProviderHealth[] {
    const openRouterKey = Boolean(this.config.get<string>('OPENROUTER_API_KEY'));
    const list: ProviderHealth[] = [
      {
        provider: 'openrouter',
        available: openRouterKey,
        defaultModel: this.config.get<string>('OPENROUTER_DEFAULT_MODEL') ?? undefined,
        fallbackModel: this.config.get<string>('OPENROUTER_FALLBACK_MODEL') ?? undefined,
        ...this.providerHealth.get('openrouter'),
      },
      {
        provider: 'rule-based',
        available: true,
        ...this.providerHealth.get('rule-based'),
      },
    ];
    return list;
  }

  getFreeModelPresets(): Array<{ id: string; label: string; note: string }> {
    return [
      {
        id: 'google/gemini-2.0-flash-exp:free',
        label: 'Gemini 2.0 Flash (free)',
        note: 'Good for explain/copilot; set OPENROUTER_DEFAULT_MODEL',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        label: 'Llama 3.3 70B (free)',
        note: 'Stronger reasoning; higher latency',
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct:free',
        label: 'Qwen 2.5 72B (free)',
        note: 'Fallback candidate for OPENROUTER_FALLBACK_MODEL',
      },
    ];
  }
}
