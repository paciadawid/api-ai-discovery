import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Built into Node >= 20.12, so there is no dotenv dependency. Variables already set in the shell win (that is how CI works).
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 2, // a public host shared by the whole room: stay modest
  retries: 0, // a retry hides flakiness and doubles traffic
  fullyParallel: true,
  use: {
    baseURL: process.env.TOOLSHOP_BASE_URL ?? 'https://api.practicesoftwaretesting.com',
    userAgent: 'twz26-participant/1.0 (TestWarez 2026 workshop)',
    // Without this the API answers a failed validation with a 302 to an HTML page instead of JSON.
    extraHTTPHeaders: { Accept: 'application/json' },
    // A trace would store the login request body, which holds your password.
    trace: 'off',
  },
});
