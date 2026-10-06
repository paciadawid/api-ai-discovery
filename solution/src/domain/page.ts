import { parseCookie, type Cookie } from './cookies';

/** The facts of an HTTP reply that a page parser needs. `Reply<string>` from the api layer fits. */
export interface RawPage {
  readonly status: number;
  readonly contentType: string;
  readonly location: string | undefined;
  readonly setCookies: readonly string[];
  readonly body: string;
}

export class Page {
  readonly cookies: readonly Cookie[];

  constructor(private readonly raw: RawPage) {
    this.cookies = raw.setCookies.map(parseCookie);
  }

  get status(): number {
    return this.raw.status;
  }

  get location(): string | undefined {
    return this.raw.location;
  }

  get html(): string {
    return this.raw.body;
  }

  get isHtml(): boolean {
    return /text\/html/i.test(this.raw.contentType);
  }

  get title(): string {
    return /<title[^>]*>([\s\S]*?)<\/title>/i.exec(this.html)?.[1].trim() ?? '';
  }

  cookie(name: string): Cookie | undefined {
    return this.cookies.find((cookie) => cookie.name === name);
  }

  contains(text: string): boolean {
    return this.html.includes(text);
  }
}

export const textOf = (html: string): string =>
  html
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Text of the form validation summary, or '' when the page shows none. */
export function validationSummary(html: string): string {
  const inner = /<div[^>]*class="[^"]*validation-summary-errors[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html)?.[1];
  return inner === undefined ? '' : textOf(inner);
}
