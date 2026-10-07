import { test, expect } from '@/fixtures';
import { BEETHOVEN } from '@/domain/products';

const ANOMALY = 'line missing after addproduct: voucher tests cannot run';

// Outside the pass/fail gate (`spikes` project). The spike records a finding; it does not fail on the anomaly itself.
test.describe('A shopper with a unique User-Agent who adds one product', () => {
  test(
    'UC-CART-34: the cart keeps its line after a successful add (decides whether UC-CART-35..38 are viable)',
    { tag: '@spike', annotation: { type: 'spike', description: 'UC-CART-34 reproduction spike, outside the pass/fail gate' } },
    async ({ shopper }) => {
      // Faithful 3-step reproduction: product page GET (fixture), addproduct, GET /cart.
      // No cartsummary call before the add, so the request order matches the voucher unit.
      const reply = await shopper.adds(BEETHOVEN);
      expect(reply, 'a failed add is a different problem, not the anomaly').toBeAccepted();

      const cart = await shopper.cart();

      let finding: string;
      if (cart.lines.length === 1 && cart.lines[0].quantity === 1) {
        finding = 'line kept: one line, quantity 1 after a success reply; the voucher precondition holds, UC-CART-35..38 are viable';
      } else if (cart.lines.length === 0) {
        finding = `ANOMALY: ${ANOMALY} (add replied success:true but GET /cart shows ${cart.emptyPage ? 'the empty cart page' : 'no parseable line'})`;
      } else {
        finding = `UNEXPECTED cart content: ${cart.describe()}; ${ANOMALY}`;
      }
      test.info().annotations.push({ type: 'spike-finding', description: finding });
      console.log(`[spike UC-CART-34] ${finding}`);
    },
  );
});
