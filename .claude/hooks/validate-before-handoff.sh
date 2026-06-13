#!/usr/bin/env bash
#
# Run the project's validation gate before handing off / opening a PR.
# Runs each script only if it is configured in package.json, and reports failures clearly.
#
set -uo pipefail

status=0

has_script () {
  node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts['$1'] ? 0 : 1)" 2>/dev/null
}

step () {
  local s="$1"
  if has_script "$s"; then
    echo "▶  npm run $s"
    if npm run "$s" --silent; then
      echo "✅ $s passed"
    else
      echo "❌ $s FAILED"
      status=1
    fi
  else
    echo "⏭  npm run $s not configured — skipping"
  fi
}

echo "== validate-before-handoff =="
step typecheck
step build
step lint
step test

echo "-----------------------------"
if [ "$status" -ne 0 ]; then
  echo "❌ Validation failed — fix the errors above before handoff."
  exit 1
fi
echo "✅ All configured validations passed."
exit 0
