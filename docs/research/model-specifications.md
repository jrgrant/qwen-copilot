# Qwen Model Specifications

> Source: [Alibaba Cloud Model Studio — Text Generation](https://www.alibabacloud.com/help/en/model-studio/text-generation-model)

## Recommended Models for Coding (Copilot Use)

Alibaba recommends `qwen3.7-plus` for balanced performance/cost with full tool calling and 1M context window. For strongest reasoning, use `qwen3.7-max`.

## Migration Mapping

| Closed-source | Bailian Recommendation |
|---|---|
| GPT-5.5, Claude Opus 4.7, Gemini 3.1 Pro | `qwen3.7-max` |
| GPT-5.4, Claude Sonnet 4.6, Gemini 3 Pro | `qwen3.7-plus` |
| GPT-5.4-mini, Claude Haiku 4.5, Gemini 3.1 Flash | `qwen3.6-flash` |

---

## Qwen3.7 Series (Latest)

| Model ID | Context | Max Output | Thinking Budget | Tool Calling | Built-in Tools | Structured Output |
|---|---|---|---|---|---|---|
| `qwen3.7-max` | 1M | 64k | 256k | ✅ | ✅ | ✅ |
| `qwen3.7-max-preview` | 1M | 64k | 256k | ✅ | ✅ | ✅ |
| `qwen3.7-plus` | 1M | 64k | 256k | ✅ | ✅ | ✅ |

---

## Qwen3.6 Series

| Model ID | Context | Max Output | Thinking Budget | Tool Calling | Built-in Tools | Structured Output |
|---|---|---|---|---|---|---|
| `qwen3.6-plus` | 1M | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.6-flash` | 1M | 64k | 128k | ✅ | ✅ | ✅ |

---

## Qwen3.5 Series

| Model ID | Context | Max Output | Thinking Budget | Tool Calling | Built-in Tools | Structured Output |
|---|---|---|---|---|---|---|
| `qwen3.5-plus` | 1M | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.5-flash` | 1M | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.5-397b-a17b` | 256k | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.5-122b-a10b` | 256k | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.5-27b` | 256k | 64k | 80k | ✅ | ✅ | ✅ |
| `qwen3.5-35b-a3b` | 256k | 64k | 80k | ✅ | ✅ | ✅ |

---

## Plugin Model Configuration

For the VS Code Copilot plugin, we should expose these models:

| Copilot Model ID | DashScope Model | Context | Max Output | Capabilities |
|---|---|---|---|---|
| `qwen-max` | `qwen3.7-max` | 1,000,000 | 64,000 | toolCalling: 128, imageInput: false |
| `qwen-plus` | `qwen3.7-plus` | 1,000,000 | 64,000 | toolCalling: 128, imageInput: false |
| `qwen-flash` | `qwen3.6-flash` | 1,000,000 | 64,000 | toolCalling: 128, imageInput: false |

### `LanguageModelChatInformation` Mapping

```typescript
const MODELS: LanguageModelChatInformation[] = [
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    family: 'qwen3.7',
    version: '3.7',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Strongest reasoning, 1M context',
    capabilities: { toolCalling: true, imageInput: false }
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    family: 'qwen3.7',
    version: '3.7',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Balanced performance and cost, 1M context',
    capabilities: { toolCalling: true, imageInput: false }
  },
  {
    id: 'qwen-flash',
    name: 'Qwen Flash',
    family: 'qwen3.6',
    version: '3.6',
    maxInputTokens: 1_000_000,
    maxOutputTokens: 64_000,
    detail: 'Fast and cost-effective, 1M context',
    capabilities: { toolCalling: true, imageInput: false }
  }
];
```

---

## Key Features

All recommended Qwen models support:
- **Tool/Function Calling** — Essential for Copilot's agentic capabilities
- **Thinking Mode** — Can be enabled per-request via `enable_thinking: true`
- **1M Token Context** — Handles large codebases
- **Structured Output** — JSON mode available
- **Streaming** — SSE streaming with incremental content delivery
- **Built-in Tools** — Web search, code interpreter (not needed for Copilot use)

---

## Region & Workspace

Users will need:
1. An Alibaba Cloud account
2. A DashScope/Bailian API key
3. A Workspace ID (from Model Studio console)

The plugin should allow configuring:
- API Key
- Region (default: Singapore `ap-southeast-1`)
- Workspace ID
- Custom base URL (for advanced users)
