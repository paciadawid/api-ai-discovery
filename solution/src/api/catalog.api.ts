import type { HttpClient, Reply } from './http-client';

export class CatalogApi {
  constructor(private readonly http: HttpClient) {}

  home(): Promise<Reply<string>> {
    return this.http.get('/');
  }

  category(slug: string): Promise<Reply<string>> {
    return this.http.get(`/${slug}`);
  }

  productPage(slug: string): Promise<Reply<string>> {
    return this.http.get(`/${slug}`);
  }
}
