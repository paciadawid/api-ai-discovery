import { test, expect } from '@/fixtures';
import { products } from '@/domain/products';

const { transoceanChronograph: chronograph } = products;

test.describe('Moving a product between the cart and the wishlist', () => {
  test('UC-CARTWS-12: a product moved to the wishlist leaves the cart, and moving it back returns it under new line ids', async ({ shopper }) => {
    const productPage = await shopper.viewsProductPage(chronograph);
    expect(productPage.status).toBe(200);
    expect(productPage.offersAddToCart).toBe(true);
    expect(productPage.price).toMatch(/^\$[\d,]+\.\d{2}$/);
    expect(productPage.productId, "the page's own add-to-cart link points at the product").toBe(chronograph.id);

    await shopper.hasInCart(chronograph, 1);
    const cartLine = await shopper.lineOf(chronograph);

    const toWishlist = await shopper.movesToWishlist(cartLine);

    expect(toWishlist).toBeAccepted();
    expect(toWishlist.body.wasMoved).toBe(true);
    expect(await shopper.cart()).toHaveNoLines();
    const wishlist = await shopper.wishlist();
    expect(wishlist).toContainLine(chronograph, { quantity: 1 });
    const wishlistLine = await shopper.wishlistLineOf(chronograph);
    expect(wishlistLine.id, 'the line gets a new id on the wishlist').not.toBe(cartLine.id);
    expect(await shopper.counters()).toMatchObject({ CartItemsCount: 0, WishlistItemsCount: 1 });

    const backToCart = await shopper.movesBackToCart(wishlistLine);

    expect(backToCart).toBeAccepted();
    expect(backToCart.body.wasMoved).toBe(true);
    const restoredLine = await shopper.lineOf(chronograph);
    expect(restoredLine.quantity).toBe(1);
    expect(restoredLine.id, 'the line gets a new id in the cart').not.toBe(wishlistLine.id);
    expect(await shopper.wishlist()).toHaveNoLines();
    expect(await shopper.counters()).toMatchObject({ CartItemsCount: 1, WishlistItemsCount: 0 });
  });
});
