import type { HttpClient, Reply } from './http-client';

export class SearchApi {
  constructor(private readonly http: HttpClient) {}

  results(term: string): Promise<Reply<string>> {
    return this.http.get(`/search?${new URLSearchParams({ q: term })}`);
  }
}
