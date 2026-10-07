#!/usr/bin/env bash
# Print files one after another, each with a header, ready to paste into any AI chat.
# Usage: bash scripts/bundle.sh <file>... | pbcopy                    (macOS)
#        bash scripts/bundle.sh <file>... | clip                      (Windows, Git Bash)
#        bash scripts/bundle.sh <file>... | xclip -selection clipboard (Linux)
set -u
[ $# -gt 0 ] || { echo "usage: bash scripts/bundle.sh <file>..." >&2; exit 2; }
for f in "$@"; do
  [ -f "$f" ] || { echo "no such file: $f" >&2; exit 2; }
  printf '\n===== FILE: %s =====\n' "$f"
  cat "$f"
done
