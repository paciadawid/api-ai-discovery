# Open questions - cart area

Format: question - area/unit - who or what could answer it.

## Add (cart-add)
1. Which cartType values besides 1 are valid? Value 99 returned success:true but did not change the cart; wishlist is probably 2 (offcanvas wishlist tab uses /shoppingcart/offcanvaswishlist) but was not explored. - cart / cart-add - probe with a unique-UA curl jar; app owner.
2. Do products with required attributes or other stock limits behave differently on add? Not tried. - cart / cart-add - probe other products.
3. Why did the offcanvas success alert ('has been successfully added') appear in the browser right after add but not in the curl replay? Possibly one-shot server state. - cart / cart-add - repeat in the browser with network capture.
4. Is `addtocart_{id}.AddToCart.EnteredQuantity` (used by cart-remove) ignored, or does it bind? Only quantity 1 was sent with it, which equals the default for a missing field. The UI-confirmed name is `addtocart_{id}.EnteredQuantity`. - cart / cart-add, cart-remove - send quantity 3 with each name and compare.

## Update (cart-update)
5. Is the 502 for non-numeric/empty/decimal/missing newQuantity (and for missing/non-numeric cartItemId on delete/move) an unhandled exception that kills the request at the load balancer, or a deliberate rule? Does it affect other visitors? - cart / cart-update, cart-remove - app owner or infrastructure.
6. Does quantity 0 meaning "remove" come by design (SmartStore does this) with the 500 only an empty-cart rendering bug? Not checked with 2 lines in the cart. - cart / cart-update - probe with two lines.
7. Failure responses carry `totalsHtml` in some cases and `cartHtml` in others (totalsHtml when the cart had 1 item and qty 99999/10000/10001; cartHtml for 8564 with qty 8563). Not investigated. - cart / cart-update.
8. Wishlist variant of updatecartitem (isWishlist=true), products with attributes, and discount/gift-card effects on totals were not checked. - cart / cart-update.

## Remove and move (cart-remove)
9. What is the effect of omitting `isCartPage`, or of sending a `cartType` inconsistent with the line's real list (e.g. ShoppingCart for a wishlist id)? - cart / cart-remove.
10. What happens to quantity when moving a line with qty > 1 between cart and wishlist? - cart / cart-remove.
11. Does the browser delete click send the same POST as the curl replay? The delete click was not performed in the browser (markup only: `data-action=remove`). - cart / cart-remove - one headed delete with network capture.
12. Does the wishlist have its own delete endpoint? Only the move link was seen on /wishlist. - cart / cart-remove.
13. Is the misleading message "Product could not be added to the shopping cart." also returned for an unknown id in the ShoppingCart->Wishlist direction? It was observed for Wishlist->Cart. - cart / cart-remove.

## Cross-unit
14. Is the shared guest cart between headed browsers keyed by IP + User-Agent, or by something else? (reported by all three units; cart-update asked explicitly) - cart / all units - controlled test with different UAs in two headed sessions; app owner.
15. Is the upper quantity bound enforced as 10000 site-wide for every product, with product-specific stock (product 8: 8563) taking precedence when lower? Observed only for product 8 (the two limits produce two different messages). - cart / cart-add, cart-update.
