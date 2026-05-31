# STEMVerse AI Architecture

## Services

- **`services/ai`** — NestJS assistant, copilot, streaming, model router.
- **`services/api`** — AI sessions, user settings (`streamingEnabled`), gateway proxy.

## Provider stack

1. **OpenRouter** — when `OPENROUTER_API_KEY` is set; supports streaming via `OpenRouterClient.chatCompletionStream`.
2. **Rule-based** — `@stemverse/blockly-engine` parsers and validators; always available offline.

No hardcoded provider lock-in: models come from env (`OPENROUTER_DEFAULT_MODEL`, `OPENROUTER_FALLBACK_MODEL`).

## Streaming (Phase 5.1 unified pipeline)

```
Client → POST /api/ai/stream (Accept: text/event-stream)
      → Gateway proxy (no buffering, SSE headers preserved)
      → UnifiedStreamingService
      → modes: chat | text_to_blocks | explain_* | copilot | optimize | debug | auto_fix
      → AiModelRouterService.streamChat → OpenRouter SSE or rule-based chunks
```

Legacy: `POST /api/ai/copilot/stream` delegates to the same pipeline.

Env: `AI_STREAMING_ENABLED`, `OPENROUTER_MODEL_PRIMARY|FAST|FALLBACK`, `AI_STREAM_TIMEOUT_MS`.

## Metrics & health

`GET /api/ai/providers/health` returns provider availability, free-model presets, last usage latency.

## Auto-fix confidence

Rule-based auto-fix suggestions include `confidence` 0.4–0.92 based on issue code and severity.
