import { test, expect } from '@/fixtures';
import { cookieNames } from '@/domain/cookies';
import { topLevelCategories } from '@/domain/catalog-pages';

test.describe('A first-time visitor browsing the catalogue', () => {
  test('UC-CATALOG-01: the home page greets them with product tiles and a visit cookie', async ({ visitor }) => {
    const home = await visitor.opensHomePage();

    expect(home.page).toBeAnHtmlPage();
    expect(home.page.cookie(cookieNames.visitor), 'the store starts tracking the visit').toBeDefined();
    expect(home.page.title, 'the page has a title').not.toBe('');
    expect(home.isHomePage).toBe(true);
    expect(home.productGrid.count, 'the home grid shows product tiles').toBeGreaterThan(0);
    expect(home.productGrid.linkedToProducts, 'tiles link to product pages').toBeGreaterThan(0);
  });

  for (const category of topLevelCategories) {
    test(`UC-CATALOG-03: the ${category.name} category lists products under its own title`, async ({ visitor }) => {
      const page = await visitor.opensCategory(category);

      expect(page.page).toBeAnHtmlPage();
      expect(page.page.title).toMatch(/^Shop\./);
      expect(page.page.title.toLowerCase()).toContain(category.name.toLowerCase());
      expect(page.tiles.count, 'the category shows product tiles').toBeGreaterThan(0);
    });
  }
});
