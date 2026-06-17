# Changelog

## 0.2.0 (2026-06-17)

- Test infrastructure: vitest installed and configured
- SSE parser unit tests: 9 test cases covering single events, multiple events,
  partial chunk boundaries, non-data lines, `[DONE]` sentinel, abort signals,
  malformed JSON, and empty streams
- Spec-first governance: slicing record, spec, objection records (spec + code),
  and choice-story record for slice s-1 of the pre-ship quality gates
- Build exclusions: test files excluded from VSIX package and TypeScript compilation

## 0.1.0 (2026-06-17)

- Initial release
- Qwen Max (`qwen3.7-max`), Qwen Plus (`qwen3.7-plus`), Qwen Flash (`qwen3.6-flash`) models
- Streaming chat responses via SSE
- Tool calling (function calling) support
- Secure API key storage via VS Code SecretStorage
- Configurable region, workspace ID, and custom base URL
- "Qwen: Set API Key" command
