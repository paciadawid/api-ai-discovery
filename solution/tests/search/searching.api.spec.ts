import { test, expect } from '@/fixtures';
import { cookieNames } from '@/domain/cookies';

test.describe('A visitor searching the store', () => {
  test('UC-SEARCH-01: a known term returns a result page with hits linking to products', async ({ visitor }) => {
    const term = 'watch';

    const results = await visitor.searchesFor(term);

    expect(results.page).toBeAnHtmlPage();
    expect(results.page.cookie(cookieNames.visitor), 'the store starts tracking the visit').toBeDefined();
    expect(results.page.title, 'the title echoes the term').toBe(`Shop. Search result for "${term}"`);
    expect(results.queryShown, 'the search box keeps the term').toBe(term);
    expect(results.totalHits, 'the hit-count heading reports at least one hit').toBeGreaterThanOrEqual(1);
    expect(results.tiles.count).toBeGreaterThan(0);
    expect(results.tiles.linkedToProducts, 'hits link to product pages').toBeGreaterThan(0);
  });

  test('UC-SEARCH-32: markup typed into the search box is shown encoded, never executed', async ({ visitor }) => {
    const probe = '<script>alert(1)</script>';
    const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;';

    const results = await visitor.searchesFor(probe);

    expect(results.page.status).toBe(200);
    expect(results.page.contains(probe), 'the raw payload is not reflected').toBe(false);
    expect(results.page.contains('<script>alert(1)'), 'no script tag is reflected').toBe(false);
    expect(results.page.title, 'the title shows the encoded query').toContain(encoded);
    expect(results.queryShown, 'the search box shows the encoded query').toContain(encoded);
    expect(results.heading, 'the result heading shows the encoded query').toContain('&lt;script&gt;');
  });
});
