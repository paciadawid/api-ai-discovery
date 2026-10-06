/**
 * The host gives cookieless requests from the same IP and User-Agent the SAME guest cart (OQ-01),
 * so every visitor gets a unique User-Agent that names the use case it belongs to.
 */
export function uniqueUserAgent(useCase = 'adhoc'): string {
  return `bearstore-qa/${useCase}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useCaseOf = (testTitle: string): string => /^(UC-[A-Z]+-\d+)/.exec(testTitle)?.[1] ?? 'adhoc';
