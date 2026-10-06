# QA run report - Wave 1 (10 tests), Bearstore / SmartStore API

Run date: 2026-10-02. Target: https://bearstore-testsite.smartbear.com. Command: `npm test` (Playwright Test, `request` fixture only, workers: 2, retries: 0, projects gate -> cart, and api).

## 1. Verdict

16/16 tests pass in the full suite and again in one repeat run (10 Wave 1 tests plus 6 pre-existing UC-CARTWS workshop tests that live in the same `tests/` folder). 0 failures, 0 flaky, 0 test fixes needed, 0 application bugs caught by an automated assertion this wave (the test.fail() defect tests were deliberately dropped). OQ-01 is CONFIRMED: cookieless requests with an identical User-Agent share one visitor.

## 2. Results by area

| Area | Use cases selected (Wave 1, Gate 2) | Automated | Passing | Failing | UC IDs |
|---|---|---|---|---|---|
| cart | 2 | 2 | 2 | 0 | UC-CART-96 (gate), UC-CART-01 |
| auth | 3 | 3 | 3 | 0 | UC-AUTH-22, UC-AUTH-02, UC-AUTH-07 |
| catalog | 2 | 2 | 2 | 0 | UC-CATALOG-01, UC-CATALOG-03 |
| search | 2 | 2 | 2 | 0 | UC-SEARCH-01, UC-SEARCH-32 |
| content | 1 | 1 | 1 | 0 | UC-CONTENT-16 |
| **Wave 1 total** | **10** | **10** | **10** | **0** | |
| cart workshop (outside Wave 1, see 6) | n/a | 6 | 6 | 0 | UC-CARTWS-01, 02, 04, 08, 10, 11 |

Run 1 (test_run, full suite): 16 passed, 39.9 s. Run 2 (repeat with JSON reporter, same config): 16 passed, 40.2 s, `flaky: 0`, `unexpected: 0`. Gate order held: UC-CART-96 ran and passed before UC-CART-01. Per-test timings were stable between runs (slowest: UC-CART-96 about 13 s because it creates four visitors; UC-CARTWS-11 about 8 s).

### OQ-01 annotation (from the JSON report of run 2)

```
UC-CART-96  annotation  type=OQ-01
CONFIRMED: cookieless contexts with an identical User-Agent share one visitor (CartItemsCount=1 in B). Unique User-Agent per test is mandatory.
```

The same test also asserts the part that the cart suite depends on: with different User-Agents, visitor B sees `CartItemsCount` 0 after visitor A added a product. That held in both runs. Consequence: every test must use a unique User-Agent (already done in `tests/support/client.ts`); two parallel cookieless clients with the same User-Agent and IP would corrupt each other's carts. This also matches the earlier "cart loss seen twice, not reproduced" note in SUMMARY.md.

## 3. Application bugs found

None caught by this wave's automated tests (all passing, no assertion contradicts a UC Expected section). The known, not asserted issues from discovery are listed under section 7 with one replay each.

## 4. Test fixes made

None. No test or support file was edited in this stage.

## 5. Flaky or unresolved

None. 0 flaky in two consecutive full runs. No 429, timeout or 5xx was seen in the automated tests. Residual risks: the data-dependent checks (catalog tiles, search hits) assert invariants rather than counts, so catalog changes by other users should not break them; the host is shared, so a future failure in UC-CART-96 part 2 would point at the host or an IP-level change, not at the test.

## 6. Coverage check (`qa/04-coverage.md`)

All 10 rows match reality: every UC ID, test file and exact test title (including the `@needs-account` suffix on UC-AUTH-02 and UC-AUTH-07) exists in `tests/`, and every row says `passing`, which both runs confirm. Observations, not edited because this stage may only edit `tests/`:

- The suite also contains 6 tests in `tests/cartws.api.spec.ts` (UC-CARTWS-01, 02, 04, 08, 10, 11) from the earlier workshop cycle (`qa/workshop/cartws/`). They are not in `qa/04-coverage.md` (they are tracked in `qa/workshop/cartws/04-coverage.md`) and run in the `api` project, so `npm test` is 16 tests, not 10.
- UC-CARTWS-08 and UC-CARTWS-11 pin current buggy behaviour (HTTP 500 on update to quantity 0 or negative, HTTP 500 on update of a foreign line id) as passing assertions. They will go red if the host fixes those defects; that is intended, but it differs from the Gate 2 decision to keep only "tests that pass today" as plain passing tests with no defect pinning. Decide whether they stay in the default `npm test`.

## 7. Known, not covered by an automated test this wave

Each repro was replayed exactly once in this stage (`B=https://bearstore-testsite.smartbear.com`). Observed results from 2026-10-02. SUMMARY.md section 4 numbers in brackets.

| # | Severity guess | Issue | Repro | Expected | Observed (this stage) |
|---|---|---|---|---|---|
| 2 | Medium | Search page size -1 gives a gateway error | `curl -i "$B/search?q=er&s=-1"` | 4xx or default page size | HTTP 502 |
| 4 | Medium | Reviews page with non-numeric id gives a gateway error | `curl -i $B/product/reviews/abc` | 404 or 400 | HTTP 502 |
| 5 | Medium | Category page size 0 crashes | `curl -i "$B/sports?s=0"` | 200 with default paging | HTTP 500 |
| 7 | Medium | Price update for unknown product returns 500 and leaks an exception message | `curl -i -X POST -d x=1 "$B/product/updateproductdetails?productId=99999&bundleItemId=0"` | 4xx without internals | HTTP 500, body contains "Object reference not set to an instance of an object." |
| 9 | Medium | Register without anti-forgery token returns 500 | `curl -i -X POST -d "Email=a@example.com" $B/register` | 400 or 403 | HTTP 500 |
| 13 | Medium (security hygiene) | Version-disclosure headers | `curl -sI $B/` | no `Server` version, `X-AspNet*`, `X-Powered-By` | `server: Microsoft-IIS/10.0`, `x-aspnetmvc-version: 5.2`, `x-aspnet-version: 4.0.30319`, `x-powered-by: ASP.NET` |
| 14 | Medium (security) | Account enumeration via password recovery | `curl -s -d "Email=nobody-qa-probe@example.com&send-email=Submit" $B/customer/passwordrecovery` | uniform message | body contains "Email not found." |
| 16 | Low | Back-in-stock page answers anonymously while siblings redirect to login | `curl -i $B/customer/backinstocksubscriptions` | 302 to login | HTTP 200 |
| 19 | Low | 301 redirect downgrades to http | `curl -i $B/BOOKS` | `Location: https://...` | HTTP 301, `location: http://bearstore-testsite.smartbear.com/books` |
| 20 | Low | `/blog` is linked in header and footer but missing | `curl -i $B/blog` | 200 | HTTP 404 |

All of the above reproduced as described in discovery. Not replayed here (state-changing, mail-sending, need a session, or already pinned by the UC-CARTWS tests): #1 newsletter 502 (sends mail flow), #3 and #6 cart update/delete errors (pinned by UC-CARTWS-08 and 11), #8 contact form `<` 500, #10 wishlist guid exposes visitor cookie (session takeover, High, needs a cart), #11 AUTH cookie not invalidated at logout, #12 AUTH cookie lacks Secure, #15 no CSRF, #17 to #18, #21 to #27.

## 8. Coverage gaps

- Not implemented from the original Wave 1 selection of 56: 46 use cases (the 10 above are done). They include the dropped 22 `test.fail()` known-issue/defect tests (for example UC-AUTH-21, UC-AUTH-48, UC-AUTH-49, UC-AUTH-50, UC-CATALOG-12, UC-CATALOG-23, UC-CATALOG-36, UC-CATALOG-41, UC-SEARCH-27, UC-SEARCH-28, UC-CART-33, UC-CART-39, UC-CART-43, UC-CART-79, UC-CART-80, UC-CONTENT-14, UC-CONTENT-15, UC-CONTENT-26, UC-CONTENT-33) and the plain happy/negative paths: UC-AUTH-01, 13, 18, 23, 25, 34, 51; UC-CATALOG-21, 24, 34; UC-SEARCH-03, 09; UC-CART-02, 27, 30, 40, 46, 66, 69, 70, 74; UC-CONTENT-01, 02, 22. The full ranked list is in `qa/03-selected.md`.
- Wave 2: 31 optional use cases, not started.
- Deferred: 177 of 264 use cases (264 - 56 - 31).
- Thin areas after this wave (1 to 3 tests each): content 1 of 8 planned; search 2 of 37 (no filter, sort, paging, instant search); catalog 2 of 9 (no product page, 404, variant or canonical checks); auth 3 of 15 (no registration, logout, cookie flag or cross-customer checks); cart 2 of 18 (no update, delete, checkout entry, wishlist or compare in Wave 1; workshop UC-CARTWS tests add guest add/update/remove coverage).
- Out of scope by decision: order placement, change-password success, coupon and gift-card success, mail flows (contact and newsletter valid submissions), account registration per run, quantity 10000 cases, repeated 5xx probing.
- Security tests (session takeover via share link, logout invalidation, cookie flags, security headers, CSRF) have no automated coverage this wave.

## 9. Per-failure details

No failures in either run, so there is nothing to classify. No curl replays were needed for test debugging; curl was used only for the section 7 replays.
