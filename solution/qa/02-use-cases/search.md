# AREA: SEARCH (part of qa/02-use-cases.md; conventions, field dictionary and matrix are in that file)

Meta line format: `Area | Type | Side-effect | Tags`. All search UCs are anonymous and read-only (only `s` and `v` write per-visitor session state). Terms: `WATCH` = `watch` (few hits), `ER` = `er` (many hits, several pages at `s=12`). Assert invariants, not counts: discovery saw 2 and 38 hits, the data may change. Hit tiles = `article.art[data-id]` in the result list; hit count text in `.search-hitcount` has the form `a-b of N`.

### UC-SEARCH-01: Search returns hits for a known term
- Meta: search | happy path | Side-effect: no | @smoke
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=watch`
- Expected: 200 `text/html`; `<title>` `Shop. Search result for "watch"`; `.search-hitcount` matches `/^\d+-\d+ of \d+$/` with N at least 1; at least one hit tile whose link is a product slug; `Set-Cookie: SMARTSTORE.VISITOR`.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02.

### UC-SEARCH-02: Search is case-insensitive
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=watch`, `GET /search?q=WATCH`.
- Expected: 200 both; identical hit id sequences.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02.

### UC-SEARCH-03: Missing or blank query shows the minimum-length message
- Meta: search | validation/negative | Side-effect: no | @smoke
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search`, `GET /search?q=`, `GET /search?q=%20%20`.
- Expected: 200 each; `<title>` `Shop. Search`; text `The minimum length for the search term is 2 characters.`; no hit tiles.
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE failure.

### UC-SEARCH-04: One-character query is below the minimum
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=a`
- Expected: 200; `The minimum length for the search term is 2 characters.`; no hit tiles.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02.

### UC-SEARCH-05: Two-character query is accepted (lower boundary)
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er`
- Expected: 200; the minimum-length message is absent; `.search-hitcount` present with N at least 1.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02 (`er` -> 38).

### UC-SEARCH-06: Query without matches reports no results
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=zzzz<runId-letters>` (a string of letters no product contains).
- Expected: 200; `div.alert-warning` text `Your search did not match any products.`; no hit tiles; the minimum-length message is absent.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02.

### UC-SEARCH-07: POST /search returns the same hits as GET
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE-POST, EP-SEARCH-PAGE
- Request: `POST /search` urlencoded `q=watch` (no token); `GET /search?q=watch`.
- Expected: 200 both; identical hit id sequences.
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE-POST.

### UC-SEARCH-08: POST /search with empty query shows the minimum-length message
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE-POST
- Request: `POST /search` urlencoded `q=`.
- Expected: 200; `The minimum length for the search term is 2 characters.`
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE-POST failure.

### UC-SEARCH-09: Instant search returns an HTML fragment of hits
- Meta: search | happy path | Side-effect: no | @smoke
- Endpoints: EP-SEARCH-INSTANT
- Request: `POST /instantsearch` urlencoded `q=watch`, AJAX, `Accept: text/html, */*`.
- Expected: 200 `text/html`; fragment (no `<html>`); contains `h6.instasearch-group-header` and at least one `a.instasearch-hit` whose `href` is a product slug; match highlight `span.instasearch-match`.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-01.

### UC-SEARCH-10: Instant search returns at most 10 hits
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-INSTANT, EP-SEARCH-PAGE
- Request: `POST /instantsearch` `q=er`; `GET /search?q=er` for the full count.
- Expected: instant hits between 1 and 10; if the full count N is greater than 10 then instant hits equal exactly 10; the instant hit hrefs are a subset of the full result links.
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-INSTANT.

### UC-SEARCH-11: Instant search without matches has no hit element
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-INSTANT
- Request: `POST /instantsearch` `q=zzzz<letters>`.
- Expected: 200; body contains no `instasearch-hit` (body is empty or whitespace only; do not assert the length).
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-01; SUMMARY.md test-design hazards.

### UC-SEARCH-12: Instant search with one character or an empty query has no hits
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-INSTANT
- Request: `POST /instantsearch` with `q=w`, `q=` and `q=%20`.
- Expected: 200 each; no `instasearch-hit`.
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-INSTANT failure.

### UC-SEARCH-13: Instant search is POST only
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-INSTANT
- Request: `GET /instantsearch?q=watch`.
- Expected: 404.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-01.

### UC-SEARCH-14: An instant hit link opens its product page
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-INSTANT, EP-CATALOG-PRODUCT
- Request: `POST /instantsearch` `q=watch`; `GET` the first `a.instasearch-hit` href.
- Expected: 200 product page with `h1.pd-name` non-empty.
- State/cleanup: none (adds a recently-viewed cookie to the disposed context).
- Evidence: flows.md FLOW-SEARCH-01.

### UC-SEARCH-15: Name sort orders results
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&o=5` and `?q=er&o=6`.
- Expected: 200; names of the hit tiles are sorted ascending for `o=5` and descending for `o=6` (case-insensitive); same set of ids in both.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-03.

### UC-SEARCH-16: Price sort orders results
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&o=10` and `?q=er&o=11`, fresh context (USD).
- Expected: 200; parsed first prices are non-decreasing for `o=10` and non-increasing for `o=11`.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-03.

### UC-SEARCH-17: Paging splits results without overlap
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&s=12&i=1` and `?q=er&s=12&i=2`.
- Expected: 200; page 1 has at most 12 hits; hit-count text for page 2 starts at `13-`; the two id sets are disjoint; N is the same in both texts.
- State/cleanup: `s` persists server side for the visitor; dispose the context.
- Evidence: flows.md FLOW-SEARCH-03.

### UC-SEARCH-18: Page index out of range is clamped
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&s=12&i=999`, `&i=0`, `&i=-1`, `&i=abc`.
- Expected: 200 each; `i=999` shows the last page (hit-count `a-N of N`); the other three show page 1.
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE (i).

### UC-SEARCH-19: Page size boundaries
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&s=5`; `?q=er&s=1000`; `?q=er&s=abc` (each in a fresh context).
- Expected: 200 each; `s=5` shows at most 5 hits; `s=1000` and `s=abc` show all N hits on one page. (`s=0` and `s=-1` are covered by UC-SEARCH-27.)
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE (s).

### UC-SEARCH-20: Page size is remembered per visitor
- Meta: search | state/persistence | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: one context: `GET /search?q=er&s=12`; `GET /search?q=er`. Then a fresh context `GET /search?q=er`.
- Expected: first two show at most 12 hits each and hit-count `1-12 of N` (N greater than 12); the fresh context shows up to 24. Session cookie `ASP.NET_SessionId` is set after the first request.
- State/cleanup: dispose context; optional reset `s=24`.
- Evidence: flows.md FLOW-SEARCH-03.

### UC-SEARCH-21: View mode is remembered per visitor
- Meta: search | state/persistence | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: one context: `GET /search?q=er&v=list`; `GET /search?q=er`; `GET /search?q=er&v=grid`; `GET /search?q=er`.
- Expected: responses 1 and 2 contain `artlist-lines`; 3 and 4 do not.
- State/cleanup: ends in grid.
- Evidence: flows.md FLOW-SEARCH-03.

### UC-SEARCH-22: Price facet bounds the results
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&p=%7e100` and `GET /search?q=er&p=10~100`, fresh context (USD).
- Expected: 200; all parsed prices are at most 100 (and at least 10 for the second); ids are a subset of the unfiltered `q=er` ids.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-04.

### UC-SEARCH-23: Category facet filters results
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er`; read category ids from facet links `data-href` containing `c=`; pick two ids C1, C2; `GET /search?q=er&c=C1`, `&c=C1&c=C2`.
- Expected: 200; ids for C1 are a subset of unfiltered; ids for C1+C2 are a superset of the ids for C1 alone (union semantics). Category ids are read at run time (OQ-31), not hard-coded.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-04.

### UC-SEARCH-24: Unknown category id yields no hits
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&c=999999`.
- Expected: 200; `Your search did not match any products.`
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE (c).

### UC-SEARCH-25: Rating and delivery facets narrow results
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&r=1`, `&r=4`, `&d=99`.
- Expected: 200; N(`r=4`) is at most N(`r=1`); both are subsets of unfiltered; `d=99` shows `Your search did not match any products.`
- State/cleanup: none.
- Evidence: endpoints.json EP-SEARCH-PAGE (r, d).

### UC-SEARCH-26: Combined query, filter, sort and paging parameters work together
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=er&p=%7e500&o=10&s=12&r=1` (add `&c=<id>` using a category id read from the facet links).
- Expected: 200; hit count N at most the unfiltered N; prices at most 500 and non-decreasing; at most 12 hit tiles.
- State/cleanup: `s` persists; dispose context.
- Evidence: flows.md FLOW-SEARCH-04.

### UC-SEARCH-27: Page size -1 returns a client error, not 502
- Meta: search | defect | Side-effect: no | @defect (defect #2)
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=er&s=-1`.
- Expected (correct): 4xx, or a default-size 200 like `s=abc` (human to choose). Never 5xx. Observed: 502 Bad Gateway. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #2; flows.md FLOW-SEARCH-05.

### UC-SEARCH-28: Rating filter 9 returns a client error, not 502
- Meta: search | defect | Side-effect: no | @defect (defect #2)
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=er&r=9`.
- Expected (correct): 4xx or a 200 that ignores the value. Never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #2.

### UC-SEARCH-29: Rating filter -1 returns a client error, not 502
- Meta: search | defect | Side-effect: no | @defect (defect #2)
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=er&r=-1`.
- Expected (correct): 4xx or a 200 that ignores the value. Never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #2.

### UC-SEARCH-30: Search path variants redirect to the canonical path
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-TRAILING-SLASH
- Request: `GET /search/?q=watch` and `GET /Search?q=watch`, `maxRedirects: 0`.
- Expected: 301; `Location` path is `/search` and the query `q=watch` is preserved.
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-05; endpoints.json EP-SEARCH-TRAILING-SLASH.

### UC-SEARCH-31: Canonical search redirect keeps https
- Meta: search | security | Side-effect: no | @security @known-issue (finding #19)
- Endpoints: EP-SEARCH-TRAILING-SLASH
- Request: single `GET /search/?q=watch`, `maxRedirects: 0`.
- Expected (secure): `Location` begins `https://`. Observed: `http://`. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #19.

### UC-SEARCH-32: Query text is HTML-encoded in the result page
- Meta: search | security | Side-effect: no | @security
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=<script>alert(1)</script>` (URL-encoded).
- Expected: 200; the response does not contain the raw string `<script>alert(1)</script>`; the title, the `input[name=q]` value and `.search-term` contain the encoded form (`&lt;script&gt;`).
- State/cleanup: none. One probe only; no fuzzing.
- Evidence: flows.md FLOW-SEARCH-05 (reflection).

### UC-SEARCH-33: Facet links keep the query URL-encoded
- Meta: search | defect | Side-effect: no | @defect (finding #25)
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=a%26b%23c`.
- Expected (correct): 200; every facet `data-href` that carries the query contains `q=a%26b%23c` (URL-encoded), so following it yields the same query. Observed: HTML-encoded but not URL-encoded (`&` and `#` break the link). `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #25.

### UC-SEARCH-34: Trailing space in the query does not change results
- Meta: search | defect | Side-effect: no | @defect (finding #25)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=watch` and `GET /search?q=watch%20`.
- Expected (correct): identical hit id sequences. Observed: 2 hits versus 1. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #25; flows.md FLOW-SEARCH-02.

### UC-SEARCH-35: Diacritics are significant and the umlaut form finds the product
- Meta: search | happy path | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: `GET /search?q=%C3%BCberman`.
- Expected: 200; at least one hit; the hit link is a product slug containing `berman`. Precondition: the novel product (id 24) is still in the catalog; skip with a message if the hit count is 0. `q=uberman` is not asserted (matches nothing today; semantics unknown, OQ-34).
- State/cleanup: none.
- Evidence: flows.md FLOW-SEARCH-02.

### UC-SEARCH-36: Overlong query URL is rejected
- Meta: search | validation/negative | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE
- Request: single `GET /search?q=` plus 20000 `a` characters.
- Expected: 414 (URI Too Long); not 200 and not 5xx. The 414 page comes from another layer, so assert status only.
- State/cleanup: none. One request, no load.
- Evidence: endpoints.json EP-SEARCH-PAGE failure.

### UC-SEARCH-37: Search needs no login and no anti-forgery token
- Meta: search | auth/access | Side-effect: no | (none)
- Endpoints: EP-SEARCH-PAGE, EP-SEARCH-PAGE-POST, EP-SEARCH-INSTANT
- Request: anonymous `GET /search?q=watch`, `POST /search` `q=watch`, `POST /instantsearch` `q=watch`, all with `maxRedirects: 0` and no token.
- Expected: each 200; none redirects to `/login`.
- State/cleanup: none.
- Evidence: auth.md CSRF table.
