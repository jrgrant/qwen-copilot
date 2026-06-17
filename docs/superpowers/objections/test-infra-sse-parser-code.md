---
mode: code
spec: docs/superpowers/specs/2026-06-17-test-infra-sse-parser.md
slug: test-infra-sse-parser
reviewer: advocatus-diaboli (code mode)
date: 2026-06-17
objections:
  - id: O1
    category: implementation
    severity: high
    claim: Tests colocated in src/ will be compiled by tsc and bundled in production output
    evidence: "src/sse-parser.test.ts is under src/ and tsc compiles all src/**/*.ts. tsconfig.json needs exclude pattern for *.test.ts."
    disposition: accepted
    disposition_rationale: "Add exclude pattern to tsconfig.json"
  - id: O2
    category: risk
    severity: high
    claim: No CI integration means zero automated regression protection
    evidence: "Test infra exists in isolation — no GitHub Actions workflow wires npm test to any automation gate."
    disposition: deferred
    disposition_rationale: "Sliced as s-7 (issue #8) — out of scope for s-1"
  - id: O3
    category: risk
    severity: medium
    claim: No code coverage configuration — visibility gap into test quality
    evidence: "vitest.config.ts does not configure coverage. No way to verify which code paths are exercised."
    disposition: deferred
    disposition_rationale: "Can be added as follow-up; not blocking s-1"
  - id: O4
    category: implementation
    severity: medium
    claim: .vscodeignore excludes vitest.config.ts but not compiled test outputs
    evidence: "Compiled out/sse-parser.test.js will ship in VSIX unless out/**/*.test.js is excluded."
    disposition: accepted
    disposition_rationale: "Add out/**/*.test.* to .vscodeignore"
  - id: O5
    category: alternatives
    severity: medium
    claim: vitest adds supply chain surface where node:test could have sufficed
    evidence: "C1: zero runtime deps. node:test is built into Node 20+ (ES2022 target). Already addressed as accepted O3 in spec mode."
    disposition: rejected
    disposition_rationale: "Already addressed in spec mode (O3 accepted with rationale). vitest chosen for ergonomics."
  - id: O6
    category: implementation
    severity: low
    claim: No shared test utilities or fixtures — duplication risk as suite grows
    evidence: "Only src/sse-parser.test.ts exists. No test-utils/ or shared mock factory module."
    disposition: deferred
    disposition_rationale: "Acceptable for single test file; can extract shared utils when second test file is added"
  - id: O7
    category: specification quality
    severity: low
    claim: Spec does not define acceptance criteria or completeness threshold for tests
    evidence: "No coverage threshold, no hazard analysis, no property-based testing requirement. Done by author's judgment."
    disposition: rejected
    disposition_rationale: "9 scenarios map 1:1 to spec requirements — completeness is defined by scenario coverage, not thresholds"

---

# Code-Mode Objection Record — test-infra-sse-parser

**Spec:** `docs/superpowers/specs/2026-06-17-test-infra-sse-parser.md`
**Date:** 2026-06-17
**Mode:** code
**Diaboli model:** DeepSeek V4 Flash

## O1 — implementation — high

Tests colocated in `src/` will be compiled by `tsc` and bundled in production output. `tsconfig.json` exclude pattern needed for `*.test.ts`.

## O2 — risk — high

No CI integration means zero automated regression protection. CI is sliced as s-7 (issue #8) — out of scope for s-1.

## O3 — risk — medium

No code coverage configuration — visibility gap into test quality. Can be added in a follow-up.

## O4 — implementation — medium

`.vscodeignore` excludes `vitest.config.ts` but not compiled test outputs. `src/**` excludes source but `out/sse-parser.test.js` would ship.

## O5 — alternatives — medium

vitest adds supply chain surface where `node:test` could have sufficed. Already addressed as accepted O3 in spec mode.

## O6 — implementation — low

No shared test utilities — duplication risk as suite grows. Acceptable for single test file.

## O7 — specification quality — low

Spec does not define completeness threshold for tests. Acceptable for focused s-1 scope.

## Summary

| Severity | Count |
|----------|-------|
| High | 2 (O1, O2) |
| Medium | 3 (O3, O4, O5) |
| Low | 2 (O6, O7) |

## Explicitly not objecting to

1. Choice of vitest as test framework — reasonable for TypeScript/ES2022 stack
2. Scope limited to SSE parser only — appropriate incremental investment
3. 9 test cases covering core scenarios — comprehensive for s-1
4. No changes needed to src/sse-parser.ts — parser was already sound
