import type { HttpClient, Reply } from './http-client';

export class AccountApi {
  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string, returnUrl?: string): Promise<Reply<string>> {
    const query = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    return this.http.postForm(`/login${query}`, { UsernameOrEmail: email, Password: password, RememberMe: 'false' });
  }

  page(path: string): Promise<Reply<string>> {
    return this.http.get(path);
  }

  logout(): Promise<Reply<string>> {
    return this.http.get('/logout');
  }
}
