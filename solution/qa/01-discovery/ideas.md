# Ideas from Map it (input to design, never oracles)

- Flow worth keeping: add (`/cart/addproduct/{id}/1`, capture nothing) -> `GET /cart` (parse the line id) -> `updatecartitem` (use that id) -> `deletecartitem` (same id) -> `cartsummary?cart=True` (counter).
- Keep: totals computed from INPUT (unit price x quantity), line removed after delete (read `GET /cart` after), counter read after each change (rules 3 and 5).
- Keep: add-twice merges into one line; 10000 per-line limit is cumulative; gift card required fields; quantity 0 deletes the line (pin as `@known-issue`, status 500).
- Rejected: the generated "body contains expected signal" checks (14 of 32 red): they compare the body with a prose description of it, not with a fact (rule 3).
- Rejected: the generated "sets cookie ...(...)" checks (11): the expected text is a note, not a cookie value; and cookie values must never be asserted or logged.
- Rejected: status-only checks (e.g. "status is 200"): business failures are HTTP 200 + `success:false`, so status alone proves nothing (rule 1). EP-CART-UPDATE-ITEM got 500 only because `sciItemId` is an unset placeholder.
- Missing from the raw export: path ids (`sciItemId`, `cartItemId`) are placeholders; a real flow must capture them from `GET /cart` (no JSON carries them).
- Missing from the raw export: a unique User-Agent per run (the host keys a guest cart by IP + User-Agent); the collection runs on the default one.
- Not in the collection, needed in tests: failure paths (200 + `success:false`, 502 for malformed numbers), the counters mismatch (lines vs quantities), cross-check of `SubTotal` against `GET /cart`.
- Postbot step skipped (no Postman account).
