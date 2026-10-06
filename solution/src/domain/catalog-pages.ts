import type { Page } from './page';

export interface ProductTiles {
  readonly count: number;
  /** Tiles whose heading links to a single-segment product slug. */
  readonly linkedToProducts: number;
}

export function parseProductTiles(html: string): ProductTiles {
  return {
    count: (html.match(/<article class="art"/g) ?? []).length,
    linkedToProducts: (html.match(/<h3\s+class="art-name">\s*<a href="\/[^"\s/?]+"/g) ?? []).length,
  };
}

export interface HomePage {
  readonly page: Page;
  readonly isHomePage: boolean;
  /** Tiles of the home product grid only (recently-viewed grids reuse the markup). */
  readonly productGrid: ProductTiles;
}

export function parseHomePage(page: Page): HomePage {
  const gridStart = page.html.search(/class="product-grid product-grid-home-page\b/);
  return {
    page,
    isHomePage: page.contains('<div class="page home-page">'),
    productGrid: parseProductTiles(gridStart < 0 ? '' : page.html.slice(gridStart)),
  };
}

export interface CategoryPage {
  readonly page: Page;
  readonly tiles: ProductTiles;
}

export const parseCategoryPage = (page: Page): CategoryPage => ({ page, tiles: parseProductTiles(page.html) });

export interface Category {
  readonly slug: string;
  readonly name: string;
}

export const topLevelCategories: readonly Category[] = [
  { slug: 'books', name: 'Books' },
  { slug: 'furniture', name: 'Furniture' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'gaming', name: 'Gaming' },
  { slug: 'watches', name: 'Watches' },
  { slug: 'gift-cards', name: 'Gift cards' },
];
