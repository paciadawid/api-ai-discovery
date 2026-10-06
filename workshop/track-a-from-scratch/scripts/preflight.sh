#!/usr/bin/env bash
# Pre-flight for the workshop. Run it from the project folder you will teach in (the one with node_modules).
# Usage: bash preflight.sh            (prints one PASS/FAIL line per check, exit code 1 if any check fails)
set -u
BASE_URL="${BASE_URL:-https://bearstore-testsite.smartbear.com}"
fail=0
check() { # check "<label>" <command...>
  local label="$1"; shift
  if out=$("$@" 2>&1); then echo "PASS  $label"; else echo "FAIL  $label"; echo "$out" | head -5 | sed 's/^/        /'; fail=1; fi
}

cli=./node_modules/.bin/playwright-cli
[ -x "$cli" ] || cli="npx playwright-cli"
check "playwright-cli is installed (list works)" $cli list

check "site answers 200 ($BASE_URL)" bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $BASE_URL/)\" = 200 ]"

if ls playwright.config.* >/dev/null 2>&1; then
  check "playwright config loads (--list works; \"No tests found\" is fine before the first test)" \
    bash -c 'out=$(npx playwright test --list 2>&1); code=$?; [ $code -eq 0 ] || echo "$out" | grep -q "No tests found"'
else
  echo "SKIP  no playwright.config.* here (expected on the very first step of Track A)"
fi

[ $fail -eq 0 ] && echo "Pre-flight OK" || echo "Pre-flight FAILED: use the fallback ladder in the conspect"
exit $fail
