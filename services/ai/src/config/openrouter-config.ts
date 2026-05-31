import { ConfigService } from '@nestjs/config';

/** Resolves OpenRouter model ids from env (Phase 5.1 naming + legacy aliases). */
export function resolveOpenRouterModels(config: ConfigService): {
  primary: string | undefined;
  fast: string | undefined;
  fallback: string | undefined;
} {
  const primary =
    config.get<string>('OPENROUTER_MODEL_PRIMARY') ??
    config.get<string>('OPENROUTER_DEFAULT_MODEL') ??
    undefined;
  const fast =
    config.get<string>('OPENROUTER_MODEL_FAST') ??
    primary;
  const fallback =
    config.get<string>('OPENROUTER_MODEL_FALLBACK') ??
    config.get<string>('OPENROUTER_FALLBACK_MODEL') ??
    undefined;
  return { primary, fast, fallback };
}
