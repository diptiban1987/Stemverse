# OpenRouter Setup Guide

## Local development

Add to **local `.env` only** (never commit):

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_PRIMARY=deepseek/deepseek-r1-0528:free
OPENROUTER_MODEL_FAST=qwen/qwen3-32b:free
OPENROUTER_MODEL_FALLBACK=google/gemma-3-27b-it:free
AI_STREAMING_ENABLED=true
```

Legacy aliases `OPENROUTER_DEFAULT_MODEL` and `OPENROUTER_FALLBACK_MODEL` still work.

## Verify

1. Start AI service: `pnpm --filter @stemverse/ai dev`
2. `GET http://localhost:4002/api/ai/providers/health`
3. AI Studio → send a chat message with streaming enabled

## Unified streaming endpoint

`POST /api/ai/stream` with body:

```json
{
  "mode": "chat",
  "prompt": "blink an LED on pin 13"
}
```

Modes: `chat`, `text_to_blocks`, `explain_block`, `explain_code`, `copilot`, `optimize`, `debug`, `auto_fix`.
