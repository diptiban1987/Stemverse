export type AiStreamMode =
  | 'chat'
  | 'text_to_blocks'
  | 'explain_block'
  | 'explain_code'
  | 'copilot'
  | 'optimize'
  | 'debug'
  | 'auto_fix';

export type UnifiedStreamEvent =
  | { type: 'start'; mode: AiStreamMode; provider: string; model?: string; requestId: string }
  | { type: 'delta'; content: string; markdown?: boolean }
  | { type: 'artifact'; artifact: 'workspace' | 'wiring' | 'validation'; data: unknown }
  | { type: 'metrics'; latencyMs: number; tokens?: number; provider: string; model?: string; fallbackUsed?: boolean }
  | { type: 'done'; summary: string; provider: string; usage?: Record<string, unknown> }
  | { type: 'error'; message: string; retryable?: boolean }
  | { type: 'ping'; ts: number };
