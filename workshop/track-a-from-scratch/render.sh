#!/usr/bin/env bash
# Render slides.md with the custom theme into one self-contained slides.html.
# Needs @marp-team/marp-cli (npx downloads it the first time).
set -euo pipefail
cd "$(dirname "$0")"
npx --yes @marp-team/marp-cli --no-stdin slides.md --theme-set theme.css --html -o slides.html
