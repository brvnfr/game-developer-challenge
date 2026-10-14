import os from 'node:os';
import type { Browser, Page } from '@playwright/test';

export interface TestEnvironment {
  readonly recordedAt: string;
  readonly machine: { readonly cpu: string; readonly cores: number; readonly memoryGb: number; readonly os: string };
  readonly browser: { readonly name: string; readonly version: string; readonly headless: boolean };
  readonly page: {
    readonly viewport: string;
    readonly devicePixelRatio: number;
    readonly webglRenderer: string;
    readonly userAgent: string;
  };
}

/** Hardware, browser and rendering context of a run, recorded next to its numbers. */
export async function describeEnvironment(page: Page, browser: Browser): Promise<TestEnvironment> {
  const pageInfo = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl && debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      webglRenderer: renderer,
      userAgent: navigator.userAgent,
    };
  });
  const cpus = os.cpus();
  return {
    recordedAt: new Date().toISOString(),
    machine: {
      cpu: cpus[0]?.model.trim() ?? 'unknown',
      cores: cpus.length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      os: `${os.type()} ${os.release()} (${os.arch()})`,
    },
    browser: { name: 'Chromium', version: browser.version(), headless: process.env.PERF_HEADED !== '1' },
    page: pageInfo,
  };
}
