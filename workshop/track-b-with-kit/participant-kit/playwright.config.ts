import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 2, // shared public host: stay modest
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL ?? 'https://bearstore-testsite.smartbear.com' },
});
