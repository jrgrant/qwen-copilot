# AGENTS.md — Qwen Copilot

Compound learning memory across sessions.

## STYLE

- TypeScript strict mode, ES2022 target
- 2-space indent, single quotes, no semicolons
- Functions over classes where possible; no default exports
- Prefer `async/await` over `.then()`

## GOTCHAS

- VS Code extension host runs in a shared Node process — never block the event loop
- `context.secrets` is async; always `await` it
- `vscode.lm.registerLanguageModelChatProvider` requires matching `languageModelChatProviders` contribution in `package.json`
- SSE stream parsing must handle partial lines across chunk boundaries
- AbortController must be wired to cancellation; `token.isCancellationRequested` is a fallback
- DashScope workspace IDs differ by region — user must configure the right one

## ARCH_DECISIONS

- **AD1**: Zero runtime deps — uses built-in `fetch` + VS Code APIs (2026-06-17)
- **AD2**: Models: `qwen-max` → `qwen3.7-max`, `qwen-plus` → `qwen3.7-plus`, `qwen-flash` → `qwen3.6-flash` (2026-06-17)
- **AD3**: SSE parser is a standalone async generator — testable in isolation (2026-06-17)
- **AD4**: Static model list (no dynamic fetching from DashScope) — fast startup (2026-06-17)

## TEST_STRATEGY

- No tests yet. Plan:
  - Unit tests for SSE parser, message conversion, config resolution
  - Integration: manual testing against DashScope sandbox
  - Framework: `vitest` (aligns with VS Code extension ecosystem)

## DESIGN_DECISIONS

> Record design tradeoffs here as they arise.
