import { test, expect } from '../../src/fixtures';

// Catalog reads need no login: these run for everyone, with no account.
test.describe('products', () => {
  test('a search finds the product by its name, and every hit mentions the search term', async ({ guest }) => {
    const res = await guest.products.search('hammer');
    expect(res.status, 'search is open to guests').toBe(200);
    expect(res.body.data.length, 'precondition: the parser saw some hits').toBeGreaterThan(0);

    // Expected values come from our input (the term), not from the reply.
    for (const hit of res.body.data) {
      expect(hit.name.toLowerCase(), `"${hit.name}" is a hit for "hammer"`).toContain('hammer');
    }
    expect(res.body.data.map((p) => p.name), 'the exact product is among the hits').toContain('Thor Hammer');
  });

  test('a search with no match is an empty list, not an error', async ({ guest }) => {
    // Positive control first: the same call shape finds something for a real term.
    const control = await guest.products.search('pliers');
    expect(control.body.total, 'control: a real term has hits').toBeGreaterThan(0);

    const none = await guest.products.search('zzzzqq-no-such-tool');
    expect(none.status, 'no hits is still a success').toBe(200);
    expect(none.body.data, 'no hits means an empty list').toEqual([]);
    expect(none.body.total, 'and a total of zero').toBe(0);
  });

  test('the list is paged: page count and page size agree with the total, and pages do not overlap', async ({ guest }) => {
    const first = await guest.products.list(1);
    const second = await guest.products.list(2);
    expect([first.status, second.status], 'both pages load').toEqual([200, 200]);

    // Two independent views of one fact: the total and the number of pages.
    expect(first.body.last_page, 'last_page follows from total and per_page').toBe(
      Math.ceil(first.body.total / first.body.per_page),
    );
    expect(first.body.data, 'a full first page').toHaveLength(first.body.per_page);

    const firstIds = new Set(first.body.data.map((p) => p.id));
    expect(second.body.data.length, 'precondition: page 2 has products').toBeGreaterThan(0);
    for (const p of second.body.data) expect(firstIds.has(p.id), `${p.name} is not on page 1 as well`).toBe(false);
  });
});
