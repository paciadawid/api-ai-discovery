export const cookieNames = {
  visitor: 'SMARTSTORE.VISITOR',
  session: 'SMARTSTORE.AUTH',
} as const;

/** A Set-Cookie header reduced to what tests judge. The value is deliberately dropped: it may be a secret. */
export interface Cookie {
  readonly name: string;
  readonly httpOnly: boolean;
  readonly sameSite: string | undefined;
  readonly persistent: boolean;
}

export function parseCookie(setCookie: string): Cookie {
  return {
    name: setCookie.split('=')[0].trim(),
    httpOnly: /;\s*httponly/i.test(setCookie),
    sameSite: /;\s*samesite=(\w+)/i.exec(setCookie)?.[1].toLowerCase(),
    persistent: /;\s*expires=/i.test(setCookie),
  };
}
