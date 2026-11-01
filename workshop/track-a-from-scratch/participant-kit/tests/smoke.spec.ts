// The first test everybody writes: it only proves the toolchain and the host work.
// It checks almost nothing. In block 4 you replace it with tests that can fail.
import { test, expect } from '@playwright/test';

test('smoke: the product search answers', async ({ request }) => {
  const res = await request.get('/products/search', { params: { q: 'pliers' } });
  expect(res.status()).toBe(200);
});
