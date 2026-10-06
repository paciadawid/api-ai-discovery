import { parseProductTiles, type ProductTiles } from './catalog-pages';
import type { Page } from './page';

export interface SearchResultsPage {
  readonly page: Page;
  /** Value of the search box as rendered (still HTML-encoded). */
  readonly queryShown: string;
  /** Inner HTML of the "search result for" heading (still HTML-encoded). */
  readonly heading: string;
  /** Total from the "N-M of T" heading; 0 when the heading is missing. */
  readonly totalHits: number;
  readonly tiles: ProductTiles;
}

export function parseSearchResultsPage(page: Page): SearchResultsPage {
  const searchBox = /<input[^>]*name="q"[^>]*>/i.exec(page.html)?.[0] ?? '';
  const hits = /<h5 class="search-hitcount">\s*(\d+)-(\d+) of (\d+)\s*<\/h5>/.exec(page.html);
  return {
    page,
    queryShown: /value="([^"]*)"/.exec(searchBox)?.[1] ?? '',
    heading: /<small[^>]*class=["']?search-term["']?[^>]*>([\s\S]*?)<\/small>/i.exec(page.html)?.[1] ?? '',
    totalHits: hits ? Number(hits[3]) : 0,
    tiles: parseProductTiles(page.html),
  };
}
