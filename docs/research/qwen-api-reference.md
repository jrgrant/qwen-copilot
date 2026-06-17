# Alibaba DashScope / Qwen API Reference

> Source: [Alibaba Cloud Model Studio Documentation](https://www.alibabacloud.com/help/en/model-studio/)

## Overview

Alibaba Cloud Model Studio (DashScope/Bailian) provides Qwen models via an **OpenAI-compatible Chat Completions API**. This makes integration straightforward — any OpenAI SDK client can be pointed at the DashScope endpoint.

---

## API Endpoint

### Base URL (Singapore region)
```
https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
```

### Chat Completions Endpoint
```
POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions
```

### Regional Endpoints

| Region | Base URL |
|--------|----------|
| Singapore | `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |
| US (Virginia) | `https://{WorkspaceId}.us-east-1.maas.aliyuncs.com/compatible-mode/v1` |
| China (Beijing) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| China (Hong Kong) | `https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/compatible-mode/v1` |
| Germany (Frankfurt) | `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1` |

Replace `{WorkspaceId}` with your workspace ID from the Model Studio console.

---

## Authentication

Use Bearer token authentication with a DashScope API key:

```
Authorization: Bearer DASHSCOPE_API_KEY
```

API keys are region-specific. Set via environment variable `DASHSCOPE_API_KEY` or pass directly.

---

## Request Format (OpenAI-Compatible)

```json
{
  "model": "qwen-plus",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Who are you?"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Key Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string (required) | Model ID (e.g., `qwen-plus`, `qwen-max`, `qwen-flash`) |
| `messages` | array (required) | Conversation history with `role` ("system", "user", "assistant", "tool") and `content` |
| `stream` | boolean | Enable SSE streaming (default: `false`) |
| `temperature` | float | Sampling temperature (0 to <2) |
| `top_p` | float | Nucleus sampling threshold (0 to 1.0] |
| `max_tokens` | integer | Max tokens in response (deprecated, use `max_completion_tokens`) |
| `max_completion_tokens` | integer | Max tokens including chain-of-thought |
| `tools` | array | Tool/function definitions for function calling |
| `tool_choice` | string/object | Tool selection policy: `"auto"`, `"none"`, or specific tool |
| `enable_thinking` | boolean | Enable thinking mode for hybrid models |
| `thinking_budget` | integer | Max tokens for thinking chain-of-thought |
| `reasoning_effort` | string | For DeepSeek V4: `"high"` or `"max"` |
| `response_format` | object | `{"type": "json_object"}` for structured JSON output |
| `stop` | string/array | Stop sequences |

---

## Streaming Response Format

Streaming uses SSE (Server-Sent Events). Each chunk:

```json
{
  "id": "chatcmpl-xxx",
  "choices": [{
    "delta": {
      "content": "I am a ",
      "role": "assistant"
    },
    "finish_reason": null,
    "index": 0
  }],
  "model": "qwen-plus",
  "object": "chat.completion.chunk"
}
```

Final chunk (with `include_usage: true`):
```json
{
  "choices": [],
  "usage": {
    "prompt_tokens": 3019,
    "completion_tokens": 104,
    "total_tokens": 3123
  }
}
```

---

## Non-Streaming Response Format

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I am Qwen, a large language model by Alibaba Cloud."
    },
    "finish_reason": "stop",
    "index": 0
  }],
  "object": "chat.completion",
  "usage": {
    "prompt_tokens": 3019,
    "completion_tokens": 104,
    "total_tokens": 3123
  }
}
```

---

## Tool Calling with Streaming

Set `tool_stream: true` for streaming tool call arguments (supported by Qwen and GLM series). Without this flag, complex tool arguments (arrays/objects) are returned all at once.

Tool call chunk format:
```json
{
  "choices": [{
    "delta": {
      "tool_calls": [{
        "index": 0,
        "id": "call_xxx",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\":"
        }
      }]
    }
  }]
}
```

---

## Thinking Mode (Chain-of-Thought)

When `enable_thinking: true`, responses may include `reasoning_content` in delta chunks:
```json
{
  "choices": [{
    "delta": {
      "reasoning_content": "Let me think about this step by step...",
      "content": null
    }
  }]
}
```

---

## Code Example (Python OpenAI SDK)

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
)

completion = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Who are you?"},
    ],
    stream=True
)

for chunk in completion:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

---

## TypeScript/Node.js Usage

```typescript
const response = await fetch(
  `https://${workspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: 'Hello!' }],
      stream: true,
    }),
  }
);

// Read SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();
// ... parse SSE lines: "data: {...}"
```

---

## Error Handling

Common error codes follow OpenAI conventions:
- `401` — Invalid API key
- `429` — Rate limit exceeded
- `500` — Server error

Error response body:
```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

---

## Additional Capabilities

- **Structured Output** — `response_format: {"type": "json_object"}`
- **Batch Inference** — For high-volume, low-latency-insensitive processing
- **Code Interpreter** — `enable_code_interpreter: true`
- **Web Search** — `enable_search: true`
- **Image Input** — Qwen-VL models support image inputs via `content` parts with `image_url` type
