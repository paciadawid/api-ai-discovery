# Search area summary

Endpoints (see endpoints.json): `GET /search` (q, c, p, r, d, a, o, s, i, v), `POST /search` (q, unused by UI), `POST /instantsearch` (q, HTML fragment, max 10 hits, min 2 chars client side), `GET /search/` 301.
Details and curl repros: flows.md. Risks, unknowns: notes.md.

Top risks for tests: 502 on `s=-1` / `r=9` / `r=-1`; facet links break on `&` and `#` in q; page size and view mode persist per session so isolate request contexts; the dataset (38 hits for `er`, 2 for `watch`, none for `bear`) can change.
