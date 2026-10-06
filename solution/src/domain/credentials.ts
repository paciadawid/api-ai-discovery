import type { Credentials } from '@/config/env';

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

/** Credentials for an account that does not exist. */
export const unknownUser = (): Credentials => ({
  email: `qa-nouser-${randomSuffix()}@example.com`,
  password: `Nope-${randomSuffix()}-Xz9`,
});

export const withWrongPassword = (credentials: Credentials): Credentials => ({
  email: credentials.email,
  password: `Wrong-${randomSuffix()}-Qk7`,
});
