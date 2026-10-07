#!/usr/bin/env bash
# "Prove the tests can fail": break the code under the tests on purpose and see which run notices.
# Usage: [MUTANTS="1 4"] bash sabotage.sh <project-dir-with-playwright-config> <spec-file-relative-to-that-dir>
#   Track A answer key:  bash scripts/sabotage.sh reference cart.spec.ts
#   Track B own tests (run in the kit folder):  bash scripts/sabotage.sh . tests/<slug>.api.spec.ts
# Each sabotage is applied to a COPY (<name>.mutN.spec.ts) that is deleted afterwards; the original is never edited.
# A sabotage whose pattern does not occur in the spec is reported as NOT APPLICABLE: apply the idea by hand.
set -u
dir="${1:?project dir}"; spec="${2:?spec file relative to project dir}"
src="$dir/$spec"; [ -f "$src" ] || { echo "No such spec: $src"; exit 2; }
base="${src%.spec.ts}"
mutants=()
trap '[ ${#mutants[@]} -gt 0 ] && rm -f "${mutants[@]}"' EXIT
run() { (cd "$dir" && npx playwright test --reporter=line "$1" 2>&1); }

names=(
  "delete endpoint URL is wrong"
  "parser can no longer see cart line inputs (attribute case)"
  "update ignores the new quantity"
  "parser reads every line's prices from the FIRST line (wrong as soon as a cart has two products)"
)
exprs=(
  's#deletecartitem?cartItemId#deletecartitemX?cartItemId#'
  's#id="itemquantity(#id="itemQuantity(#'
  "s#newQuantity: String(quantity)#newQuantity: '1'#"
  's#prices\[2 \* i\]#prices[0]#; s#prices\[2 \* i + 1\]#prices[1]#'
)

base_out=$(run "$spec"); base_code=$?
if [ $base_code -ne 0 ]; then
  echo "Baseline FAILED before any sabotage: fix this first (missing npm install? wrong host?)."
  echo "$base_out" | tail -8; exit 3
fi

survivors=0
for i in 0 1 2 3; do
  n=$((i + 1)); case " ${MUTANTS:-1 2 3 4} " in *" $n "*) ;; *) continue ;; esac; m="$base.mut$n.spec.ts"; mutants+=("$m")
  sed "${exprs[$i]}" "$src" > "$m"
  if cmp -s "$src" "$m"; then
    echo "mutant $n  NOT APPLICABLE  ${names[$i]} (pattern not found in your spec; break something equivalent by hand)"
    continue
  fi
  out=$(run "${spec%.spec.ts}.mut$n.spec.ts"); code=$?
  failed=$(echo "$out" | grep -Eo '[0-9]+ failed' | head -1)
  if [ $code -ne 0 ] && [ -z "$failed" ]; then
    echo "mutant $n  ERROR     ${names[$i]}  (the run crashed, no test failed; not counted as caught)"; survivors=$((survivors + 1))
  elif [ $code -ne 0 ]; then
    echo "mutant $n  CAUGHT    ${names[$i]}  ($failed)"
  else
    echo "mutant $n  SURVIVED  ${names[$i]}  <-- a test that does not protect you"; survivors=$((survivors + 1))
  fi
done
echo "Survivors: $survivors"
[ $survivors -eq 0 ]
