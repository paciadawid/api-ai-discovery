import type { APIRequestContext } from '@playwright/test';

/** What every endpoint call returns: the facts a test may assert on, never the raw Playwright response. */
export interface Reply<T> {
  readonly status: number;
  readonly contentType: string;
  readonly location: string | undefined;
  readonly setCookies: readonly string[];
  readonly body: T;
}

const AJAX = { 'X-Requested-With': 'XMLHttpRequest' };

/**
 * Transport layer. Knows the site's wire quirks so nothing above has to:
 * - AJAX endpoints need `X-Requested-With`;
 * - a body-less POST still needs `Content-Length: 0` (IIS answers 411 otherwise), hence `data: ''`;
 * - redirects are never followed, so a redirect is visible as a 3xx reply.
 */
export class HttpClient {
  constructor(private readonly context: APIRequestContext) {}

  async get(path: string): Promise<Reply<string>> {
    const res = await this.context.get(path, { maxRedirects: 0 });
    return this.toReply(res, await res.text());
  }

  async postForm(path: string, form: Record<string, string>): Promise<Reply<string>> {
    const res = await this.context.post(path, { form, maxRedirects: 0 });
    return this.toReply(res, await res.text());
  }

  async postHtml(path: string): Promise<Reply<string>> {
    const res = await this.context.post(path, { headers: AJAX, data: '' });
    return this.toReply(res, await res.text());
  }

  async postJson<T>(path: string, form?: Record<string, string>): Promise<Reply<T>> {
    const res = await this.context.post(path, { headers: AJAX, ...(form ? { form } : { data: '' }) });
    const text = await res.text();
    try {
      return this.toReply(res, JSON.parse(text) as T);
    } catch {
      throw new Error(`POST ${path} did not return JSON (HTTP ${res.status()}): ${text.slice(0, 120)}`);
    }
  }

  private toReply<T>(res: Awaited<ReturnType<APIRequestContext['get']>>, body: T): Reply<T> {
    return {
      status: res.status(),
      contentType: res.headers()['content-type'] ?? '',
      location: res.headers()['location'],
      setCookies: res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value),
      body,
    };
  }
}
