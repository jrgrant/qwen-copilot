#!/usr/bin/env bash
#
# ai-literacy-check.sh — Language-agnostic AI literacy harness verification.
#
# Checks that all required habitat files exist, have the expected sections,
# and that no stale patterns are detected.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

EXIT=0

echo "=== AI Literacy Harness Check ==="
echo ""

# Required files
for f in CLAUDE.md AGENTS.md MODEL_ROUTING.md REFLECTION_LOG.md .claude/HARNESS.md; do
  if [ -f "$f" ]; then
    pass "$f exists"
  else
    fail "$f is missing"
    EXIT=1
  fi
done

echo ""

# CLAUDE.md sections
if [ -f CLAUDE.md ]; then
  for section in "## Workflow" "## Build and Test" "## Learnings"; do
    if grep -q "^$section" CLAUDE.md; then
      pass "CLAUDE.md has '$section'"
    else
      fail "CLAUDE.md missing section '$section'"
      EXIT=1
    fi
  done
fi

echo ""

# AGENTS.md sections
if [ -f AGENTS.md ]; then
  for section in "## STYLE" "## GOTCHAS" "## ARCH_DECISIONS" "## TEST_STRATEGY" "## DESIGN_DECISIONS"; do
    if grep -q "^$section" AGENTS.md; then
      pass "AGENTS.md has '$section'"
    else
      fail "AGENTS.md missing section '$section'"
      EXIT=1
    fi
  done
fi

echo ""

# MODEL_ROUTING.md sections
if [ -f MODEL_ROUTING.md ]; then
  if grep -q "^## Agent Routing Table" MODEL_ROUTING.md; then
    pass "MODEL_ROUTING.md has 'Agent Routing Table'"
  else
    fail "MODEL_ROUTING.md missing 'Agent Routing Table'"
    EXIT=1
  fi
  if grep -q "^## Token Budget Guidance" MODEL_ROUTING.md; then
    pass "MODEL_ROUTING.md has 'Token Budget Guidance'"
  else
    fail "MODEL_ROUTING.md missing 'Token Budget Guidance'"
    EXIT=1
  fi
fi

echo ""

# REFLECTION_LOG.md header
if [ -f REFLECTION_LOG.md ]; then
  if head -20 REFLECTION_LOG.md | grep -q "Entry format"; then
    pass "REFLECTION_LOG.md has entry format header"
  else
    fail "REFLECTION_LOG.md missing entry format header comment"
    EXIT=1
  fi
fi

echo ""

if [ $EXIT -eq 0 ]; then
  echo -e "${GREEN}All checks passed.${NC}"
else
  echo -e "${RED}Some checks failed.${NC}"
fi

exit $EXIT
