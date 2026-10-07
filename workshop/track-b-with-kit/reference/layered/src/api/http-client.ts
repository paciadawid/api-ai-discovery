import type { APIRequestContext } from '@playwright/test';

/** What every endpoint call returns: the facts a test may assert on, never the raw Playwright response. */
export interface Reply<T> {
  readonly status: number;
  readonly body: T;
}

const AJAX = { 'X-Requested-With': 'XMLHttpRequest' };

/**
 * Transport layer. Knows the site's wire quirks so nothing above has to:
 * - the store expects `X-Requested-With: XMLHttpRequest`;
 * - a body-less POST still needs `Content-Length: 0` (IIS answers 411 otherwise), hence `data: ''`;
 * - redirects are never followed, so a redirect is visible as a 3xx reply.
 * It never asserts: judging a reply is for matchers and actors.
 */
export class HttpClient {
  constructor(private readonly context: APIRequestContext) {}

  async get(path: string): Promise<Reply<string>> {
    const res = await this.context.get(path, { headers: AJAX, maxRedirects: 0 });
    return { status: res.status(), body: await res.text() };
  }

  async postJson<T>(path: string, form?: Record<string, string | number>): Promise<Reply<T>> {
    const res = await this.context.post(path, { headers: AJAX, maxRedirects: 0, ...(form ? { form } : { data: '' }) });
    const text = await res.text();
    try {
      return { status: res.status(), body: JSON.parse(text) as T };
    } catch {
      throw new Error(`POST ${path} did not return JSON (HTTP ${res.status()}): ${text.slice(0, 120)}`);
    }
  }
}
