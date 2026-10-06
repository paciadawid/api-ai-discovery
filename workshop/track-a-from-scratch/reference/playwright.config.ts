import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  reporter: [['list']],
  workers: 2, // shared public host: stay modest
  retries: 0,
  use: { baseURL: process.env.BASE_URL ?? 'https://bearstore-testsite.smartbear.com' },
});
