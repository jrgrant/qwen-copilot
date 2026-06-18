# Changelog

## 0.3.0 (2026-06-18)

- Settings GUI integration: rich markdown descriptions, ordering, validation, and scoping
- New "Alibaba: Open Settings" command for direct access to extension configs
- New "Alibaba: Refresh Models" command to re-discover the model list on demand
- API key migration: auto-import from deprecated settings field into SecretStorage
- README updated for Settings GUI workflow
- Fix: declare `imageInput: false` on Qwen models to prevent 400 errors when
  Copilot sends images to text-only models

## 0.2.0 (2026-06-17)

- Test infrastructure: vitest installed and configured
- SSE parser unit tests: 9 test cases
- Message conversion unit tests: 10 test cases (extracted to pure function)
- Config resolution tests: REGION_URLS and QwenConfig shape verification
- ESLint configuration + auto-fix all source files (zero errors)
- Debug launch configuration (.vscode/launch.json + tasks.json)
- CI pipeline (.github/workflows/ci.yml with compile, test, lint, package)
- API key security: removed `.crap/` directory, broadened `.gitignore`
- VSIX packaging verified (20.78 KB, clean)
- Spec-first governance: slicing record, spec, objection records (spec + code),
  and choice-story records

## 0.1.0 (2026-06-17)

- Initial release
- Qwen Max (`qwen3.7-max`), Qwen Plus (`qwen3.7-plus`), Qwen Flash (`qwen3.6-flash`) models
- Streaming chat responses via SSE
- Tool calling (function calling) support
- Secure API key storage via VS Code SecretStorage
- Configurable region, workspace ID, and custom base URL
- "Qwen: Set API Key" command
