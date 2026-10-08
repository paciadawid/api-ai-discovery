#!/usr/bin/env bash
# Replays of the cart-quantity endpoints. Own UA + own cookie jar (guest cart is keyed by IP + User-Agent).
B=https://bearstore-testsite.smartbear.com
J=/tmp/qa-cart-quantity.jar
c() { curl -s -A "qa-cart-quantity" -b $J -c $J -H "X-Requested-With: XMLHttpRequest" "$@"; }
rm -f $J
c -o /dev/null $B/cart                                             # get visitor cookie
c -X POST --data '' $B/cart/addproduct/4/1                         # seed: Certina, qty 1 (body-less POST needs data '')
ID=$(c $B/cart | grep -oE 'updatecartitem\?sciItemId=[0-9]+' | head -1 | grep -oE '[0-9]+$')
upd() { c -i -X POST --data "newQuantity=$1&isCartPage=true&isWishlist=false" "$B/shoppingcart/updatecartitem?sciItemId=${2:-$ID}&isCartPage=True"; }
upd 3                 # 200 success:true SubTotal $1,437.00
upd 10000             # 200 success:true
upd 10001             # 200 success:false message "The maximum quantity allowed for purchase is 10000." (qty unchanged)
upd 1                 # back to 1
upd abc               # 502 Bad Gateway text/html, qty unchanged
upd 2.5               # 502
upd ""                # 502
upd 2147483648        # 502 ; 2147483647 -> 200 success:false max message
upd 2 999999999       # 500 {"error":true,...,"message":"Object reference not set to an instance of an object."} unknown id
upd 0                 # 500 same error body, BUT the line is deleted (side effect)  (also -2)
c -X POST --data '' "$B/shoppingcart/cartsummary?cart=True"        # {"CartItemsCount":N,...} N = sum of quantities
c -i "$B/shoppingcart/updatecartitem?sciItemId=$ID&newQuantity=2"  # GET -> 404
# cleanup (delete is the cart-remove unit's endpoint; used here only to clean up)
for i in $(c $B/cart | grep -oE 'updatecartitem\?sciItemId=[0-9]+' | grep -oE '[0-9]+$'); do c -X POST --data '' "$B/shoppingcart/deletecartitem?cartItemId=$i"; done
