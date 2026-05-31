import { API_BASE } from './api';
import type { AiStreamMode } from './ai-stream-types';

export type { AiStreamMode } from './ai-stream-types';
export type UnifiedStreamEvent =
  | { type: 'start'; mode: AiStreamMode; provider: string; model?: string; requestId: string }
  | { type: 'delta'; content: string; markdown?: boolean }
  | { type: 'artifact'; artifact: 'workspace' | 'wiring' | 'validation'; data: unknown }
  | { type: 'metrics'; latencyMs: number; tokens?: number; provider: string; model?: string }
  | { type: 'done'; summary: string; provider: string; usage?: Record<string, unknown> }
  | { type: 'error'; message: string; retryable?: boolean };

export type UnifiedStreamOptions = {
  token: string;
  body: Record<string, unknown>;
  signal?: AbortSignal;
  onEvent: (event: UnifiedStreamEvent) => void;
  /** Retry once on retryable stream errors */
  retryOnFailure?: boolean;
};

async function consumeSse(
  res: Response,
  onEvent: (event: UnifiedStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body for stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const event = JSON.parse(payload) as UnifiedStreamEvent;
        onEvent(event);
        if (event.type === 'error') {
          throw Object.assign(new Error(event.message), { retryable: event.retryable });
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }
}

/** Unified POST /ai/stream SSE (Phase 5.1). */
export async function streamUnifiedAi(options: UnifiedStreamOptions): Promise<void> {
  const run = async () => {
    const res = await fetch(`${API_BASE}/ai/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(options.body),
      signal: options.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(text || `Stream failed (${res.status})`), { retryable: res.status >= 500 });
    }

    await consumeSse(res, options.onEvent, options.signal);
  };

  try {
    await run();
  } catch (err) {
    const retryable =
      options.retryOnFailure !== false &&
      err instanceof Error &&
      (err as Error & { retryable?: boolean }).retryable;
    if (retryable) {
      await new Promise((r) => setTimeout(r, 800));
      await run();
      return;
    }
    throw err;
  }
}

/** @deprecated Use streamUnifiedAi */
export const streamCopilot = streamUnifiedAi;
