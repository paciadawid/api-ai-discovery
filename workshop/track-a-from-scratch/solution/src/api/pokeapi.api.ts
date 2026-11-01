// Easy tier: read-only, no auth. Chaining means following the URLs the previous reply gave you.
import type { APIRequestContext } from '@playwright/test';
import type { Pokemon } from '../domain/pokemon';

export class PokeApi {
  constructor(private readonly http: APIRequestContext) {}

  /** Relative paths ("pokemon/eevee") resolve against the /api/v2/ base; absolute URLs from replies pass through. */
  async get<T>(pathOrUrl: string): Promise<{ status: number; body: T }> {
    const res = await this.http.get(pathOrUrl);
    const text = await res.text();
    // A 404 has been plain text "Not Found" in the past and JSON today; do not crash on either.
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    return { status: res.status(), body: body as T };
  }

  pokemon(name: string) {
    return this.get<Pokemon>(`pokemon/${name}`);
  }
}
