import { defineConfig } from '@playwright/test';
import { IS_PERF_HEADLESS } from './e2e/perf/perfMode';

/**
 * Performance and memory runs (`npm run perf`), kept out of the regular E2E suite. They play in real time
 * against the optimised production build and write their evidence to docs/reports/performance/.
 *
 * Unlike the E2E suite, WebGL is NOT forced to software rendering, and the browser is headed by default so it
 * uses the machine's GPU (headless Chromium usually falls back to SwiftShader). Each report records the WebGL
 * renderer and whether it is GPU-accelerated. PERF_HEADLESS=1 forces a headless run.
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
    headless: IS_PERF_HEADLESS,
    locale: 'en-GB',
    timezoneId: 'UTC',
    browserName: 'chromium',
    launchOptions: {
      args: [
        '--ignore-gpu-blocklist',
        '--enable-gpu',
        '--enable-precise-memory-info',
        // Keep rendering at full rate even if the window is partly covered by other windows.
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
      ],
    },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PERF_PORT} --strictPort`,
    port: PERF_PORT,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
