import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
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
  ...(process.env.CI ? { workers: 2 } : {}),
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
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
          command: 'npm run build && npm run preview',
          port: PORT,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
