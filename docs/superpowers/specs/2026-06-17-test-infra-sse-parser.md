# Test Infrastructure + SSE Parser Unit Tests

**Slice:** s-1 (from `ship-quality-gates` slicing record)
**Date:** 2026-06-17
**Status:** Draft
**Spec author:** spec-writer agent

---

## 1. User Stories

1. As a **developer**, I want **vitest installed and configured** so that I can run unit tests with a single command and get fast, watch-mode feedback during development.
2. As a **maintainer**, I want **vitest integrated into the VS Code extension's npm scripts** so that CI and pre-publish steps can verify behaviour automatically.
3. As a **developer**, I want **unit tests for `parseSSEStream`** so that I can be confident the SSE parser correctly handles the full range of wire-format inputs — including edge cases like partial chunks, heartbeats, the `[DONE]` sentinel, abort signals, and malformed data — _before_ real DashScope traffic flows through it.
4. As a **code reviewer**, I want **tests that are deterministic and don't require network access** so that they can run offline and in CI without external dependencies.

---

## 2. Acceptance Scenarios

### S1-SC1: vitest installation and configuration

**Given** the project root
**When** `npm install` is run
**Then** `vitest` is present in `node_modules/.bin/vitest`
**And** `vitest` is listed in `devDependencies` in `package.json`

**Given** `vitest` is installed
**When** `npx vitest --version` is run
**Then** it exits 0 and prints a version string >= 3.x

**Given** a vitest config file at the project root
**When** vitest discovers test files
**Then** it looks for `**/*.test.ts` files (collocated with source in `src/`)

### S1-SC2: SSE parser — complete single event

**Given** a stream delivering a complete single SSE event
```
data: {"id":"1","object":"chat.completion.chunk","created":1719000000,"model":"qwen3.7-max","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n
```
**When** `parseSSEStream` iterates to completion
**Then** it yields exactly one chunk
**And** that chunk's `choices[0].delta.content` equals `"Hello"`
**And** `choices[0].finish_reason` is `null`

### S1-SC3: SSE parser — multiple events

**Given** a stream delivering three consecutive SSE events
**When** `parseSSEStream` iterates to completion
**Then** it yields exactly three chunks
**And** each chunk preserves its own `choices[0].delta.content` value

### S1-SC4: SSE parser — partial chunk boundary

**Given** a stream that delivers a JSON payload split across two `reader.read()` calls at an arbitrary byte boundary
**When** `parseSSEStream` iterates to completion
**Then** it yields the same chunk as if the payload arrived in a single read
**And** no partial or malformed data is yielded

### S1-SC5: SSE parser — non-data lines and heartbeats are skipped

**Given** a stream that includes lines without the `data:` prefix (e.g. comments, empty lines, heartbeats like `:\n\n` or `data:\n\n`)
**When** `parseSSEStream` iterates to completion
**Then** all non-data lines are silently skipped
**And** only valid `data:` lines produce yield values

### S1-SC6: SSE parser — `[DONE]` sentinel

**Given** a stream that sends `data: [DONE]\n\n` (a complete SSE event — the `\n\n` termination is required for the `[DONE]` to be detected at the line-splitting boundary)
**When** `parseSSEStream` encounters the `[DONE]` line
**Then** it stops iterating immediately (`return`)
**And** any data after `[DONE]` is not yielded

### S1-SC7: SSE parser — abort signal

**Given** a stream that is mid-delivery
**When** the caller's `AbortSignal` transitions to aborted
**Then** `parseSSEStream` breaks out of its read loop immediately
**And** discards any buffered but unprocessed data (no partial yields)
**And** the current iteration stops without processing further chunks

### S1-SC8: SSE parser — malformed JSON

**Given** a stream delivering `data: {invalid json}\n\n`
**When** `parseSSEStream` processes the line
**Then** it silently skips the malformed line (no throw, no yield)
**And** continues processing subsequent lines

### S1-SC9: Test runner integration

**Given** vitest is configured and tests exist
**When** `npm test` is run
**Then** all tests pass (exit 0)
**And** a summary line is printed with the number of passing tests

**Given** the project has no runtime dependency on vitest
**When** `npm ls vitest` is run
**Then** vitest does not appear in the production dependency tree
**And** `npm pack --dry-run` does not include `vitest` or any test files in the tarball

---

## 3. Requirements

| ID | Description | Scenario Coverage | Priority |
|---|---|---|---|
| **REQ-001** | Install `vitest` (^3.x) as a `devDependency` | S1-SC1 | P0 |
| **REQ-002** | Create `vitest.config.ts` at project root with sensible defaults (ES2022 target, TypeScript support, `src/` as root) | S1-SC1 | P0 |
| **REQ-003** | Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json` | S1-SC9 | P0 |
| **REQ-004** | Create `src/sse-parser.test.ts` collocated with the source module | S1-SC2–S1-SC8 | P0 |
| **REQ-005** | Test that a single complete SSE event is parsed into the correct `DashScopeStreamChunk` shape | S1-SC2 | P0 |
| **REQ-006** | Test that multiple consecutive events are each yielded as separate chunks | S1-SC3 | P0 |
| **REQ-007** | Test that a JSON payload split across chunk boundaries is correctly reassembled and parsed | S1-SC4 | P0 |
| **REQ-008** | Test that lines without a `data:` prefix (blank lines, heartbeats, comments) are silently skipped | S1-SC5 | P0 |
| **REQ-009** | Test that the `data: [DONE]` sentinel causes the generator to return immediately | S1-SC6 | P0 |
| **REQ-010** | Test that an aborted `AbortSignal` causes the generator to exit without processing further data | S1-SC7 | P0 |
| **REQ-011** | Test that malformed JSON after `data:` is silently skipped | S1-SC8 | P0 |
| **REQ-012** | All tests are deterministic: no network calls, no filesystem I/O, no sleep/timer dependencies | S1-SC2–S1-SC8 | P0 |
| **REQ-013** | `vitest` and test files are excluded from the published VSIX (verify `.vscodeignore` or `vsce` default exclusions) | S1-SC9 | P1 |
| **REQ-014** | The test file does not import from `vscode` module (unit tests only — integration tests are out of scope) | All | P1 |

---

## 4. Implementation Notes

### 4.1 vitest Configuration

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environment: 'node',
  },
});
```

**Rationale for choices:**
- **vitest chosen over Node's built-in `node:test`** for ergonomic test discovery, watch-mode, rich assertion API, and ecosystem alignment. The project's C1 constraint (zero runtime deps) is preserved since vitest is a devDependency only — it does not ship in the VSIX. The transitive dependency cost (~30 packages) is accepted for developer productivity.
- `include: ['src/**/*.test.ts']` — collocate tests with source (convention from AGENTS.md: `src/sse-parser.ts` → `src/sse-parser.test.ts`).
- `globals: false` — explicit imports (`import { describe, it, expect } from 'vitest'`) match the project's no-default-exports style and make imports visible to TypeScript.
- `environment: 'node'` — the SSE parser uses `ReadableStreamDefaultReader` and `TextDecoder`, both available in Node 18+ (project targets ES2022). No DOM simulation needed.
- TypeScript: vitest reads `tsconfig.json` automatically; no separate `tsconfig.test.json` is needed.

### 4.2 package.json Changes

```jsonc
// Add to "scripts":
"test": "vitest run",
"test:watch": "vitest"

// Add to "devDependencies":
"vitest": "^3.1.0"
```

### 4.3 Test File: `src/sse-parser.test.ts`

#### Mocking Approach

The `parseSSEStream` function depends on two parameters:
1. `reader: ReadableStreamDefaultReader<Uint8Array>` — we create a controlled mock that returns predefined `Uint8Array` chunks.
2. `signal: AbortSignal` — we use `AbortController` to create real signals, keeping tests deterministic.

**Mock reader factory:**

```typescript
function createMockReader(
  chunks: Uint8Array[],
): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) return { done: true, value: undefined as any };
      return { done: false, value: chunks[index++] };
    },
    cancel: async () => {},
    releaseLock: () => {},
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}
```

**Helper to encode strings:**

```typescript
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
```

#### Test Structure

```
src/sse-parser.test.ts
├── describe('parseSSEStream')
│   ├── it('parses a complete single SSE event')
│   ├── it('parses multiple consecutive events')
│   ├── it('handles payload split across chunk boundaries')
│   ├── it('skips non-data lines (blank lines, heartbeats)')
│   ├── it('stops at [DONE] sentinel')
│   ├── it('exits on abort signal')
│   ├── it('skips malformed JSON without throwing')
│   └── it('handles empty stream')
```

### 4.4 Edge Case: Empty Stream

In addition to the listed scenarios, the test suite should cover an empty stream (no data ever delivered, `reader.read()` returns `{ done: true }` immediately) to verify the generator completes without yielding.

### 4.5 .vscodeignore

The `.vscodeignore` must be updated to exclude compiled test artifacts. Since `tsc` compiles `src/__tests__/*.ts` → `out/__tests__/*.js`, and `vsce` includes `out/` by default, add:

```
out/__tests__/
vitest.config.ts
```

This ensures test code is never distributed to end users via the VSIX.

### 4.6 TypeScript Path Aliases

If the project's `tsconfig.json` defines `paths` (e.g., `@/*`), add a `resolve.alias` mapping to `vitest.config.ts`:

```typescript
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

Verify the project's `tsconfig.json` does not currently define `paths`. If it does, the alias above is required for tests to resolve imports.

### 4.7 Known Tradeoffs

- **Silent malformed JSON** (S1-SC8): The parser silently skips malformed JSON lines without notifying the caller. This is an accepted risk for s-1 — adding an observability hook (e.g., an `onError` callback) can be a future enhancement. The current `try/catch` behavior matches existing production behaviour and avoids crashing the stream on transient encoding issues.

### 4.8 Out of Scope

- Integration tests that require a real DashScope API key or network access.
- Tests for `provider.ts`, `config.ts`, or `extension.ts` — these are covered by slices s-2 and s-3.
- Code coverage thresholds — configure after the initial test suite is stable.
- ESLint integration with vitest (`eslint-plugin-vitest`) — configure in slice s-5 (ESLint setup).
