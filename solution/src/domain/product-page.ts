export interface ProductPage {
  readonly status: number;
  readonly offersAddToCart: boolean;
  /** Read from the page's own add-to-cart link, never assumed. */
  readonly productId: number | undefined;
  readonly price: string | undefined;
}

export function parseProductPage(status: number, html: string): ProductPage {
  const productId = /data-href='\/cart\/addproduct\/(\d+)\/1'/.exec(html)?.[1];
  return {
    status,
    offersAddToCart: html.includes('id="pd-form"'),
    productId: productId ? Number(productId) : undefined,
    price: /\$[\d,]+\.\d{2}/.exec(html)?.[0],
  };
}
