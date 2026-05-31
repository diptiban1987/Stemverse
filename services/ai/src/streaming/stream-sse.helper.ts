import type { Response } from 'express';
import type { UnifiedStreamEvent } from './stream-events';

export function writeSseEvent(res: Response, event: UnifiedStreamEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function initSseResponse(res: Response): AbortController {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  return ac;
}

/** Batches rapid deltas to reduce client rerenders (perf). */
export async function pipeStreamWithBatching(
  res: Response,
  events: AsyncGenerator<UnifiedStreamEvent>,
  signal: AbortSignal,
  batchMs = 32,
): Promise<void> {
  let buffer = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (!buffer) return;
    writeSseEvent(res, { type: 'delta', content: buffer, markdown: true });
    buffer = '';
  };

  try {
    for await (const event of events) {
      if (signal.aborted) break;

      if (event.type === 'delta') {
        buffer += event.content;
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flush();
            flushTimer = null;
          }, batchMs);
        }
        continue;
      }

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
      writeSseEvent(res, event);

      if (event.type === 'done' || event.type === 'error') break;
    }
    flush();
    if (!signal.aborted) {
      res.write('data: [DONE]\n\n');
    }
  } finally {
    if (flushTimer) clearTimeout(flushTimer);
    res.end();
  }
}
