import { randomUUID } from 'node:crypto';

/** The host keys a guest cart by IP + User-Agent, so every actor gets a User-Agent nobody else has (never the default one). */
export function userAgentFor(testId: string, role: string): string {
  return `qa-bearstore-${role}-${testId}-${randomUUID().slice(0, 8)}`;
}
