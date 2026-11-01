import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { toolshopUrl } from './src/config/env';

// Built into Node >= 20.12, so no dotenv dependency. Variables already set in the shell win.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  testDir: './tests',
  reporter: [['list']],
  workers: 2, // shared public hosts: stay modest
  retries: 0, // a retry hides flakiness and doubles traffic
  fullyParallel: true,
  use: {
    userAgent: 'twz26-reference/1.0 (TestWarez 2026 workshop)',
    // Toolshop answers a failed validation with a 302 to an HTML page unless the client asks for JSON.
    extraHTTPHeaders: { Accept: 'application/json' },
    // A trace would store the login request body, which holds the password.
    trace: 'off',
  },
  projects: [
    {
      name: 'toolshop',
      testMatch: ['auth/**/*.spec.ts', 'favorites/**/*.spec.ts', 'products/**/*.spec.ts', 'cart/**/*.spec.ts'],
      use: { baseURL: toolshopUrl() },
    },
    {
      name: 'pokeapi',
      testMatch: ['pokeapi/**/*.spec.ts'],
      // Trailing slash matters: request paths are relative ("pokemon/eevee"), not "/pokemon/eevee".
      use: { baseURL: 'https://pokeapi.co/api/v2/' },
    },
  ],
});
