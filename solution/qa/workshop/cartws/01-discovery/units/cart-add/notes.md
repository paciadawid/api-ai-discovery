# Notes - cart-add

## Browser evidence
`playwright-cli list` right after open:
```
- qa-cartws-cart-add:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```

## Auth
No login. Cart works anonymously via SMARTSTORE.VISITOR cookie (HttpOnly, secure, 1 year, re-set on every response); ASP.NET_SessionId appears on the first offcanvas call.

## Surprises
- Add errors are HTTP 200 with JSON (`success:false` + message array, or `{"redirect":"/"}` for unknown product id). Only non-numeric/0 ids and wrong HTTP verbs give 404.
- Bodyless POST without Content-Length gives IIS 411; use `-d ""`.
- cartType 99 returns success:true but does not change the cart.
- GET on addproduct and cartsummary is 404, but GET on offcanvasshoppingcart works.
- CartItemsCount is the sum of quantities.
- The browser cart was NOT isolated: my browser added 1 item, yet the counters showed cart 3 / wishlist 2 on reload. The three parallel browsers have the same IP and UA, and the first cookieless request seems to have attached to a shared guest visitor, or the other units' actions leaked in. My curl jar cart (unique UA) behaved deterministically. Browser-side counts are therefore unreliable; use curl jars for assertions.
- The offcanvas success alert ('has been successfully added') appeared in the browser right after add but not in the curl replay (possibly one-shot server state or only shown with the add flag); open question.

## Open questions
- What cartType values besides 1 are valid (wishlist 2 seen in offcanvas wishlist tab URL /shoppingcart/offcanvaswishlist; not explored by design)?
- Product attributes, stock or max-quantity limits not explored (no products with required attributes tried).
- Is the quantity upper bound enforced (data-max 10000 on the input)?

## State changed
- Curl jar cart (/tmp/qa-cart-add.jar, visitor b8871c56-...): 7 units of product 1 on one line. Not removed (removal belongs to cart-remove unit; anonymous throwaway cart).
- Browser session cart: 1 x product 1 (shared/confusing, see above). Not removed.
