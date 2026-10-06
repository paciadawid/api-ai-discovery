import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  workers: 2, // shared public host: stay modest
  retries: 0,
  use: { baseURL: 'https://bearstore-testsite.smartbear.com' },
});
