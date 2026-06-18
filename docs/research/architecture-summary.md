# Plugin Architecture Summary

## Goal

Provide Alibaba-hosted Qwen models as BYOK alternatives in GitHub Copilot (VS Code app and CLI).

## Architecture

```
┌─────────────────────────────────────┐
│        GitHub Copilot (VS Code)      │
│  ┌────────────┐  ┌────────────────┐ │
│  │ Chat View  │  │ Copilot Edits  │ │
│  └─────┬──────┘  └───────┬────────┘ │
│        │                 │          │
│  ┌─────▼─────────────────▼────────┐ │
│  │     vscode.lm API Layer         │ │
│  │  (model picker, routing)       │ │
│  └─────┬──────────────────────────┘ │
└────────┼────────────────────────────┘
         │ registerLanguageModelChatProvider('alibaba', provider)
┌────────▼────────────────────────────┐
│     Alibaba Copilot Extension         │
│  ┌────────────────────────────────┐ │
│  │  QwenChatModelProvider         │ │
│  │  implements:                   │ │
│  │  - provideModelInfo()          │ │
│  │  - provideChatResponse()       │ │
│  │  - provideTokenCount()         │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│  ┌──────────▼─────────────────────┐ │
│  │  SSE Stream Parser             │ │
│  │  (parse OpenAI-compat chunks)  │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│  ┌──────────▼─────────────────────┐ │
│  │  Config / Secret Store         │ │
│  │  (API key, workspace, region)  │ │
│  └────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ HTTPS + SSE
┌──────────────▼──────────────────────┐
│   Alibaba DashScope API             │
│   dashscope.aliyuncs.com            │
│   /compatible-mode/v1/chat/         │
│   completions                       │
│                                     │
│   Models: qwen-max, qwen-plus,      │
│           qwen-flash                │
└─────────────────────────────────────┘
```

## File Structure (Planned)

```
qwen-copilot/
├── package.json              # Extension manifest + contribution point
├── tsconfig.json             # TypeScript config
├── .vscodeignore             # Files to exclude from VSIX
├── README.md                 # User-facing documentation
├── CHANGELOG.md
├── LICENSE
├── src/
│   ├── extension.ts          # activate() — register provider
│   ├── provider.ts           # QwenChatModelProvider class
│   ├── config.ts             # Configuration management
│   ├── sse-parser.ts         # SSE stream parser
│   └── types.ts              # Type definitions
├── docs/
│   └── research/             # This research material
└── .vscode/
    └── launch.json           # Debug configuration
```

## Key Dependencies (dev only)

- `@types/vscode` — VS Code extension API types
- `typescript` — Build
- `@vscode/vsce` — VSIX packaging

**No runtime dependencies** — Uses built-in `fetch()` and VS Code APIs.

## Configuration Points

Users configure via VS Code settings:
- `qwenCopilot.apiKey` — Stored in SecretStorage (not plain settings)
- `qwenCopilot.region` — `"ap-southeast-1"`, `"us-east-1"`, etc.
- `qwenCopilot.workspaceId` — DashScope workspace ID
- `qwenCopilot.baseUrl` — Optional custom base URL override

## Provider Implementation Plan

### `provideLanguageModelChatInformation()`
1. If `silent` mode and no API key → return `[]`
2. If no API key → prompt user (via `window.showInputBox`)
3. Return array of 3 `LanguageModelChatInformation` objects (max, plus, flash)

### `provideLanguageModelChatResponse()`
1. Convert VS Code messages → OpenAI format
   - Handle text parts, tool call parts, tool result parts
   - Map roles (User→"user", Assistant→"assistant")
2. If `options.tools` present → pass as `tools` parameter + include tool definitions in system message context
3. Make streaming `fetch()` to DashScope API
4. Parse SSE stream:
   - Text delta → `progress.report(new LanguageModelTextPart(text))`
   - Tool call delta → accumulate then `progress.report(new LanguageModelToolCallPart(...))`
   - Handle `finish_reason` for end-of-stream
5. On cancellation (`token.isCancellationRequested`) → abort fetch

### `provideTokenCount()`
- Approximate: ~1.3 tokens per word for English
- Or make a non-streaming call to estimate (not ideal)
- Future: use DashScope token counting endpoint if available

## VS Code Version Requirement

Requires VS Code 1.95+ (the version where `LanguageModelChatProvider` API was introduced).
