export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
};

export type UsageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model: string;
  provider: string;
  latencyMs: number;
  fallbackUsed?: boolean;
};

export type ChatCompletionResult = {
  content: string;
  usage: UsageMetadata;
  raw?: unknown;
};

export type StreamChunk = {
  delta: string;
  done: boolean;
  usage?: UsageMetadata;
};

export class OpenRouterClient {
  readonly provider = 'openrouter';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string,
    private readonly timeoutMs = 30_000,
    private readonly maxRetries = 2,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const started = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'https://stemverse.local',
            'X-Title': process.env.OPENROUTER_APP_NAME ?? 'STEMVerse',
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1024,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        const content = data.choices?.[0]?.message?.content?.trim() ?? '';
        return {
          content,
          usage: {
            model: options.model,
            provider: this.provider,
            latencyMs: Date.now() - started,
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
            totalTokens: data.usage?.total_tokens,
          },
          raw: data,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error('OpenRouter request failed');
  }

  /** Streaming-ready: yields chunks when stream=true (future UI). */
  async *chatCompletionStream(
    options: ChatCompletionOptions,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const result = await this.chatCompletion({ ...options, stream: false });
        yield { delta: result.content, done: true, usage: result.usage };
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            yield { delta: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) yield { delta, done: false };
          } catch {
            /* skip malformed SSE */
          }
        }
      }
      yield { delta: '', done: true };
    } finally {
      clearTimeout(timer);
    }
  }
}
