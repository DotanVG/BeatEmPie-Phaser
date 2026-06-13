#!/usr/bin/env bash
#
# Guardrail: refuse to do feature work directly on `main`.
# Feature work must branch from `staging` (see docs/BRANCH_STRATEGY.md).
#
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

if [ "$branch" = "main" ]; then
  echo "❌ You are on 'main'. Do not commit feature work to main." >&2
  echo "   Branch from staging instead:" >&2
  echo "     git fetch origin" >&2
  echo "     git checkout staging && git merge --ff-only origin/staging" >&2
  echo "     git checkout -b feature/<ticket>-<slug>" >&2
  exit 1
fi

echo "✅ On branch '$branch' (not main) — safe to proceed."
exit 0
