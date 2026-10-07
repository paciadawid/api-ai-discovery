import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // every test owns its cart; the 2 workers are shared across files
  forbidOnly: !!process.env.CI,
  workers: 2, // shared public host: stay modest
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: env.baseUrl },
  projects: [
    // gate: guest-cart isolation; every cart test is skipped when it fails.
    { name: 'gate', testMatch: 'cart/visitor-isolation.api.spec.ts' },
    {
      name: 'cart',
      testMatch: 'cart/*.api.spec.ts',
      testIgnore: ['cart/visitor-isolation.api.spec.ts', 'cart/voucher-precondition-spike.api.spec.ts', 'cart/known-issues.api.spec.ts'],
      dependencies: ['gate'],
    },
    // unit: offline tests of the framework itself (parser, matchers, actor preconditions); no network, no gate.
    { name: 'unit', testMatch: 'unit/*.api.spec.ts' },
    // known-issues and spikes: independent, outside the pass/fail gate.
    { name: 'known-issues', testMatch: 'cart/known-issues.api.spec.ts' },
    { name: 'spikes', testMatch: 'cart/voucher-precondition-spike.api.spec.ts' },
  ],
});
