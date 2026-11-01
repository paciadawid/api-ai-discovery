import { Api, reply } from './reply';
import type { Brand, Page, Product } from '../domain/types';

export class ProductsApi extends Api {
  search(q: string) {
    return this.http.get('/products/search', { params: { q } }).then((r) => reply<Page<Product>>(r));
  }

  list(page = 1) {
    return this.http.get('/products', { params: { page } }).then((r) => reply<Page<Product>>(r));
  }

  /** Filters and sorting of GET /products, for example { by_brand: id, sort: 'price,asc' }. */
  filter(params: { by_brand?: string; by_category?: string; sort?: string; page?: number }) {
    return this.http.get('/products', { params }).then((r) => reply<Page<Product>>(r));
  }

  brands() {
    return this.http.get('/brands').then((r) => reply<Brand[]>(r));
  }

  get(id: string) {
    return this.http.get(`/products/${id}`).then((r) => reply<Product>(r));
  }
}
