#!/bin/bash
# usage: qa-cart-remove.sh <curl args...>   (own UA + own cookie jar, no redirect following)
exec curl -s -A qa-cart-remove -b /tmp/qa-cart-remove.jar -c /tmp/qa-cart-remove.jar -H 'X-Requested-With: XMLHttpRequest' "$@"
