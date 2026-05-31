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
import { OpenRouterClient } from './openrouter-client';
import { RuleBasedProvider } from './rule-based.provider';

export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';
  private readonly client: OpenRouterClient;
  private readonly fallback = new RuleBasedProvider();

  constructor(
    apiKey: string | undefined,
    private readonly defaultModel: string | undefined,
    private readonly fallbackModel: string | undefined,
    baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  ) {
    this.client = new OpenRouterClient(apiKey, baseUrl);
  }

  isAvailable(): boolean {
    return this.client.isConfigured();
  }

  async explainBlock(req: ExplainBlockRequest): Promise<ExplainResult> {
    const base = explainBlock(req.blockType, req.fields ?? {}, req.level);
    const enhanced = await this.enhance(
      `Explain this Blockly robotics block for a ${req.level} student: ${req.blockType} with fields ${JSON.stringify(req.fields)}. Base explanation: ${base}`,
      'simple',
    );
    return { explanation: enhanced ?? base, provider: this.name };
  }

  async explainCode(req: ExplainCodeRequest): Promise<ExplainResult> {
    const base = explainCode(req.code, req.level);
    const enhanced = await this.enhance(
      `Explain this microcontroller code for a ${req.level} student:\n${req.code.slice(0, 3000)}\nBase: ${base}`,
      req.level === 'advanced' ? 'complex' : 'simple',
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

  async chat(
    prompt: string,
    taskComplexity: 'simple' | 'complex' = 'simple',
    modelOverride?: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<{ content: string; usage?: import('./openrouter-client').UsageMetadata }> {
    if (!this.client.isConfigured()) {
      return { content: '' };
    }
    const model =
      modelOverride ??
      (taskComplexity === 'simple' ? this.defaultModel : this.fallbackModel) ??
      this.defaultModel;
    if (!model) return { content: '' };

    try {
      const result = await this.client.chatCompletion({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are STEMVerse robotics tutor. Be concise, accurate, and helpful for students building Blockly robotics projects.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
      return { content: result.content, usage: result.usage };
    } catch {
      if (this.fallbackModel && model !== this.fallbackModel) {
        const result = await this.client.chatCompletion({
          model: this.fallbackModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        });
        return {
          content: result.content,
          usage: { ...result.usage, fallbackUsed: true },
        };
      }
      return { content: '' };
    }
  }

  private async enhance(
    prompt: string,
    complexity: 'simple' | 'complex',
  ): Promise<string | null> {
    const { content } = await this.chat(prompt, complexity);
    return content || null;
  }

  streamChat(
    prompt: string,
    taskComplexity: 'simple' | 'complex' = 'simple',
    modelOverride?: string,
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<import('./openrouter-client').StreamChunk> {
    const self = this;
    return (async function* () {
      if (!self.client.isConfigured()) return;
      const model =
        modelOverride ??
        (taskComplexity === 'simple' ? self.defaultModel : self.fallbackModel) ??
        self.defaultModel;
      if (!model) return;
      yield* self.client.chatCompletionStream({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are STEMVerse robotics tutor. Stream helpful, concise guidance for Blockly robotics students.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
    })();
  }
}
