import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  workers: 2, // shared public host: stay modest
  retries: 0,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]], // terminal output plus playwright-report/ (open it with npm run report)
  use: { baseURL: env.baseUrl },
  projects: [
    // The isolation gate: two guests must not see each other's cart. Everything else depends on it.
    { name: 'gate', testMatch: /cart\/isolation\.api\.spec\.ts$/ },
    { name: 'cart', dependencies: ['gate'], testMatch: /cart\/.*\.api\.spec\.ts$/, testIgnore: /cart\/isolation\.api\.spec\.ts$/ },
  ],
});
