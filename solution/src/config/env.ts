import { existsSync } from 'node:fs';

/** The only module allowed to read `process.env`. Secrets come from the environment or an untracked `.env`. */

export function loadDotenv(path = '.env'): void {
  // loadEnvFile never overrides variables that are already set, so CI secrets win over a local file.
  if (existsSync(path)) process.loadEnvFile(path);
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in, or export it in the shell/CI.`);
  return value;
}

export const env = {
  get baseUrl(): string {
    return process.env.BASE_URL ?? 'https://bearstore-testsite.smartbear.com';
  },
  /** Resolved on demand so suites that never log in do not need credentials. */
  customer(): Credentials {
    return { email: required('BEARSTORE_EMAIL'), password: required('BEARSTORE_PASSWORD') };
  },
};
