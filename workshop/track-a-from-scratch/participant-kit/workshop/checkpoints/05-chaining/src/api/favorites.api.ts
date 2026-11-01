import { Api, reply } from './reply';
import type { Favorite } from '../domain/types';

export class FavoritesApi extends Api {
  list() {
    return this.http.get('/favorites', { headers: this.auth() }).then((r) => reply<Favorite[]>(r));
  }

  get(id: string) {
    return this.http.get(`/favorites/${id}`, { headers: this.auth() }).then((r) => reply<Favorite>(r));
  }

  add(productId: string) {
    return this.http
      .post('/favorites', { headers: this.auth(), data: { product_id: productId } })
      .then((r) => reply<Favorite>(r));
  }

  remove(id: string) {
    return this.http.delete(`/favorites/${id}`, { headers: this.auth() }).then((r) => reply<void>(r));
  }
}
