# .claude/HARNESS.md — Qwen Copilot

Harness configuration for AI-assisted development governance.

## Context

This project is a VS Code extension (TypeScript) providing Alibaba Qwen models
as BYOK alternatives for GitHub Copilot. Zero runtime dependencies. Built with
`tsc`, packaged with `vsce`. Conventions are defined in CLAUDE.md and AGENTS.md.

## Constraints

### Per-change (PR-scoped)

| ID | Constraint | Enforcement | Verification |
|---|---|---|---|
| C1 | Zero runtime deps in package.json `dependencies` | deterministic | `node -e "process.exit(require('./package.json').dependencies?1:0)"` |
| C2 | API keys in SecretStorage, never in settings | agent-based | Review `src/config.ts` for `secrets.store` / `secrets.get` usage |
| C3 | `npm run compile` passes with no errors | deterministic | Run `npm run compile` |
| C4 | SSE parser handles partial lines across chunk boundaries | agent-based | Review `src/sse-parser.ts` buffer-residue logic |
| C5 | AbortController wired to cancellation token | agent-based | Review `src/provider.ts` for `token.onCancellationRequested` → `abortController.abort()` |

### Weekly (GC-scoped)

| ID | Rule | Cadence |
|---|---|---|
| GC1 | Check DashScope API docs for endpoint/parameter changes | Weekly |
| GC2 | Check for VS Code API deprecations affecting `LanguageModelChatProvider` | Weekly |
| GC3 | Verify `@types/vscode` version matches `engines.vscode` in package.json | Weekly |
| GC4 | Review REFLECTION_LOG.md for recurring patterns that need new constraints | Weekly |

## Verification Slots

### Deterministic

| Slot | Tool | Command |
|---|---|---|
| deps-check | node | `node -e "process.exit(require('./package.json').dependencies?1:0)"` |
| compile | tsc | `npm run compile` |

### Agent-based

| Slot | Scope | Check |
|---|---|---|
| secret-review | `src/config.ts`, `src/provider.ts` | API key only stored via SecretStorage |
| sse-review | `src/sse-parser.ts` | Buffer-residue handling across chunk boundaries is correct |
| abort-review | `src/provider.ts` | AbortController is wired to cancellation token |

## Garbage Collection

| Rule | Frequency | Action |
|---|---|---|
| GC1: API drift | Weekly | Diff current DashScope docs against `docs/research/qwen-api-reference.md` |
| GC2: API deprecations | Weekly | Check VS Code changelog for `LanguageModelChatProvider` changes |
| GC3: Type alignment | Weekly | Verify `@types/vscode` version matches `engines.vscode` in package.json |
| GC4: Reflection patterns | Weekly | Scan REFLECTION_LOG.md for recurring surprises → new constraints |

## Status

- Last harness audit: (not yet run)
- Last GC run: (not yet run)
- Next scheduled GC: (not yet set)
