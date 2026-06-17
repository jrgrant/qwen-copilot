# Existing BYOK Plugin Research

## Overview

Several VS Code extensions exist that provide BYOK (Bring Your Own Key) model providers to GitHub Copilot. The dominant pattern is implementing `LanguageModelChatProvider` and registering it via `vscode.lm.registerLanguageModelChatProvider()`.

---

## Known Implementation Pattern

The standard pattern used by DeepSeek, OpenAI, and other BYOK plugins:

1. **`package.json`** — Declares `languageModelChatProviders` contribution with a unique `vendor` ID
2. **`extension.ts`** — Calls `vscode.lm.registerLanguageModelChatProvider()` in `activate()`
3. **Provider class** — Implements 3 methods:
   - `provideLanguageModelChatInformation()` — Return model list; prompt for API key on first call
   - `provideLanguageModelChatResponse()` — Convert messages → upstream API call → stream back via `progress.report()`
   - `provideTokenCount()` — Estimate token count
4. **API Key Storage** — Uses `vscode.SecretStorage` (`context.secrets`) for secure API key storage
5. **Settings** — Uses `vscode.workspace.getConfiguration()` for base URL, model selection
6. **HTTP Client** — Uses `fetch()` (built-in) or `undici` for streaming requests to OpenAI-compatible APIs

---

## VS Code Marketplace Examples

Known extensions that follow this pattern (for reference):
- Various "Copilot BYOK" extensions on the marketplace
- The VS Code team's own sample: `vscode-extension-samples` repo contains a language model provider sample

---

## Key Implementation Details Gleaned from VS Code API Docs

### Silent Mode
```typescript
async provideLanguageModelChatInformation(
    options: { silent: boolean },
    token: vscode.CancellationToken
): Promise<LanguageModelChatInformation[]> {
    if (options.silent) {
        return []; // Don't prompt user in silent mode
    } else {
        await this.promptForApiKey(); // Prompt user for credentials
    }
    const models = await this.fetchAvailableModels();
    return models.map(model => ({ /* map to LanguageModelChatInformation */ }));
}
```

### Streaming Response
```typescript
async provideLanguageModelChatResponse(
    model: LanguageModelChatInformation,
    messages: readonly LanguageModelChatRequestMessage[],
    options: ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<LanguageModelResponsePart>,
    token: vscode.CancellationToken
): Promise<void> {
    // Convert messages to OpenAI format
    const openaiMessages = this.convertMessages(messages);

    // Make streaming request
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model.id, messages: openaiMessages, stream: true, ... }),
    });

    // Read SSE stream and report each chunk
    const reader = response.body.getReader();
    // ... parse SSE, for each text delta:
    progress.report(new vscode.LanguageModelTextPart(deltaContent));
}
```

### Message Conversion
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

## Architecture Decisions to Consider

1. **OpenAI SDK vs raw fetch** — Using the `openai` npm package simplifies streaming, but raw `fetch` avoids a dependency. Most plugins use raw `fetch` for smaller bundle size.

2. **Secret storage** — Always use `context.secrets.store()` / `context.secrets.get()` for API keys. Never store in settings.

3. **Configuration** — Let users configure:
   - API Key (via secret storage, prompted on first use)
   - Region/Base URL
   - Workspace ID

4. **Error handling** — Wrap API errors in user-friendly messages. Common issues: invalid API key (401), rate limiting (429), network errors.

5. **Tool calling** — The provider must:
   - Pass `options.tools` to the upstream API as function/tool definitions
   - When the upstream returns a tool call, report `LanguageModelToolCallPart`
   - Handle the `toolMode` (Auto vs Required)

6. **Thinking mode** — Optionally pass `enable_thinking: true` for Qwen models that support chain-of-thought.
