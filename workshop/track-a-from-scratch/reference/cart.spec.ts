// Reference ("answer key") suite for the cart slice. One flat file on purpose:
// what matters here is WHAT each test asserts and WHY, not the project structure.
import { test as base, expect, request, type APIRequestContext } from '@playwright/test';

const GOLFBALL = { id: 8, name: 'Supreme Golfball', unitCents: 190 }; // $1.90 on the product page

// ---------- tiny helpers (the whole "framework") ----------

/** Cents from a price like "$1,234.50 excl tax"; assertions compare numbers, not formatting. */
const cents = (price: string) => Math.round(parseFloat(price.replace(/[^0-9.]/g, '')) * 100);

type Line = { id: string; quantity: number; unitCents: number; totalCents: number };

class Shopper {
  constructor(readonly http: APIRequestContext) {}

  // Business failures often come back as HTTP 200 with success:false, so callers must read the body.
  async add(productId: number, quantity: number) {
    const res = await this.http.post(`/cart/addproduct/${productId}/1`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      form: { [`addtocart_${productId}.EnteredQuantity`]: String(quantity) },
    });
    return { status: res.status(), json: await res.json() };
  }

  async update(lineId: string, quantity: number) {
    const res = await this.http.post(`/shoppingcart/updatecartitem?sciItemId=${lineId}&isCartPage=True`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      form: { newQuantity: String(quantity), isCartPage: 'true', isWishlist: 'false' },
    });
    return { status: res.status(), text: await res.text() };
  }

  async remove(lineId: string) {
    const res = await this.http.post(`/shoppingcart/deletecartitem?cartItemId=${lineId}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      data: '', // a body-less POST needs Content-Length, otherwise IIS answers 411
    });
    return { status: res.status(), text: await res.text() };
  }

  /** The header badge: number of UNITS in the cart, not number of lines. */
  async badge(): Promise<number> {
    const res = await this.http.post('/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      data: '',
    });
    return (await res.json()).CartItemsCount;
  }

  /** Parses the cart page into lines and subtotal. Fails loudly if the page is not the cart we expect. */
  async cart(): Promise<{ lines: Line[]; subtotalCents: number | null }> {
    const res = await this.http.get('/cart');
    expect(res.status(), 'cart page is reachable').toBe(200);
    const html = await res.text();
    const items = html.slice(html.indexOf('id="cart-items"'), html.indexOf('id="order-totals"'));
    const inputs = [...items.matchAll(/id="itemquantity(\d+)"[^>]*value="(\d+)"/g)];
    const prices = [...items.matchAll(/<span class="price">([^<]+)<\/span>/g)].map((m) => cents(m[1]));
    const lines = inputs.map((m, i) => ({
      id: m[1],
      quantity: Number(m[2]),
      unitCents: prices[2 * i],
      totalCents: prices[2 * i + 1],
    }));
    const subtotal = html.match(/cart-summary-subtotal[\s\S]*?cart-summary-value">([^<]+)</);
    return { lines, subtotalCents: subtotal ? cents(subtotal[1]) : null };
  }
}

// Every test gets its OWN shopper. The host keys a guest cart by IP + User-Agent, so a unique
// User-Agent per test is what keeps parallel tests (and parallel workshop pairs) from sharing a cart.
const test = base.extend<{ shopper: Shopper; otherShopper: Shopper }>({
  shopper: async ({ baseURL }, use, info) => use(await newShopper(baseURL!, info.title)),
  otherShopper: async ({ baseURL }, use, info) => use(await newShopper(baseURL!, `${info.title}-other`)),
});

async function newShopper(baseURL: string, label: string) {
  const tag = label.match(/^[A-Z0-9-]+/)?.[0] ?? 'test';
  const http = await request.newContext({
    baseURL,
    extraHTTPHeaders: { 'User-Agent': `workshop-qa/${tag}-${Math.random().toString(36).slice(2, 8)}` },
    maxRedirects: 0,
  });
  await http.get('/'); // first visit hands out the guest identity cookie
  return new Shopper(http);
}

// ---------- tests ----------

test.describe('Cart manipulation (anonymous shopper)', () => {
  test('CART-01: a first product lands in the cart as ONE line, and every view agrees', async ({ shopper }) => {
    // Precondition proven, not assumed: the parser works and the cart really starts empty.
    expect((await shopper.cart()).lines).toHaveLength(0);

    const added = await shopper.add(GOLFBALL.id, 1);

    // Weak: expect(added.status).toBe(200). Strong: the business result inside the 200.
    expect(added.json.success, 'add reports business success').toBe(true);

    // Three independent views of the same fact must agree: cart page lines, cart page subtotal, header badge.
    const cart = await shopper.cart();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ quantity: 1, unitCents: GOLFBALL.unitCents, totalCents: GOLFBALL.unitCents });
    expect(cart.subtotalCents).toBe(GOLFBALL.unitCents);
    expect(await shopper.badge()).toBe(1);
  });

  test('CART-02: adding the same product again grows the existing line instead of adding a second one', async ({ shopper }) => {
    await shopper.add(GOLFBALL.id, 1);
    await shopper.add(GOLFBALL.id, 3);

    const cart = await shopper.cart();
    expect(cart.lines, 'one line, not two').toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(4);
    expect(cart.lines[0].totalCents).toBe(4 * GOLFBALL.unitCents);
    expect(await shopper.badge(), 'the badge counts units, not lines').toBe(4);
  });

  test('CART-03: changing the quantity reprices the SAME line and the subtotal', async ({ shopper }) => {
    await shopper.add(GOLFBALL.id, 1);
    const [before] = (await shopper.cart()).lines;

    await shopper.update(before.id, 5);

    const cart = await shopper.cart();
    expect(cart.lines, 'still one line').toHaveLength(1);
    expect(cart.lines[0].id, 'the line keeps its identity').toBe(before.id);
    // The expected value is computed from the INPUT (5 x unit price), never copied from what the page shows.
    expect(cart.lines[0].quantity).toBe(5);
    expect(cart.lines[0].totalCents).toBe(5 * GOLFBALL.unitCents);
    expect(cart.subtotalCents).toBe(5 * GOLFBALL.unitCents);
    expect(await shopper.badge()).toBe(5);
  });

  test('CART-04: removing the only line empties the cart everywhere', async ({ shopper }) => {
    await shopper.add(GOLFBALL.id, 2);
    const cart = await shopper.cart();
    // Guard against a VACUOUS pass: "no lines" is only meaningful if the parser did see a line before.
    expect(cart.lines, 'precondition: the line is visible to the parser').toHaveLength(1);

    await shopper.remove(cart.lines[0].id);

    expect((await shopper.cart()).lines).toHaveLength(0);
    expect(await shopper.badge()).toBe(0);
  });

  test('CART-05 @known-issue: quantity 0 answers HTTP 500 although the cart WAS changed', async ({ shopper }) => {
    await shopper.add(GOLFBALL.id, 2);
    const [line] = (await shopper.cart()).lines;

    const reply = await shopper.update(line.id, 0);

    // What the server SAID: an unhandled exception. This pins today's (buggy) behaviour on purpose;
    // when the host fixes it, this assertion fails and tells you so.
    expect(reply.status).toBe(500);
    expect(reply.text).toContain('Object reference not set to an instance of an object');
    // What the server DID: the line is gone anyway. The response and the effect disagree, which is the bug.
    expect((await shopper.cart()).lines, 'the failed call still removed the line').toHaveLength(0);
    expect(await shopper.badge()).toBe(0);
  });

  test("CART-06: a visitor's cart is private; another visitor cannot see or delete its lines", async ({ shopper, otherShopper }) => {
    await shopper.add(GOLFBALL.id, 1);
    const [mine] = (await shopper.cart()).lines;
    await otherShopper.add(GOLFBALL.id, 2);
    const [theirs] = (await otherShopper.cart()).lines;

    expect(mine.id, 'two visitors got two different lines').not.toBe(theirs.id);
    expect((await otherShopper.cart()).lines.map((l) => l.id), "their cart never lists my line").not.toContain(mine.id);

    await otherShopper.remove(mine.id); // try to delete a line that is not theirs

    const afterAttack = await shopper.cart();
    expect(afterAttack.lines, 'my cart is untouched').toHaveLength(1);
    expect(afterAttack.lines[0]).toMatchObject({ id: mine.id, quantity: 1 });
    expect((await otherShopper.cart()).lines[0], 'their own line is untouched too').toMatchObject({ id: theirs.id, quantity: 2 });

    // Positive control. "My cart is untouched" would ALSO hold if delete did nothing at all (a mutation
    // run proved it: with delete broken this test still passed). Show that delete works on a line you own.
    await otherShopper.remove(theirs.id);
    expect((await otherShopper.cart()).lines, 'delete does work on your own line').toHaveLength(0);
  });
});
