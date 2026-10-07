// Offline sample data for the unit project: GET /cart pages minimised to what the parser reads (taken from the live store, ids neutralised). Not used by live specs.

/** The cart line id used in `CART_PAGE_WITH_ONE_LINE` (a made-up id, not a real cart item). */
export const SAMPLE_LINE_ID = 4242;

/** One Beethoven line, quantity 1, Subtotal row. The empty-cart text appears ONLY in the data-empty-text attribute, as on the live page. */
export const CART_PAGE_WITH_ONE_LINE = `
<div class="order-summary-content cart-content" data-empty-text="Your Shopping Cart is empty!">
  <div class="cart-body">
    <div class="cart-row">
      <div class="cart-col cart-col-main">
        <div class="col">
          <a class="cart-item-link" href="/ludwig-van-beethoven-for-elise" title="Description" >Ludwig van Beethoven: For Elise</a>
          <div class="cart-item-desc fs-sm" >
            Ludwig van Beethoven's most popular compositions
          </div>
        </div>
      </div>
      <div class="cart-col cart-col-price" data-caption="Price">
        <span class="price">$1.89 excl tax</span>
      </div>
      <div class="cart-col cart-col-qty" data-caption="Quantity">
        <div class="qty-input">
        <input Name="itemquantity${SAMPLE_LINE_ID}" class="form-control" data-sci-item="${SAMPLE_LINE_ID}" id="itemquantity${SAMPLE_LINE_ID}" name="item.EnteredQuantity" type="text" value="1" /></div>
      </div>
      <div class="cart-col cart-col-price cart-col-subtotal" data-caption="Total">
        <span class="price">$1.89 excl tax</span>
      </div>
    </div>
  </div>
</div>
<table class="cart-summary">
  <tr class="cart-summary-subtotal">
    <td class="cart-summary-label">Subtotal:</td>
    <td class="cart-summary-value">$1.89 excl tax</td>
  </tr>
</table>`;

/** The cart line id used in `CART_PAGE_WITH_THREE_UNITS`. */
export const SAMPLE_LINE_ID_OF_THREE = 4343;

/** One Beethoven line, quantity 3: unit price $1.89, line total $5.67, Subtotal $5.67, so no two of those figures are equal. */
export const CART_PAGE_WITH_THREE_UNITS = `
<div class="order-summary-content cart-content" data-empty-text="Your Shopping Cart is empty!">
  <div class="cart-body">
    <div class="cart-row">
      <div class="cart-col cart-col-main">
        <div class="col">
          <a class="cart-item-link" href="/ludwig-van-beethoven-for-elise" title="Description" >Ludwig van Beethoven: For Elise</a>
          <div class="cart-item-desc fs-sm" >
            Ludwig van Beethoven's most popular compositions
          </div>
        </div>
      </div>
      <div class="cart-col cart-col-price" data-caption="Price">
        <span class="price">$1.89 excl tax</span>
      </div>
      <div class="cart-col cart-col-qty" data-caption="Quantity">
        <div class="qty-input">
        <input Name="itemquantity${SAMPLE_LINE_ID_OF_THREE}" class="form-control" data-sci-item="${SAMPLE_LINE_ID_OF_THREE}" id="itemquantity${SAMPLE_LINE_ID_OF_THREE}" name="item.EnteredQuantity" type="text" value="3" /></div>
      </div>
      <div class="cart-col cart-col-price cart-col-subtotal" data-caption="Total">
        <span class="price">$5.67 excl tax</span>
      </div>
    </div>
  </div>
</div>
<table class="cart-summary">
  <tr class="cart-summary-subtotal">
    <td class="cart-summary-label">Subtotal:</td>
    <td class="cart-summary-value">$5.67 excl tax</td>
  </tr>
</table>`;

/** The real empty cart: the text is visible (and also in the data-empty-text attribute). */
export const CART_PAGE_EMPTY = `
<div class="order-summary-content cart-content" data-empty-text="Your Shopping Cart is empty!">
  <div class="alert alert-warning fade show">
    Your Shopping Cart is empty!
  </div>
</div>`;

/** Not a cart at all: no lines, no empty-cart text. A blind parser would call this "an empty cart". */
export const ERROR_PAGE = '<html><body><h1>Server Error</h1><p>The resource cannot be found.</p></body></html>';
