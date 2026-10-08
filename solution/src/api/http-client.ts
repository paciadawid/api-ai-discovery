import type { APIRequestContext } from '@playwright/test';

export type Reply<T> = { status: number; body: T };

// Target quirks live here and nowhere else: the XHR header, and the empty body a body-less POST needs (else HTTP 411).
// The client parses the reply body (JSON when the server says so, otherwise text) and NEVER asserts.
export class HttpClient {
  constructor(private readonly ctx: APIRequestContext) {}

  get<T>(path: string): Promise<Reply<T>> {
    return this.send<T>(() => this.ctx.get(path, { headers: HEADERS }));
  }

  postEmpty<T>(path: string): Promise<Reply<T>> {
    return this.send<T>(() => this.ctx.post(path, { headers: HEADERS, data: '' }));
  }

  postForm<T>(path: string, form: Record<string, string | number | boolean>): Promise<Reply<T>> {
    return this.send<T>(() => this.ctx.post(path, { headers: HEADERS, form }));
  }

  private async send<T>(call: () => ReturnType<APIRequestContext['get']>): Promise<Reply<T>> {
    const res = await call();
    const text = await res.text();
    const isJson = (res.headers()['content-type'] ?? '').includes('json');
    return { status: res.status(), body: (isJson ? JSON.parse(text) : text) as T };
  }
}

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };
