# Search flows (anonymous, read-only)

Base: `https://bearstore-testsite.smartbear.com`. Browser session `qa-search` (headed). Cookie jar for replays: `/tmp/qa-search.jar`.

## FLOW-SEARCH-01 Instant search (header box)
Browser: opened `/`, clicked the box "What are you looking for?", typed `bear`, then `w`, `a`, `t`.
Observed: the form is `<form action="/search" method="get">` with `<input name="q" data-instasearch data-minlength="2" data-url="/instantsearch" data-origin="Search/Search">`.
- 1 character typed: no request. From 2 characters: one `POST /instantsearch` per keystroke, body `q=<text>` (urlencoded), headers `X-Requested-With: XMLHttpRequest`, `Accept: text/html, */*`.
- Response is an HTML fragment (not JSON), max 10 hits, rendered into `.instasearch-drop`.
- `bear` -> 200, 3 bytes of whitespace (no hits). `wat` -> 3 hits (`watch` -> 2).
Endpoint: EP-SEARCH-INSTANT.
Replay:
```
curl -i -c /tmp/qa-search.jar -b /tmp/qa-search.jar -X POST --data-urlencode "q=watch" https://bearstore-testsite.smartbear.com/instantsearch
# expect 200 text/html, 1837 bytes, hrefs /tissot-t-touch-expert-solar and /watch-series-2, <span class='instasearch-match'>Watch</span>
curl -i -X POST -d "q=w" https://bearstore-testsite.smartbear.com/instantsearch      # 200, content-length 0
curl -i -X POST -d "q=zzzz" https://bearstore-testsite.smartbear.com/instantsearch   # 200, 3 bytes
curl -i https://bearstore-testsite.smartbear.com/instantsearch?q=watch               # 404 (GET not routed)
curl -i -X POST https://bearstore-testsite.smartbear.com/instantsearch               # 411 Length Required
```

## FLOW-SEARCH-02 Full search (Enter / magnifier)
Browser: filled the box with `table`, pressed Enter -> navigation `GET /search?q=table` (title `Shop. Search result for "table"`, "1-5 of 5").
Then `GET /search?q=watch`, `?q=a`.
Endpoint: EP-SEARCH-PAGE. Page fires only a `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True` (header counters, belongs to cart area) in addition.
Replay:
```
curl -i -c /tmp/qa-search.jar -b /tmp/qa-search.jar "https://bearstore-testsite.smartbear.com/search?q=watch"
# 200, search-hitcount "1-2 of 2", articles data-id 2 and 19
curl -s "https://bearstore-testsite.smartbear.com/search?q=a"      # 200, "The minimum length for the search term is 2 characters."
curl -s "https://bearstore-testsite.smartbear.com/search?q=zzzz"   # 200, "Your search did not match any products."
```
Matching semantics observed: case-insensitive substring match on product name and short description (`ab` matches "Table", "Basketball", "GameStation"; `er` -> 38), whole input treated as a phrase (`watch series` hits Watch Series 2, `series watch` misses), diacritics are significant (`uberman` misses, `%C3%BCberman` and `%C3%9Cberman` hit "Uberman: The novel" with U-umlaut), wildcard `*` is literal (`wat*` misses), trailing space is NOT trimmed (`watch%20` -> 1 hit, `watch` -> 2), `+` in a query string is a space (`watch+series` hits) but `%2B` is a literal plus (misses). `bear` finds nothing (no such product).

## FLOW-SEARCH-03 Sorting, paging, page size, view mode (all full-page GETs)
Browser: on `/search?q=table` selected "Price: High to Low" -> `GET /search?q=table&o=11`. On `/search?q=er` selected "Page 2 of 2" -> `/search?q=er&i=2`; selected "12 per Page" -> `/search?q=er&s=12`. Each is a full navigation, no XHR.
Replay:
```
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&i=2"          # "25-38 of 38", 14 articles
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&s=12&i=4"     # "37-38 of 38"
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&o=10"         # first: Supreme Golfball (cheapest)
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&o=5"          # first: 2-seater Cubus (A-Z)
```
Sort ids: 1 Relevance, 5 Name A-Z, 6 Name Z-A, 10 Price asc, 11 Price desc, 15 Newest (for q=er identical to relevance order).
Persistence: `s` (page size) and `v` (view mode) are remembered server-side for the visitor (ASP.NET_SessionId cookie appears once either is sent): `?q=er&s=12` then `?q=er` with the same jar still shows "1-12 of 38". `v=list` then no v keeps `artlist-lines` until `v=grid`. Sort `o` and page `i` are not remembered. With a fresh jar defaults return (24 per page, grid). Tests must use a fresh request context per test.

## FLOW-SEARCH-04 Facet filters
Browser: on `/search?q=er&s=12` clicked radio label "up to $100.00" -> `GET /search?q=er&s=12&p=%7e100` ("1-12 of 17"). Facet links on the page (data-href): category `c=<id>`, price `p=~10|~25|~50|~100|~250|~500|~1000`, rating `r=1..4`, delivery `d=1..3`, availability `a=True`. Existing filters are preserved as the query grows.
Category ids seen for q=watch: 3,4,5,7,8,10,11,12,13,14,15,16,22,23,24 (names: Basketball, Books, Chairs, Cook and enjoy, Furniture, Gaming, Gaming Accessories, Gift Cards, Golf, Soccer, Sofas, SPIEGEL-Bestseller, Sports, Tables, Watches; id to name mapping not captured, only that `c=12` with q=er gives "High School Game Basketball", `c=12&c=4` gives 5 hits).
Replay:
```
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&p=%7e100"        # 1-17 of 17
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&p=10~100"        # 1-16 of 16 (literal ~ works)
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&c=12"            # 1-1 of 1
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&d=1"             # 1-11 of 11
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&r=4"             # 1-30 of 30
curl -s "https://bearstore-testsite.smartbear.com/search?q=er&c=12&p=%7e500&o=10&s=12&d=3&r=1"   # combined, 1-1 of 1
```

## FLOW-SEARCH-05 Invalid and edge input
```
curl -i "https://bearstore-testsite.smartbear.com/search?q=er&s=-1"     # 502 Bad Gateway (122-byte html, no ASP.NET headers)
curl -i "https://bearstore-testsite.smartbear.com/search?q=er&r=9"      # 502
curl -i "https://bearstore-testsite.smartbear.com/search?q=er&r=-1"     # 502
curl -i "https://bearstore-testsite.smartbear.com/search?q=er&s=0"      # 200 "did not match"
curl -i "https://bearstore-testsite.smartbear.com/search?q=er&i=999"    # 200, last page
curl -i "https://bearstore-testsite.smartbear.com/search/?q=watch"      # 301 -> http://.../search?q=watch
curl -i -X POST -d "q=watch" https://bearstore-testsite.smartbear.com/search   # 200, same HTML as GET
```
Reflection (no attack tooling, 2 probes only): `q=<script>alert(1)</script>"'` is HTML-encoded in the title, the input `value=`, `<small class=search-term>` and facet `data-href` (`&lt;script&gt;...&quot;&#39;`). No raw reflection found. Facet `data-href` embeds the q HTML-encoded but not URL-encoded (see notes).
