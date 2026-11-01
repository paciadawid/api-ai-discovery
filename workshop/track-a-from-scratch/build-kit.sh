#!/usr/bin/env bash
# Build the participant zip: the kit without node_modules, reports, .env or the answer keys.
# Usage: bash build-kit.sh [output-dir]   (default: dist/)
set -euo pipefail
cd "$(dirname "$0")"
out="${1:-dist}"
mkdir -p "$out"
rm -f "$out/participant-kit.zip"
zip -rq "$out/participant-kit.zip" participant-kit \
  -x 'participant-kit/node_modules/*' 'participant-kit/playwright-report/*' 'participant-kit/test-results/*' \
     'participant-kit/.env' '*/.DS_Store'
echo "Built $out/participant-kit.zip ($(du -h "$out/participant-kit.zip" | cut -f1))"
unzip -l "$out/participant-kit.zip" | grep -Ei 'facilitator|\.env$|answer' && { echo "ERROR: answer keys or .env in the zip" >&2; exit 1; } || echo "No answer keys or .env inside."
