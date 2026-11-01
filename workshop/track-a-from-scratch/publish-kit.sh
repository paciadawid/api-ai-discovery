#!/usr/bin/env bash
# Publish the participant kit as a standalone template repository.
# This repo stays the source of truth: edit participant-kit/ here, never in the template.
# Usage: bash publish-kit.sh <target-dir> [--push]
#   <target-dir> is a clone of the template repo (or an empty dir: it is turned into a git repo).
#   Without --push it only syncs and commits locally; with --push it also pushes the current branch.
set -euo pipefail
cd "$(dirname "$0")"
target="${1:?target dir (a clone of the template repo)}"
push="${2:-}"
mkdir -p "$target"; target="$(cd "$target" && pwd)"

# --delete drops files removed from the kit; --exclude keeps the target's .git, and keeps local junk out.
rsync -a --delete \
  --exclude='.git' --exclude='node_modules' --exclude='test-results' --exclude='playwright-report' \
  --exclude='.env' --exclude='.DS_Store' --exclude='.playwright-cli' --exclude='.playwright-mcp' \
  participant-kit/ "$target/"

# The kit must never carry answer keys, credentials or the facilitator folder.
if find "$target" -path "$target/.git" -prune -o \( -iname 'facilitator' -o -iname '*answer*' -o -name '.env' \) -print | grep -q .; then
  echo "ERROR: answer keys, facilitator material or .env in $target" >&2; exit 1
fi
[ -f "$target/package-lock.json" ] || { echo "ERROR: package-lock.json missing (npm ci needs it)" >&2; exit 1; }
echo "Synced participant-kit/ to $target. No answer keys or .env inside."

[ -d "$target/.git" ] || git -C "$target" init -q -b main
git -C "$target" add -A
if git -C "$target" diff --cached --quiet; then
  echo "Nothing changed since the last publish."
else
  src="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  git -C "$target" commit -q -m "Sync kit from the workshop repo (${src})"
  echo "Committed: $(git -C "$target" log -1 --format=%h' '%s)"
fi
if [ "$push" = "--push" ]; then git -C "$target" push; else echo "Not pushed. Review it, then: git -C $target push"; fi
