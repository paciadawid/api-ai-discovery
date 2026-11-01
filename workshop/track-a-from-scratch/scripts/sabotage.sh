#!/usr/bin/env bash
# "Prove the tests can fail": break the code under the tests (src/) one way at a time and see which run notices.
# Usage: [MUTANTS="1 3"] [PW_ARGS="tests/products tests/cart"] bash scripts/sabotage.sh <project-dir>
#   Answer key:        bash scripts/sabotage.sh facilitator/solution
#   Your own project:  run it from the kit folder:  bash <path>/sabotage.sh .
# Every sabotage runs in a throw-away COPY of the project (node_modules is linked, .env is copied): the original is never edited.
# Mutant 6 makes the fixture lose track of favorites it created, so a run can leave one behind: if your next `npm test` fails the "not a favorite yet" precondition, remove it in Postman (that is the hint doing its job).
# A sabotage whose pattern does not occur is reported NOT APPLICABLE: break the same idea by hand.
# Mutant 5 (login) needs your account in .env; without it, limit the run: MUTANTS="1 2 3 4 6 7"  PW_ARGS="tests/products tests/cart tests/pokeapi".
set -u
dir="$(cd "${1:?project dir}" && pwd)"
[ -f "$dir/playwright.config.ts" ] || { echo "No playwright.config.ts in $dir"; exit 2; }
read -r -a pw_args <<< "${PW_ARGS:-}"

names=(
  "search sends the wrong query parameter (search ignores the term)"
  "cart add always sends quantity 1 (the amount is ignored)"
  "set-quantity goes to a wrong URL"
  "product filter drops the sort (sorting does nothing)"
  "login goes to a wrong URL"
  "every reply claims status 200"
  "the cart cleanup in the fixture reads the cart instead of deleting it"
)
files=(src/api/products.api.ts src/api/carts.api.ts src/api/carts.api.ts src/api/products.api.ts src/api/users.api.ts src/api/reply.ts src/fixtures/index.ts)
exprs=(
  "s#params: { q }#params: { query: q }#"
  "s#data: { product_id: productId, quantity }#data: { product_id: productId, quantity: 1 }#"
  "s#/product/quantity#/product/quantityX#"
  "s#get('/products', { params })#get('/products', { params: { ...params, sort: undefined } })#"
  "s#/users/login#/users/log1n#"
  "s#status: res.status()#status: 200#"
  "s#(id) => carts.delete(id)#(id) => carts.get(id)#g"
)

run() { (cd "$1" && npx playwright test --reporter=line ${pw_args[@]+"${pw_args[@]}"} 2>&1); }

work=$(mktemp -d /tmp/sabotage.XXXXXX); trap 'rm -rf "$work"' EXIT
fresh() { # fresh <name>: a copy of the project without node_modules and reports
  local d="$work/$1"; mkdir -p "$d"
  (cd "$dir" && tar --exclude=node_modules --exclude=test-results --exclude=playwright-report -cf - .) | (cd "$d" && tar -xf -)
  ln -s "$dir/node_modules" "$d/node_modules"; echo "$d"
}

base=$(fresh base); base_out=$(run "$base"); base_code=$?
if [ $base_code -ne 0 ]; then
  echo "Baseline FAILED before any sabotage: fix this first (no .env user? host down? missing npm install?)."
  echo "$base_out" | tail -8; exit 3
fi

survivors=0
for i in 0 1 2 3 4 5 6; do
  n=$((i + 1)); case " ${MUTANTS:-1 2 3 4 5 6 7} " in *" $n "*) ;; *) continue ;; esac
  d=$(fresh "m$n")
  sed "${exprs[$i]}" "$d/${files[$i]}" > "$d/${files[$i]}.new" && mv "$d/${files[$i]}.new" "$d/${files[$i]}"
  if cmp -s "$dir/${files[$i]}" "$d/${files[$i]}"; then
    echo "mutant $n  NOT APPLICABLE  ${names[$i]} (pattern not found; break something equivalent by hand)"; continue
  fi
  out=$(run "$d"); code=$?
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
