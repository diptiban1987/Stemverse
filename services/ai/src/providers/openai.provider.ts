import {
  buildWorkspaceDocument,
  explainBlock,
  explainCode,
  parseNaturalLanguageToWorkspace,
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

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly fallback = new RuleBasedProvider();

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  ) {}

  async explainBlock(req: ExplainBlockRequest): Promise<ExplainResult> {
    const base = explainBlock(req.blockType, req.fields ?? {}, req.level);
    const enhanced = await this.enhance(
      `Explain this Blockly robotics block for a ${req.level} student: ${req.blockType} with fields ${JSON.stringify(req.fields)}. Base: ${base}`,
    );
    return { explanation: enhanced ?? base, provider: this.name };
  }

  async explainCode(req: ExplainCodeRequest): Promise<ExplainResult> {
    const base = explainCode(req.code, req.level);
    const enhanced = await this.enhance(
      `Explain this microcontroller code for a ${req.level} student:\n${req.code.slice(0, 3000)}\nBase: ${base}`,
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
    const result = await this.fallback.textToProject(req);
    return { ...result, provider: this.name };
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
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are STEMVerse robotics tutor. Be concise and accurate.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 400,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
