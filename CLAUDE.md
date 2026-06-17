# CLAUDE.md — Qwen Copilot

> Harness document for the Qwen Copilot VS Code extension.
> Read before any code change. AGENTS.md is read second.

## Workflow

1. **Read this file first**, AGENTS.md second, last 20 REFLECTION_LOG.md entries third.
2. **Spec-first**: new features go through `docs/superpowers/specs/` before code.
3. **TDD**: tests written before implementation. Red → Green → Refactor.
4. **Code review**: all implementation reviewed through CUPID lens before merge.
5. **Never commit directly to main** — always feature branches.

## Build and Test

| Command | Purpose |
|---|---|
| `npm install` | Install dev deps |
| `npm run compile` | TypeScript build (`tsc -p ./`) |
| `npm run watch` | Dev watch mode |
| `npm run package` | Build VSIX (`vsce package`) |

- **No test framework yet.** Add `vitest` when tests are introduced.
- **Linting:** Not yet configured. Add `eslint` before first release.
- **Formatting:** 2-space indent, single quotes (Prettier default).

## Constraints

### C1: Zero runtime dependencies
No npm runtime packages. Use only built-in `fetch()`, VS Code APIs, and Node stdlib.
**Rationale**: Minimises supply-chain surface and avoids dependency conflicts.

### C2: Secret storage for API keys
API keys go in `vscode.SecretStorage` (`context.secrets`), never in VS Code settings.
**Rationale**: Settings are plain text and synced via Settings Sync.

### C3: Streaming responses
Stream via `progress.report()` as chunks arrive. Never buffer the full response.
**Rationale**: VS Code's contract requires incremental delivery.

### C4: Silent mode
Return `[]` from `provideLanguageModelChatInformation` when `silent: true` and no key.
**Rationale**: Silent mode is background discovery — showing UI is disruptive.

## Learnings

> Record project learnings here. Format: date, context, what was learned.
