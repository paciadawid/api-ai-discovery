export interface Product {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly unitPrice: string;
}

/** Simple product, no choices needed. */
export const BEETHOVEN = {
  id: 35,
  name: 'Ludwig van Beethoven: For Elise',
  slug: 'ludwig-van-beethoven-for-elise',
  unitPrice: '$1.89',
} as const satisfies Product;

/** Variant product: the add is refused until a Color and a Size are chosen. */
export const CONVERSE = {
  id: 51,
  name: 'Converse All Star',
  slug: 'converse-all-star',
  unitPrice: '$79.90',
  colorField: 'pvari51-0-1-13',
  sizeField: 'pvari51-0-7-14',
  invalidColor: 99999, // not a real Color value (UC-CART-12)
  size42: 59,
  size42Text: 'Size: 42', // how the cart line shows the chosen size
  colorLabel: 'Color', // how the cart line labels a chosen colour
} as const satisfies Product & Record<string, unknown>;

/** The shop refuses a single add above this quantity. */
export const MAX_QUANTITY = 10000;

/** The Color and Size choices the browser sends for the variant product, as form fields. */
export function converseChoices(color: number, size: number): Record<string, number> {
  return { [CONVERSE.colorField]: color, [CONVERSE.sizeField]: size };
}
