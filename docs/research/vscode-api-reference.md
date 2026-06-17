# VS Code LanguageModelChatProvider API Reference

> Source: `vscode.d.ts` (VS Code Extension API)

## Overview

The `LanguageModelChatProvider` interface is how VS Code extensions contribute custom language models (BYOK — Bring Your Own Key) that appear in the GitHub Copilot model picker. These models are then available to Copilot Chat, Copilot Edits, and any extension using `vscode.lm.selectChatModels()`.

---

## Contribution Point (`package.json`)

```json
{
  "contributes": {
    "languageModelChatProviders": [
      {
        "vendor": "alibaba",
        "displayName": "Alibaba Qwen"
      }
    ]
  }
}
```

**Fields:**
- `vendor` — Globally unique vendor ID (e.g., `"alibaba"`, `"deepseek"`, `"openai"`)
- `displayName` — Human-readable name shown in the model picker UI

---

## Extension Activation

```typescript
// In extension.ts activate():
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const provider = new QwenChatModelProvider(context);
    context.subscriptions.push(
        vscode.lm.registerLanguageModelChatProvider('alibaba', provider)
    );
}
```

The provider is registered via `vscode.lm.registerLanguageModelChatProvider(vendor: string, provider: LanguageModelChatProvider)`.

---

## Core Interface: `LanguageModelChatProvider<T>`

```typescript
export interface LanguageModelChatProvider<T = LanguageModelChatInformation> {
    // Optional: fire when model list changes (e.g., after user updates API key)
    readonly onDidChangeLanguageModelChatInformation?: vscode.Event<void>;

    // Return available models
    provideLanguageModelChatInformation(
        options: PrepareLanguageModelChatModelOptions,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<T[]>;

    // Stream response for a chat request
    provideLanguageModelChatResponse(
        model: T,
        messages: readonly LanguageModelChatRequestMessage[],
        options: ProvideLanguageModelChatResponseOptions,
        progress: vscode.Progress<LanguageModelResponsePart>,
        token: vscode.CancellationToken
    ): vscode.Thenable<void>;

    // Count tokens for a text or message
    provideTokenCount(
        model: T,
        text: string | LanguageModelChatRequestMessage,
        token: vscode.CancellationToken
    ): vscode.Thenable<number>;
}
```

---

## `LanguageModelChatInformation`

Model descriptor returned by `provideLanguageModelChatInformation()`:

```typescript
export interface LanguageModelChatInformation {
    readonly id: string;                  // Unique within the vendor (e.g., "qwen-plus")
    readonly name: string;                // Display name (e.g., "Qwen-Plus")
    readonly family: string;              // Model family (e.g., "qwen3.7")
    readonly version: string;             // Version string
    readonly maxInputTokens: number;       // Max context window tokens
    readonly maxOutputTokens: number;      // Max completion tokens
    readonly tooltip?: string;            // Hover tooltip text
    readonly detail?: string;             // Additional description rendered alongside
    readonly capabilities: LanguageModelChatCapabilities;
}
```

---

## `LanguageModelChatCapabilities`

```typescript
export interface LanguageModelChatCapabilities {
    readonly imageInput?: boolean;        // Model supports image inputs
    readonly toolCalling?: boolean | number; // Supports tool/function calling (number = max tools)
}
```

---

## `PrepareLanguageModelChatModelOptions`

```typescript
export interface PrepareLanguageModelChatModelOptions {
    readonly silent: boolean;  // If true, do NOT prompt the user for credentials
}
```

When `silent` is `true`, return an empty array `[]` if the API key is not configured — do not show UI.

---

## `ProvideLanguageModelChatResponseOptions`

```typescript
export interface ProvideLanguageModelChatResponseOptions {
    readonly modelOptions?: { readonly [name: string]: any };
    readonly tools?: readonly LanguageModelChatTool[];
    readonly toolMode: LanguageModelChatToolMode;
}
```

---

## `LanguageModelChatToolMode`

```typescript
export enum LanguageModelChatToolMode {
    Auto = 1,     // Model chooses whether to call a tool
    Required = 2  // Model MUST call one of the provided tools
}
```

---

## `LanguageModelChatTool`

```typescript
export interface LanguageModelChatTool {
    name: string;                    // Tool name
    description: string;             // Tool description
    inputSchema?: object | undefined; // JSON Schema for tool input
}
```

---

## `LanguageModelChatRequestMessage`

The provider receives messages in this format:

```typescript
export interface LanguageModelChatRequestMessage {
    readonly role: LanguageModelChatMessageRole;
    readonly content: ReadonlyArray<LanguageModelInputPart | unknown>;
    readonly name: string | undefined;
}
```

---

## `LanguageModelChatMessageRole`

```typescript
export enum LanguageModelChatMessageRole {
    User = 1,
    Assistant = 2
}
```

Note: VS Code's message role only has User (1) and Assistant (2). System messages may come through as named User messages.

---

## Response Parts (for `progress.report()`)

### `LanguageModelTextPart`
```typescript
export class LanguageModelTextPart {
    value: string;
    constructor(value: string);
}
```

### `LanguageModelToolCallPart`
```typescript
export class LanguageModelToolCallPart {
    callId: string;
    name: string;
    input: object;
    constructor(callId: string, name: string, input: object);
}
```

### `LanguageModelDataPart`
```typescript
export class LanguageModelDataPart {
    static image(data: Uint8Array, mime: string): LanguageModelDataPart;
    static json(value: any, mime?: string): LanguageModelDataPart;
    static text(value: string, mime?: string): LanguageModelDataPart;
    constructor(data: Uint8Array, mimeType: string);
}
```

---

## Input Parts (in `LanguageModelChatRequestMessage.content`)

### `LanguageModelToolResultPart`
```typescript
export class LanguageModelToolResultPart {
    callId: string;
    content: Array<LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart | unknown>;
    constructor(callId: string, content: Array<...>);
}
```

---

## `Progress<T>` Interface

```typescript
export interface Progress<T> {
    report(value: T): void;
}
```

---

## Message Conversion Pattern

Example from VS Code docs — converting VS Code messages to OpenAI-format messages:

```typescript
private convertMessages(messages: readonly LanguageModelChatRequestMessage[]) {
    return messages.map(msg => ({
        role: msg.role === vscode.LanguageModelChatMessageRole.User ? 'user' : 'assistant',
        content: msg.content
            .filter(part => part instanceof vscode.LanguageModelTextPart)
            .map(part => (part as vscode.LanguageModelTextPart).value)
            .join('')
    }));
}
```

---

## `lm` Namespace Utilities

```typescript
// Register a provider
vscode.lm.registerLanguageModelChatProvider(vendor: string, provider: LanguageModelChatProvider): Disposable;

// Event when chat models change
vscode.lm.onDidChangeChatModels: Event<void>;

// Invoke a registered tool
vscode.lm.invokeTool(name: string, options: LanguageModelToolInvocationOptions<object>, token?: CancellationToken): Thenable<LanguageModelToolResult>;
```

---

## Key Design Considerations

1. **Streaming is required** — The provider MUST report response parts via `progress.report()` as they arrive from the upstream API. Don't wait for the full response.

2. **Silent mode** — When `options.silent` is true, return `[]` from `provideLanguageModelChatInformation` if no API key is configured. Only prompt for credentials when `silent` is false.

3. **Tool calling** — The provider receives `options.tools` and `options.toolMode`. When the upstream model returns a tool call, report a `LanguageModelToolCallPart`. The host will handle tool execution and send back results in subsequent messages.

4. **Cancellation** — Always check `token.isCancellationRequested` during streaming and abort fetch requests immediately.

5. **Token counting** — `provideTokenCount()` should return an estimate. For OpenAI-compatible APIs, use `/tokens` or estimate at ~1.3 tokens per word as fallback.

6. **Model info changes** — Fire `onDidChangeLanguageModelChatInformation` when the user changes their API key or base URL, so VS Code refreshes the model list.
