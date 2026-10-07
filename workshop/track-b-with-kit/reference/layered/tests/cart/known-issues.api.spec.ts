import { test, expect } from '@/fixtures';
import { CONVERSE, converseChoices } from '@/domain/products';

// Outside the pass/fail gate (`known-issues` project). Asserts what the host does TODAY; when it is fixed, this test tells us.
test.describe('A shopper adding the variant product with an invalid Color value', () => {
  test.beforeEach(async ({ shopper }) => {
    await shopper.hasAnEmptyCart();
  });

  test(
    'UC-CART-12: the invalid Color is accepted without a message and silently dropped, the line keeps only Size 42',
    {
      tag: '@known-issue',
      annotation: { type: 'issue', description: 'KC-1 (candidate): invalid Color value 99999 accepted; observed 3x, intended behaviour unconfirmed' },
    },
    async ({ shopper }) => {
      const reply = await shopper.adds(CONVERSE, 1, converseChoices(CONVERSE.invalidColor, CONVERSE.size42));
      const line = await shopper.onlyLine();
      const counters = await shopper.counters();

      expect(reply, 'observed: HTTP 200, success:true and no message').toBeAcceptedWithoutMessage();
      expect(line.name, 'observed: exactly one line, the Converse').toBe(CONVERSE.name);
      expect(line.text, 'observed: the chosen Size is kept').toContain(CONVERSE.size42Text);
      expect(line.text, 'observed: the invalid Color is dropped, the line shows no Color').not.toContain(CONVERSE.colorLabel);
      expect(counters, 'observed: the cart counter counts the line').toHaveCartCount(1);
    },
  );
});
