import { defineConfig } from '@playwright/test';
import { env, loadDotenv } from './src/config/env';

loadDotenv();

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  forbidOnly: !!process.env.CI,
  // Shared public host: modest parallelism, no retries (defect probes send one request each).
  workers: 2,
  retries: 0,
  use: { baseURL: env.baseUrl, trace: 'retain-on-failure' },
  projects: [
    // Gate: visitor isolation (UC-CART-96). Every cart test relies on it and is skipped if it fails.
    {
      name: 'gate',
      testMatch: 'cart/visitor-isolation.api.spec.ts',
    },
    {
      name: 'cart',
      testMatch: ['cart/*.api.spec.ts', 'cartws/*.api.spec.ts'],
      testIgnore: 'cart/visitor-isolation.api.spec.ts',
      dependencies: ['gate'],
    },
    // All other areas stay independent of the gate.
    {
      name: 'api',
      testMatch: '**/*.api.spec.ts',
      testIgnore: ['cart/*', 'cartws/*'],
    },
  ],
});
