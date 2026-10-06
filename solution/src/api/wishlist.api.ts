import type { HttpClient, Reply } from './http-client';

export class WishlistApi {
  constructor(private readonly http: HttpClient) {}

  page(): Promise<Reply<string>> {
    return this.http.get('/wishlist');
  }
}
