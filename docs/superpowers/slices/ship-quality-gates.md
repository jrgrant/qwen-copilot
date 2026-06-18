---
task: "Alibaba Copilot — Pre-ship Quality Gates & Infrastructure"
task_slug: ship-quality-gates
date: 2026-06-17
carpaccio_model: qwen-plus
inseparable: false
progressed_slice: s-1
slices:
  - id: s-1
    title: Test framework + SSE parser unit tests
    scope: "Install vitest, configure test runner, write unit tests for the SSE stream parser"
    decision_focus: "Proving the test infrastructure with the highest-risk module first"
    lens_used: end-to-end
    disposition: accepted
    disposition_rationale: "Foundational — everything depends on test infra"
    file_as_issue: false
    issue_url: null
    merged_into: null
  - id: s-2
    title: Message conversion unit tests
    scope: "Write unit tests for VS Code message-to-DashScope API conversion in provider.ts"
    decision_focus: "Covering the bridge protocol between VS Code chat and DashScope"
    lens_used: acceptance-criterion
    disposition: accepted
    disposition_rationale: "Important but non-critical — depends on s-1"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/3
    merged_into: null
  - id: s-3
    title: Config resolution unit tests
    scope: "Write unit tests for config.ts: API key resolution, model mapping, silent mode"
    decision_focus: "Ensuring config drives correct extension behaviour"
    lens_used: acceptance-criterion
    disposition: accepted
    disposition_rationale: "Important but non-critical — depends on s-1"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/4
    merged_into: null
  - id: s-4
    title: API key security — `.crap/` directory mitigation
    scope: "Investigate and eliminate or isolate the .crap/ directory containing API key data"
    decision_focus: "Preventing secret exposure via filesystem persistence"
    lens_used: decision-boundary
    disposition: accepted
    disposition_rationale: "Security issue but can be filed"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/5
    merged_into: null
  - id: s-5
    title: ESLint configuration + first pass
    scope: "Install ESLint, create flat config, add lint script, fix violations"
    decision_focus: "Establishing code quality enforcement before release"
    lens_used: independence
    disposition: accepted
    disposition_rationale: "Nice to have before release"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/6
    merged_into: null
  - id: s-6
    title: Debug launch configuration
    scope: "Create .vscode/launch.json and .vscode/tasks.json for F5 debugging"
    decision_focus: "Enabling developer debugging workflow"
    lens_used: independence
    disposition: accepted
    disposition_rationale: "Developer XP — non-critical"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/7
    merged_into: null
  - id: s-7
    title: CI pipeline — test/lint/package workflow
    scope: "Create .github/workflows/ci.yml with compile, lint, test, package stages"
    decision_focus: "Automating quality verification on every push"
    lens_used: independence
    disposition: accepted
    disposition_rationale: "Automation — non-critical, depends on s-1 + s-5"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/8
    merged_into: null
  - id: s-8
    title: VSIX packaging verification
    scope: "Verify vsce package produces a valid .vsix with correct contents"
    decision_focus: "Ensuring the extension can be distributed"
    lens_used: decision-boundary
    disposition: accepted
    disposition_rationale: "Verification — non-critical"
    file_as_issue: true
    issue_url: https://github.com/jrgrant/qwen-copilot/issues/9
    merged_into: null
---

# Slicing Record — Alibaba Copilot Pre-Ship Quality Gates

**Task slug:** `ship-quality-gates`

**Date:** 2026-06-17

**Agent:** carpaccio

**Progressed slice:** _(set by user)_

## Summary

| Slice | Title | Lens | Dependencies |
|-------|-------|------|-------------|
| s-1 | Test framework + SSE parser unit tests | risk | none |
| s-2 | Message conversion unit tests | risk | s-1 (test infra) |
| s-3 | Config resolution unit tests | risk | s-1 (test infra) |
| s-4 | API key security — `.crap/` mitigation | risk | none |
| s-5 | ESLint configuration + first pass | quality | none |
| s-6 | Debug launch configuration | devxp | none |
| s-7 | CI pipeline — test/lint/package | automation | s-1, s-5 (recommended) |
| s-8 | VSIX packaging verification | risk | none |

**Total slices:** 8

---

## S-1 — Test framework + SSE parser unit tests

**Lens:** end-to-end

### Context

The Alibaba Copilot extension has no test framework. The SSE parser (`src/sse-parser.ts`) handles streaming I/O at the extension boundary and has a critical edge case: partial lines across chunk boundaries. Without tests, regressions in stream parsing are undetectable until runtime.

### Decision content

Install vitest, create a vitest config, and write unit tests for the SSE parser covering: complete single events, multiple events in one chunk, partial line at chunk boundary, `data:` prefix parsing, empty lines / heartbeats, and the `[DONE]` sentinel.

### Dependencies

None — this is the foundational test infrastructure slice.

### Rationale

Highest risk first. The SSE parser is the most I/O-critical module and partial-chunk parsing is a known failure pattern. Proving the test infrastructure with the most critical module defers lower-risk tests (message conversion, config resolution) to s-2 and s-3.

---

## S-2 — Message conversion unit tests

**Lens:** acceptance-criterion

### Context

`provider.ts` contains message conversion logic that bridges VS Code's chat protocol (LanguageModelChatRequestMessage) with DashScope's OpenAI-compatible Chat Completions format. Incorrect mapping produces silent failures that are hard to diagnose.

### Decision content

Write tests for: user/assistant role mapping, text parts, tool call parts, tool result parts, conversation history (multi-turn), empty message lists, and image data parts for vision support.

### Dependencies

Requires s-1 (test infrastructure: vitest config + runner).

### Rationale

Message conversion is the protocol bridge. Testing it independently catches mapping bugs before they cause runtime failures in the streaming chat response.

---

## S-3 — Config resolution unit tests

**Lens:** acceptance-criterion

### Context

`config.ts` handles API key retrieval via SecretStorage, region/workspace resolution, base URL assembly, and silent-mode detection. Config errors cause cryptic failures.

### Decision content

Write tests for: API key read from secrets, model selection (MODEL_MAP), region URL template resolution, custom base URL override, empty/missing key handling, and silent mode returning empty model list.

### Dependencies

Requires s-1 (test infrastructure).

### Rationale

Config drives all extension behaviour — wrong model mapping or silent-mode logic causes the extension to not appear in the model picker. Mocking VS Code APIs (SecretStorage, workspace.getConfiguration) is straightforward with vitest.

---

## S-4 — API key security: `.crap/` directory mitigation

**Lens:** decision-boundary

### Context

A `.crap/Default Workspace-apiKey-369396.csv` file exists on disk containing API key data. This violates the project's C2 constraint (secret storage only, never disk). It's currently gitignored but still present in the working tree.

### Decision content

Investigate the source of `.crap/`, determine if it's a Copilot CLI artifact. Apply mitigation: eliminate the directory, add `.crap/` to ignore files, and ensure no API key material persists outside SecretStorage.

### Dependencies

None.

### Rationale

Secret exposure is the highest-severity risk. Keys on disk can leak via backups, Settings Sync, or accidental commit. C2 explicitly forbids it.

---

## S-5 — ESLint configuration + first pass

**Lens:** independence

### Context

No linting is configured. The project conventions (2-space indent, single quotes, no semicolons) are not enforced. AGENTS.md and CLAUDE.md both note linting as a pre-release requirement.

### Decision content

Install ESLint with TypeScript plugin, create eslint.config.js (flat config), add lint script, fix all violations.

### Dependencies

None.

### Rationale

Can be done independently at any time. Establishes code quality enforcement that CI (s-7) will need.

---

## S-6 — Debug launch configuration

**Lens:** independence

### Context

No `.vscode/launch.json` exists. Developers cannot F5 debug the extension.

### Decision content

Create `.vscode/launch.json` with Extension + Watch configuration and `.vscode/tasks.json` with a watch task.

### Dependencies

None.

### Rationale

Standalone developer experience improvement. No dependencies on any other slice.

---

## S-7 — CI pipeline: test/lint/package workflow

**Lens:** independence

### Context

Only an `ai-literacy.yml` workflow exists. No CI enforces compilation, tests, linting, or packaging.

### Decision content

Create `.github/workflows/ci.yml` with compile, lint (post s-5), test (post s-1), and package verification steps.

### Dependencies

Optional: s-1 (test), s-5 (lint). CI can start with compile + package only.

### Rationale

Automation depends on test and lint infrastructure. Can be partially implemented (compile + package) before s-1 and s-5 merge.

---

## S-8 — VSIX packaging verification

**Lens:** decision-boundary

### Context

Extension must produce a valid `.vsix` for distribution. `.vscodeignore` currently excludes `src/` which is correct, but packaging hasn't been verified.

### Decision content

Run `npm run package`, verify output, check `.vscodeignore` completeness, confirm reasonable size.

### Dependencies

None.

### Rationale

Packaging failure blocks shipping regardless of code quality. Quick to verify.

---

## Sequencing recommendation

> Recommended order: s-1 → (s-2, s-3 in parallel) → s-4 → s-5 → s-6 → s-8 → s-7
>
> The risk-lens slices (s-1, s-4) should go first. s-2 and s-3 depend on s-1's test infra but are independent of each other. s-5 and s-6 are independent. s-7 should come last because it depends on s-1 and s-5. s-8 is independent and can be done at any point.

## Explicitly not slicing on

- **New features** — adding new models, vision improvements, or tool-calling enhancements is out of scope
- **Performance optimization** — no benchmarking or latency improvements
- **Documentation overhaul** — README is adequate; no new docs beyond what shipping requires
- **Refactoring** — no restructuring beyond what linting and testability demand
- **CLI support** — no GitHub Copilot CLI integration work
