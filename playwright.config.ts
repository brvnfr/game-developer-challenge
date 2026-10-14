import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated port for E2E runs. It differs from `npm run preview` (4173) and the server is never reused, so the
 * suite always runs against a fresh production build — a preview left open from an older build cannot be tested
 * by mistake.
 */
const E2E_PORT = 4174;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

/**
 * Chromium flags that keep WebGL output deterministic across runs (software rendering,
 * fixed color profile). Required for stable visual regression of the PixiJS arena.
 */
const deterministicChromiumArgs = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--disable-gpu-vsync',
];

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/perf/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // WebGL runs in software (SwiftShader) for deterministic screenshots, so a few browsers in parallel are
  // faster than one per CPU core. Override with PLAYWRIGHT_WORKERS.
  workers: Number(process.env.PLAYWRIGHT_WORKERS ?? 2),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: { args: deterministicChromiumArgs },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7 landscape'] },
    },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: `npm run build && npx vite preview --port ${E2E_PORT} --strictPort`,
          port: E2E_PORT,
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
});
