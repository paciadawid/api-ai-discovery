# Run report - cart manipulation (workshop run cartws)

Date: 2026-10-02. Target: https://bearstore-testsite.smartbear.com. Spec: `tests/cartws.api.spec.ts` (only this file was run).

## 1. Verdict

6/6 tests pass (also 12/12 with `--repeat-each=2`, no flakes); 0 failures, 0 test fixes needed, 3 application bugs (KI-1, KI-2, KI-3) confirmed live with curl, two of them pinned by passing tests.

## 2. Results by area

| Area | Use cases selected | Automated | Passing | Failing | UC IDs |
|---|---|---|---|---|---|
| cart | 6 (P1 selection, max 6 tests) | 6 | 6 | 0 | UC-CARTWS-01, 02, 04, 08, 10, 11 |

Of the 12 use cases written, 6 were automated. Not automated: UC-CARTWS-03, 05, 06, 07, 09, 12 (see section 6).

## 3. Application bugs found

All three were reproduced live on 2026-10-02 with unique User-Agents and a cookie jar. The `-d ''` POST body avoids IIS 411.

Setup shared by the repros (creates a private guest cart with one Supreme Golfball line, and prints its line id):

```
UA=qa-cartws-repro-$RANDOM; J=/tmp/$UA.jar; B=https://bearstore-testsite.smartbear.com
curl -s -o /dev/null -A $UA -c $J -b $J $B/
curl -s -A $UA -c $J -b $J -H 'X-Requested-With: XMLHttpRequest' --data-urlencode 'addtocart_8.EnteredQuantity=1' $B/cart/addproduct/8/1
ID=$(curl -s -A $UA -c $J -b $J $B/cart | grep -o 'id="itemquantity[0-9]*"' | head -1 | grep -o '[0-9]*'); echo ID=$ID
```

### KI-1: updatecartitem with quantity 0 or negative returns HTTP 500 although the line is removed
- Severity guess: medium. The client is told the call failed, but the cart was mutated. A UI relying on the status would show an error and a stale cart.
- UC: UC-CARTWS-08 (the test passes and pins the buggy behaviour).
- Reproduction:
```
curl -i -A $UA -c $J -b $J -H 'X-Requested-With: XMLHttpRequest' -d 'newQuantity=0&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=$ID&isCartPage=True"
curl -s -A $UA -c $J -b $J -H 'X-Requested-With: XMLHttpRequest' -d '' "$B/shoppingcart/cartsummary?cart=True"
```
- Expected: a 2xx with the cart re-rendered without the line, or a 4xx with success:false and the line kept. Not an HTTP 500 plus a side effect.
- Observed: `HTTP/2 500`, body `{"error":true,"controller":"shoppingcart","action":"updatecartitem","message":"Object reference not set to an instance of an object."}`. The following cartsummary returns `"CartItemsCount":0`, so the line was removed. `newQuantity=-1` behaves the same way (verified by the test).

### KI-2: updatecartitem with non-numeric, empty, decimal or missing quantity returns HTTP 502
- Severity guess: medium. The error is an unhandled exception surfacing as a load-balancer 502 instead of a validation 4xx.
- UC: UC-CARTWS-09. It was discovered but NOT automated in this run (P2, not in the first 6).
- Reproduction:
```
curl -i -A $UA -c $J -b $J -H 'X-Requested-With: XMLHttpRequest' -d 'newQuantity=abc&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=$ID&isCartPage=True"
```
- Expected: 4xx (or HTTP 200 with success:false and a message), cart unchanged.
- Observed: `HTTP/2 502`, `server: awselb/2.0`, HTML body `<title>502 Bad Gateway</title>`. Per discovery the cart stays unchanged.

### KI-3: updatecartitem with an unknown or foreign line id returns HTTP 500
- Severity guess: medium for the NullReference; it is inconsistent with deletecartitem, which handles the same input gracefully with HTTP 200 and success:false. The ownership check itself works: nothing changes in the other guest's cart (asserted by UC-CARTWS-11 step 5).
- UC: UC-CARTWS-11 (the test passes and pins the buggy behaviour for a foreign id).
- Reproduction (unknown id; the foreign id case is identical but uses another guest's line id, which the test covers):
```
curl -i -A $UA -c $J -b $J -H 'X-Requested-With: XMLHttpRequest' -d 'newQuantity=2&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=999999999&isCartPage=True"
```
- Expected: 4xx, or HTTP 200 with success:false (like deletecartitem: "An error occurred during the removal of the product.").
- Observed: `HTTP/2 500`, body `{"error":true,"controller":"shoppingcart","action":"updatecartitem","message":"Object reference not set to an instance of an object."}`.

## 4. Test fixes made

None. The spec passed on the first run with no changes, and I did not edit any file.

## 5. Flaky or unresolved

- Flaky: none. Single run 6/6, and `--repeat-each=2` gave 12/12 (2 workers, so parallel guest carts also did not interfere).
- Unresolved: none.
- Residual risk: the KI-1 and KI-3 tests assert exact HTTP 500 and the NullReference message on purpose. When the app is fixed, these tests will fail by design; revisit them rather than relaxing them. UC-CARTWS-01/02/04 assert fixed prices (`$1.90`, `$7.60`, `$9.50`) for product 8, so a catalog price change would fail them.

## 6. Coverage gaps

Not automated (from `02-use-cases.md`; priorities as assigned there):
- UC-CARTWS-05 (P1): stock boundary 8563/8564. It was left out only by the 6-test limit. It depends on live inventory (Q15).
- UC-CARTWS-03 (P2): two-line mini-cart, counter and totals agreement.
- UC-CARTWS-06 (P2): the 10000/10001 maximum quantity messages.
- UC-CARTWS-07 (P2): add validation (quantity 0, -1, abc; unknown product; bad cartType).
- UC-CARTWS-09 (P2): the 502 behaviour (KI-2); only discovered, see section 3.
- UC-CARTWS-12 (LOW): move to wishlist and back.

Thin areas:
- Wishlist is not covered at all.
- Tax, shipping and discount totals are not covered. Only product 8 is price-asserted.
- Update to qty 0 with two lines in the cart (Q6) is unknown.
- Whether update, delete and move require `X-Requested-With` is untested; the tests always send it.
- Checkout and orders are out of scope.

## Per-failure details

No failures. All 6 tests passed on the single run and on the `--repeat-each=2` run. Known issues were verified separately by the curl replays in section 3, whose responses match the pinned expectations in the tests.
