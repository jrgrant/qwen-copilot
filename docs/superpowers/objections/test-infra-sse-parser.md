---
spec: test-infra-sse-parser
date: 2026-06-17
mode: spec
diaboli_model: DeepSeek V4 Flash
objections:
  - id: O1
    category: scope
    severity: medium
    claim: REQ-014 requires test files be excluded from VSIX but .vscodeignore is not updated — compiled test artifacts in out/__tests__/ will leak into the package
    evidence: "tsc compiles src/__tests__/*.ts → out/__tests__/*.js. vsce includes out/ by default. .vscodeignore needs an exclusion rule."
    disposition: accepted
    disposition_rationale: "Add out/__tests__/ to .vscodeignore"
  - id: O2
    category: risk
    severity: medium
    claim: Silently skipping malformed JSON means the caller receives no indication of data loss — incomplete responses are invisible
    evidence: "S1-SC8 and REQ-012 specify silent skip. No error event, log, callback, or return path for the caller to detect corruption."
    disposition: accepted
    disposition_rationale: "Accept the risk for s-1 — observability hook can be added later as enhancement"
  - id: O3
    category: alternatives
    severity: medium
    claim: node:test (Node 20 built-in) would achieve same goals with zero devDeps, aligning better with C1/AD1 — vitest not weighed
    evidence: "AD1: Zero runtime deps. C1: Minimise supply-chain. node:test requires zero npm packages. Spec does not acknowledge tradeoff."
    disposition: accepted
    disposition_rationale: "Deferred — vitest chosen for ergonomics; node:test considered but ecosystem tooling favour vitest"
  - id: O4
    category: scope
    severity: medium
    claim: User story 3 lists heartbeats as a required edge case but no scenario covers SSE heartbeat/keep-alive lines
    evidence: "Heartbeats listed co-equally with partial chunks, [DONE], abort, malformed data — all with dedicated scenarios. No heartbeat scenario exists."
    disposition: accepted
    disposition_rationale: "Add heartbeat scenario to spec"
  - id: O5
    category: specification quality
    severity: medium
    claim: S1-SC6 does not specify wire format for [DONE] sentinel — bare line vs complete SSE event requires different parser logic
    evidence: "[DONE] could arrive as data: [DONE]\n\n (complete event) or data: [DONE] (bare line). Different buffering behavior. Undefined."
    disposition: accepted
    disposition_rationale: "Clarify [DONE] wire format in spec — match existing parser behaviour"
  - id: O6
    category: scope
    severity: low
    claim: No vitest resolve.alias config for TypeScript path aliases — tests will fail if tsconfig has paths
    evidence: "Implementation notes specify vitest config but omit resolve.alias. tsconfig paths are not automatically resolved by vitest."
    disposition: accepted
    disposition_rationale: "Add resolve.alias note to implementation notes"
  - id: O7
    category: specification quality
    severity: low
    claim: S1-SC7 ambiguous about whether already-buffered data is yielded or discarded on abort
    evidence: "'Breaks out on next iteration' vs 'does not process further chunks' are contradictory — unclear if current buffer is processed."
    disposition: accepted
    disposition_rationale: "Clarify: buffered data is discarded on abort — current iteration stops"
---

# Objection Record — test-infra-sse-parser

**Spec:** `docs/superpowers/specs/2026-06-17-test-infra-sse-parser.md`
**Date:** 2026-06-17
**Mode:** spec
**Diaboli model:** DeepSeek V4 Flash

## O1 — scope — medium

**Claim:** REQ-014 requires test files be excluded from the VSIX package, but the Implementation Notes state ".vscodeignore: No changes needed unless test artifacts leak into out/." Since `tsc` compiles `src/__tests__/*.ts` → `out/__tests__/*.js`, test artifacts **will** leak into the VSIX unless `.vscodeignore` is updated. The requirement and the implementation guidance are in direct contradiction.

**Evidence:** REQ-014 explicitly states "Test files are excluded from the VSIX package." The standard VSIX packaging tool (`vsce`) includes everything under `out/` by default unless `.vscodeignore` specifies exclusions. Since the project's `tsconfig` compiles `src/` to `out/`, any test file in `src/__tests__/` produces a `.js` output in `out/__tests__/`. No `.vscodeignore` rule is proposed to exclude these.

## O2 — risk — medium

**Claim:** Silently skipping malformed JSON (S1-SC8, REQ-012) means the caller receives no indication that data was lost or corrupted. In production, if DashScope sends malformed JSON due to a transient encoding issue, the parser will silently drop events, producing an incomplete response without any observable error signal.

**Evidence:** S1-SC8 states "it silently skips the malformed line **And** continues processing subsequent lines." REQ-012 says "Malformed JSON lines are silently skipped." No error event, warning log, callback, or alternative return path is provided.

## O3 — alternatives — medium

**Claim:** The spec selects vitest without weighing the Node.js built-in test runner (`node:test`), which became stable in Node 20. Using `node:test` would achieve the same goals with zero additional `devDependencies`, aligning more closely with C1 (zero runtime dependencies).

**Evidence:** AD1: "Zero runtime deps — uses built-in `fetch` + VS Code APIs." C1: "Zero runtime dependencies." While vitest is a devDependency, it pulls in dozens of transitive packages. `node:test` requires zero npm packages. The spec does not acknowledge this tradeoff.

## O4 — scope — medium

**Claim:** User story 3 explicitly lists "heartbeats" as a wire-format input the developer wants tested, but no acceptance scenario covers SSE heartbeat lines. The user story introduces a requirement that the scenarios do not fulfill.

**Evidence:** User story 3 lists heartbeats co-equally with partial chunks (S1-SC4), `[DONE]` (S1-SC6), abort signals (S1-SC7), and malformed data (S1-SC8). No scenario covers heartbeats. DashScope is known to send periodic empty `data:` lines.

## O5 — specification quality — medium

**Claim:** S1-SC6 (`[DONE]` sentinel) does not specify the wire format. It could be `data: [DONE]\n\n` (complete SSE event) or `data: [DONE]` (bare line). These require different parsing logic.

**Evidence:** In standard SSE, events are terminated by `\n\n`. In OpenAI's SSE dialect (which DashScope mirrors), `[DONE]` may arrive as a complete event or as a bare line. Different parser behavior depending on framing.

## O6 — scope — low

**Claim:** The spec does not define vitest `resolve.alias` config for TypeScript path aliases. If the source code uses path aliases, tests will fail to resolve imports.

**Evidence:** Implementation notes specify vitest config but omit `resolve.alias`. The project's `tsconfig.json` may define `paths` that vitest will not automatically resolve.

## O7 — specification quality — low

**Claim:** S1-SC7 ambiguous about whether already-buffered data is yielded or discarded on abort. "Breaks out on its next iteration" vs "does not process any further chunks" are contradictory.

**Evidence:** The parser may have buffered a complete event before the abort check. Should it yield that event or discard it? The spec should clarify.

## Summary

| Category | Count | Severities |
|----------|-------|------------|
| scope | 2 | medium (O1, O4), low (O6) |
| risk | 1 | medium (O2) |
| alternatives | 1 | medium (O3) |
| specification quality | 2 | medium (O5), low (O7) |

**Total:** 7 objections (0 critical, 0 high, 5 medium, 2 low)

## Explicitly not objecting to

1. Selection of vitest over Jest — vitest is the modern choice for TypeScript/ES2022
2. Collocating tests in `src/__tests__/` — standard practice
3. Using real `AbortController` for abort tests — exercises actual integration path
4. `[DONE]` sentinel stop-and-discard behavior conceptually — sensible defensive measure
5. Standard vitest script conventions (`vitest run`, `vitest` for watch)
6. Out-of-scope boundaries (integration tests, coverage thresholds, other modules)

---

_Edit `disposition` and `disposition_rationale` for each objection above before proceeding._
