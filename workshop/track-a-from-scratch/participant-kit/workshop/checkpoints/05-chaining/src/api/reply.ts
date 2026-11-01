import type { APIRequestContext, APIResponse } from '@playwright/test';

export type Reply<T> = { status: number; body: T };

/** An empty body (204) and a non-JSON body (an HTML error page) must not crash the client. */
export async function reply<T>(res: APIResponse): Promise<Reply<T>> {
  const text = await res.text();
  let body: unknown = text || undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {}
  return { status: res.status(), body: body as T };
}

/** Base of every endpoint group: one request context, an optional bearer token. */
export abstract class Api {
  constructor(
    protected readonly http: APIRequestContext,
    protected readonly token?: string,
  ) {}

  protected auth(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}
