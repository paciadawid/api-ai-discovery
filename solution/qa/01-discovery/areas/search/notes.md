# Search area notes

## Browser evidence
`npx playwright-cli list` during discovery (session `qa-search`, opened with `open https://bearstore-testsite.smartbear.com --headed`):
```
- qa-search:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```

## Auth observations
- Everything here is anonymous. No login, no antiforgery token on `POST /instantsearch` or `POST /search`.
- Cookies: `SMARTSTORE.VISITOR` on every response (also on 200 empty replies); `ASP.NET_SessionId` appears when `s` (page size) or `v` (view mode) is sent.
- Headers leak `Server: Microsoft-IIS/10.0`, `X-AspNetMvc-Version: 5.2`, `X-AspNet-Version`, `X-Powered-By` on app responses (the 502 and 414 pages come from a different layer, without these headers).

## Surprises and likely defects
1. `GET /search?q=er&s=-1`, `&r=9`, `&r=-1` return `502 Bad Gateway` (unhandled server error surfaced by the proxy) instead of a validation response. `s=0` returns the "did not match" message instead of default paging.
2. Facet `data-href` embeds `q` HTML-encoded but not URL-encoded. For `q=a&b#c` the facet link is `/search?q=a&b#c&a=True`, so following it loses the term. Characters `&`, `#` break facet navigation.
3. Trailing space in `q` changes results (`watch ` -> 1 hit, `watch` -> 2) because the query is not trimmed, yet whitespace-only is treated as too short.
4. `q` given twice is comma-joined (`watch,book`) and returns nothing.
5. `/search/` and `/Search` redirect with 301 to an `http://` URL (scheme downgrade; behind a TLS-terminating proxy).
6. `POST /search` is accepted with `q` in the body (not used by the UI).
7. Instant search returns different empty shapes: 0 bytes (q empty/1 char/whitespace/JSON body, no content-type), 3 bytes whitespace (valid query, no hit), and the `/search` page for the same term gives a message. A test must not assert on a body for "no hits" beyond "no `instasearch-hit`".
8. Instant search is limited to 10 hits, no "show all" link in the fragment; `/search` shows the full set.
9. Page size and view mode persist per visitor session (server side); sort and page index do not. Tests must isolate state by using a fresh request context or an explicit `s=`/`v=`.
10. `q` reflection is properly HTML-encoded in title, input value, heading and facet hrefs (probed with two payloads only, no tooling).
11. Sort `o=15` (Newest) gives the same order as relevance for `q=er`; cannot prove it is a distinct ordering on this dataset.

## Open questions
- What the search matches against beyond name and short description (full description, SKU, manufacturer, tags)? `bear` matches nothing, `watch` matched the Tissot product through its description. Not systematically tested.
- Category id to name mapping (c=3,4,5,7,...); available from the facet markup of a result page but not captured; `/search?q=er&c=12` returned "High School Game Basketball", which suggests Basketball.
- Meaning of `a=True` (availability): no difference observed vs. unfiltered, because all `er` hits are likely available. Needs an out-of-stock product to prove.
- Rating filter semantics: `r=5` returned 1 hit although the UI offers only 1..4; whether unrated products count for `r<=3` is unknown (r=0..3 all gave 37 of 38).
- Price filter currency: `p` is presumably in the active currency (changecurrency links exist); not tested because currency switching writes visitor state (owned by catalog).
- Whether the query is case-folded only for ASCII (`Q=watch` works for the parameter name; value case-insensitive for `WATCH`, `%C3%9Cberman` and `%C3%BCberman` both hit).
- Rate limiting on `/instantsearch`: not tested (out of scope, shared host).
- `p` format with invalid ranges: `p=-5~10` returned 1 hit; `p=100~10` same as `10~100`; meaning of negative lower bound unproven.

## State changed
None on the server. Only the anonymous visitor cookie/session received by the replays (`SMARTSTORE.VISITOR`, `ASP.NET_SessionId`), discarded with the jars `/tmp/qa-search.jar`, `/tmp/qa-search-v.jar`, `/tmp/qa-search-w.jar`. Browser session closed at the end.

## Verification summary
All four endpoints replayed with curl and matched the browser observation (instant search POST, GET /search with every param, POST /search, trailing slash redirect). The browser itself only exercised: instant POST, GET /search with q, o, i, s, p.
