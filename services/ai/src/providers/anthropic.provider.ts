import {
  explainBlock,
  explainCode,
  parseNaturalLanguageToWorkspace,
  buildWorkspaceDocument,
  suggestWiring,
} from '@stemverse/blockly-engine';
import type {
  AiProvider,
  ExplainBlockRequest,
  ExplainCodeRequest,
  ExplainResult,
  TextToBlocksRequest,
  TextToBlocksResult,
  TextToProjectRequest,
  TextToProjectResult,
  WiringRequest,
  WiringResult,
} from './ai-provider.interface';
import { RuleBasedProvider } from './rule-based.provider';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly fallback = new RuleBasedProvider();

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
  ) {}

  async explainBlock(req: ExplainBlockRequest): Promise<ExplainResult> {
    const base = explainBlock(req.blockType, req.fields ?? {}, req.level);
    const enhanced = await this.enhance(
      `Explain block ${req.blockType} (${req.level} level) for STEM students. Fields: ${JSON.stringify(req.fields)}`,
    );
    return { explanation: enhanced ?? base, provider: this.name };
  }

  async explainCode(req: ExplainCodeRequest): Promise<ExplainResult> {
    const base = explainCode(req.code, req.level);
    const enhanced = await this.enhance(
      `Explain this embedded code (${req.level}):\n${req.code.slice(0, 3000)}`,
    );
    return { explanation: enhanced ?? base, provider: this.name };
  }

  async textToBlocks(req: TextToBlocksRequest): Promise<TextToBlocksResult> {
    const parsed = parseNaturalLanguageToWorkspace(req.prompt, req.boardSlug);
    const workspace = buildWorkspaceDocument(parsed);
    return {
      workspace,
      summary: parsed.summary,
      matchedPattern: parsed.matchedPattern,
      provider: this.name,
    };
  }

  async textToProject(req: TextToProjectRequest): Promise<TextToProjectResult> {
    return this.fallback.textToProject(req).then((r) => ({ ...r, provider: this.name }));
  }

  async suggestWiring(req: WiringRequest): Promise<WiringResult> {
    const result = suggestWiring(
      req.workspace,
      req.blockTypes ?? [],
      req.blockFields ?? [],
    );
    return { ...result, provider: this.name };
  }

  private async enhance(prompt: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      return data.content?.find((c) => c.type === 'text')?.text?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
