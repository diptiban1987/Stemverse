import type { AiProvider } from './ai-provider.interface';
import { RuleBasedProvider } from './rule-based.provider';

/**
 * Local LLM provider — delegates to rule-based engine until Ollama/LM Studio URL is configured.
 * Set LOCAL_LLM_URL to enable HTTP completion in a future iteration.
 */
export class LocalProvider implements AiProvider {
  readonly name = 'local';
  private readonly core = new RuleBasedProvider();

  constructor(private readonly baseUrl?: string) {}

  explainBlock(req: Parameters<AiProvider['explainBlock']>[0]) {
    if (this.baseUrl) {
      return this.core.explainBlock(req).then((r) => ({
        ...r,
        explanation: `${r.explanation}\n\n(Local model at ${this.baseUrl} — connect for richer answers.)`,
        provider: this.name,
      }));
    }
    return this.core.explainBlock(req).then((r) => ({ ...r, provider: this.name }));
  }

  explainCode(req: Parameters<AiProvider['explainCode']>[0]) {
    return this.core.explainCode(req).then((r) => ({ ...r, provider: this.name }));
  }

  textToBlocks(req: Parameters<AiProvider['textToBlocks']>[0]) {
    return this.core.textToBlocks(req).then((r) => ({ ...r, provider: this.name }));
  }

  textToProject(req: Parameters<AiProvider['textToProject']>[0]) {
    return this.core.textToProject(req).then((r) => ({ ...r, provider: this.name }));
  }

  suggestWiring(req: Parameters<AiProvider['suggestWiring']>[0]) {
    return this.core.suggestWiring(req).then((r) => ({ ...r, provider: this.name }));
  }
}
