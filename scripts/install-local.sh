#!/usr/bin/env bash
#
# install-local.sh — Build, package, and install the Alibaba Copilot extension
# locally for development and testing.
#
# Usage:
#   ./scripts/install-local.sh              # Full: deps → compile → test → lint → package → install
#   ./scripts/install-local.sh --quick      # Skip tests and lint
#   ./scripts/install-local.sh --skip-tests # Skip tests only
#   ./scripts/install-local.sh --skip-lint  # Skip lint only
#   ./scripts/install-local.sh --update     # Reinstall over existing extension
#
# Requirements:
#   - Node.js >= 18
#   - VS Code CLI (`code`) on PATH
#   - jrgrant.qwen-copilot extension installed (for --update)

set -euo pipefail

# ── Colour output ──────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

# ── Parse flags ────────────────────────────────────────────────────────

SKIP_TESTS=false
SKIP_LINT=false

for arg in "$@"; do
  case "$arg" in
    --quick)     SKIP_TESTS=true; SKIP_LINT=true ;;
    --skip-tests) SKIP_TESTS=true ;;
    --skip-lint)  SKIP_LINT=true ;;
    --update)     ;; # no-op — we always overwrite
    *)
      err "Unknown flag: $arg"
      echo "Usage: $0 [--quick] [--skip-tests] [--skip-lint]"
      exit 1
      ;;
  esac
done

# ── Pre-flight checks ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VSIX_NAME="qwen-copilot.vsix"
EXTENSION_ID="jrgrant.qwen-copilot"

cd "$PROJECT_DIR"

for cmd in node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    err "$cmd is required but not found on PATH."
    exit 1
  fi
done

if ! command -v code &>/dev/null; then
  err "VS Code CLI ('code') is not on PATH."
  echo "  macOS: Open VS Code, Cmd+Shift+P → 'Shell Command: Install code command in PATH'"
  exit 1
fi

# ── Build ──────────────────────────────────────────────────────────────

log "Installing dependencies..."
npm install --silent

log "Compiling TypeScript..."
npm run compile

if [ "$SKIP_TESTS" = false ]; then
  log "Running tests..."
  npm test || {
    err "Tests failed. Aborting."
    exit 1
  }
fi

if [ "$SKIP_LINT" = false ]; then
  log "Running lint..."
  npm run lint || {
    warn "Lint warnings (non-fatal)."
  }
fi

# ── Package ────────────────────────────────────────────────────────────

log "Packaging extension into $VSIX_NAME..."
npx --yes @vscode/vsce package --out "$VSIX_NAME" --no-dependencies 2>&1 | tail -1

if [ ! -f "$VSIX_NAME" ]; then
  err "Failed to create $VSIX_NAME"
  exit 1
fi

VSIX_SIZE=$(du -h "$VSIX_NAME" | cut -f1)
log "Built $VSIX_NAME ($VSIX_SIZE)"

# ── Install ────────────────────────────────────────────────────────────

log "Installing extension into VS Code..."
code --install-extension "$VSIX_NAME" --force 2>&1 | sed 's/^/  /'

# ── Verify ─────────────────────────────────────────────────────────────

if code --list-extensions --show-versions | grep -q "$EXTENSION_ID"; then
  INSTALLED_VERSION=$(code --list-extensions --show-versions | grep "$EXTENSION_ID" | awk '{print $NF}')
  log "Extension installed: ${EXTENSION_ID} v${INSTALLED_VERSION}"
else
  warn "Extension may not have installed correctly — check VS Code."
fi

# ── Cleanup ────────────────────────────────────────────────────────────

rm -f "$VSIX_NAME"

log "Done. Reload VS Code (Cmd+Shift+P → 'Developer: Reload Window') to activate."
log "Then run 'Alibaba: Refresh Models' in the Command Palette."
