---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
  - "playwright.config.ts"
---

# Framework architecture (layers)

Dependencies point down only. `npm run lint:framework` enforces the checkable parts.

```
tests/<area>/*.api.spec.ts      behaviours, nothing else
        |
src/fixtures   (test, expect)   creates actors, owns setup + teardown (fixture teardown = "afterEach")
src/matchers   (expect.extend)  domain assertions: toBeAccepted, toContainLine ...
src/actors     (Shopper)        business language: Given / When / Then, each wrapped in test.step
        |
src/api        (CartApi ...)    one method per endpoint, returns Reply<T>, no assertions, no business wording
src/domain     (parsers, money, products, messages)  pure TypeScript, no I/O, no Playwright
src/config     (env.ts)         the ONLY place that reads process.env or .env
```

- **api/** knows URLs, headers, form fields and the SmartStore quirks (AJAX header, `data: ''` on body-less POST). It never asserts.
- **domain/** turns HTML/JSON into typed objects (`parseCart`, `parseProductPage`), holds product catalogue constants and server message strings. Unit-testable without a network.
- **actors/** compose api calls into intent (`hasInCart`, `removes`, `movesToWishlist`). Setup (`Given`) steps live here, not in specs. An actor method returns the raw `Reply` for actions and typed domain objects for questions.
- **matchers/** hold every reusable assertion. A check repeated in two specs becomes a matcher.
- **fixtures/** are the only place that creates contexts and disposes them. Cleanup (`emptiesEverything`) runs in the fixture's `finally`, so it happens even when the test fails.
- Specs import `{ test, expect } from '@/fixtures'`, domain constants from `@/domain/*`, never `@playwright/test`, `src/api` or `src/actors` directly.
- Use the `@/` alias for `src/`. No relative `../../src` imports from specs.
- Do not add a layer or abstraction that nothing uses yet.
