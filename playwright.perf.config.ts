import { defineConfig } from '@playwright/test';

/**
 * Performance and memory runs (`npm run perf`), kept out of the regular E2E suite. They play in real time
 * against the optimised production build and write their evidence to docs/reports/performance/.
 *
 * Unlike the E2E suite, WebGL is NOT forced to software rendering: the browser uses the machine's GPU when it
 * has one. Set PERF_HEADED=1 to watch the run (some systems only expose the GPU to headed browsers).
 */
const PERF_PORT = 4175;

export default defineConfig({
  testDir: './e2e/perf',
  testMatch: '**/*.perf.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 15 * 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PERF_PORT}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    headless: process.env.PERF_HEADED !== '1',
    locale: 'en-GB',
    timezoneId: 'UTC',
    browserName: 'chromium',
    launchOptions: { args: ['--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PERF_PORT} --strictPort`,
    port: PERF_PORT,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
