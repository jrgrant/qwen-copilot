---
spec_title: "Test Infrastructure + SSE Parser Unit Tests"
spec_slug: "2026-06-17-test-infra-sse-parser"
date: 2026-06-17
cartographer: "choice-cartographer"
story_count: 6
stories:
  - id: STORY-001
    title: "vitest as testing framework"
    disposition: pending
    disposition_rationale: null
  - id: STORY-002
    title: "Collocated test files in src/__tests__/"
    disposition: pending
    disposition_rationale: null
  - id: STORY-003
    title: "Mock reader factory for deterministic offline tests"
    disposition: pending
    disposition_rationale: null
  - id: STORY-004
    title: "Real AbortController in test infrastructure"
    disposition: pending
    disposition_rationale: null
  - id: STORY-005
    title: "[DONE] sentinel as SSE stream termination contract"
    disposition: pending
    disposition_rationale: null
  - id: STORY-006
    title: "Silent malformed JSON — scoped resilience boundary"
    disposition: pending
    disposition_rationale: null
---

# Choice-Story Record — test-infra-sse-parser

**Spec:** `docs/superpowers/specs/2026-06-17-test-infra-sse-parser.md`
**Date:** 2026-06-17
**Cartographer:** choice-cartographer (automated)

## Story #1 — vitest as testing framework

**Context:** The project has zero runtime dependencies (C1). Prior to this slice there is no test framework at all — only `tsc` compilation. The spec introduces the project's first dev dependency.

**Decision:** Adopt `vitest` over `node:test` (Node built-in) as the test framework. vitest is a dev dependency only, preserving C1 at runtime. The spec explicitly records this as a deferred tradeoff (O3, accepted).

**Rationale:** vitest provides Jest-compatible API, watch mode, coverage via `@vitest/coverage-v8`, and VS Code extension integration — all desirable for the developer workflow described in user story #1. `node:test` would avoid any dep but lacks watch mode, built-in coverage, and the ergonomic `describe`/`it`/`expect` surface that matches VS Code extension testing conventions. Vitest's `defineConfig` also provides the extension point for the `resolve.alias` note (O6).

**Refs:** O3, O6, C1, REQ-001, REQ-002, REQ-009

---

## Story #2 — Collocated test files in `src/__tests__/`

**Context:** The spec must decide where test files live — a structural choice that affects discoverability, build exclusions, and CI artifact management.

**Decision:** Place test files in `src/__tests__/` directories alongside the source they test, using vitest's default `include` glob (`**/*.test.ts`).

**Rationale:** Collocation makes the test–source relationship visually immediate during development, aligning with the "deterministic offline tests" requirement (user story #4). The build output (`out/__tests__/`) must be excluded from the VSIX package — handled via `.vscodeignore` (O1). The alternative (a top-level `tests/` mirror) would require path mapping and break visual proximity.

**Refs:** O1, REQ-002, REQ-009, AD3

---

## Story #3 — Mock reader factory for deterministic offline tests

**Context:** The SSE parser (`parseSSEStream`) is a standalone async generator consuming a `ReadableStream<Uint8Array>` (AD3). Testing it requires controlled chunk delivery.

**Decision:** Build a mock reader factory that returns a `ReadableStream` from an array of encoded chunks, enabling deterministic, offline scenario coverage.

**Rationale:** A mock reader decouples tests from any real stream source. The factory pattern accepts chunk boundaries as explicit test parameters — the only way to cover the split-chunk scenario (S1-SC4) deterministically. The alternative (spinning up a local HTTP server) would violate the "offline" constraint.

**Refs:** O6, AD3, REQ-009, REQ-010, REQ-011

---

## Story #4 — Real AbortController in test infrastructure

**Context:** The abort scenario (S1-SC7) requires verifying that `parseSSEStream` stops immediately and discards buffered data when cancelled.

**Decision:** Use real `AbortController` and its associated `AbortSignal` in tests. Abort semantics defined as "discard buffered data and stop immediately" (O7, accepted).

**Rationale:** Higher fidelity than mocking — tests the actual cancellation path the production SSE consumer will use. Available in Node 20+ and VS Code extension host.

**Refs:** O7, AGENTS.md (gotchas), REQ-010

---

## Story #5 — `[DONE]` sentinel as SSE stream termination contract

**Context:** The DashScope SSE stream terminates with a `data: [DONE]\n\n` line. The spec must decide what wire format to recognise.

**Decision:** Recognise `[DONE]` as a `data:` field value (wire format: `data: [DONE]\n\n`), stop iteration, and do not yield it as a parsed event.

**Rationale:** The generator yields only meaningful JSON events and terminates on `[DONE]`. Wire format clarified during objection resolution (O5). Aligns with the SSE parser's role as a reusable primitive (AD3).

**Refs:** O5, AD3, REQ-012

---

## Story #6 — Silent malformed JSON — scoped resilience boundary

**Context:** The SSE parser may encounter non-JSON `data:` lines. The spec must decide how to handle these in s-1.

**Decision:** Malformed JSON `data:` lines are silently skipped — chunk dropped, iteration continues, no error surfaced. Accepted as risk for s-1 (O2).

**Rationale:** Simplest path satisfying S1-SC8. Keeps the SSE parser contract narrow. Adding error notification later is backward-compatible.

**Refs:** O2, AD3, REQ-014

---

## Summary

| Story | Title | Refs |
|-------|-------|------|
| 1 | vitest as testing framework | O3, O6, C1 |
| 2 | Collocated test files in src/__tests__/ | O1, AD3 |
| 3 | Mock reader factory for deterministic offline tests | AD3 |
| 4 | Real AbortController in test infrastructure | O7 |
| 5 | [DONE] sentinel as SSE stream termination contract | O5, AD3 |
| 6 | Silent malformed JSON — scoped resilience boundary | O2, AD3 |

**Cross-references resolved:** 7 O# references, 7 REQ# references
