import os from 'node:os';
import type { Browser, Page } from '@playwright/test';
import { IS_PERF_HEADLESS, isGpuRenderer } from './perfMode';

export interface TestEnvironment {
  readonly recordedAt: string;
  readonly machine: { readonly cpu: string; readonly cores: number; readonly memoryGb: number; readonly os: string };
  readonly browser: { readonly name: string; readonly version: string; readonly headless: boolean };
  readonly page: {
    readonly viewport: string;
    readonly devicePixelRatio: number;
    readonly webglRenderer: string;
    /** False when WebGL is rasterised on the CPU (SwiftShader, llvmpipe…): frame rates then measure the CPU. */
    readonly isGpuAccelerated: boolean;
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
    browser: { name: 'Chromium', version: browser.version(), headless: IS_PERF_HEADLESS },
    page: { ...pageInfo, isGpuAccelerated: isGpuRenderer(pageInfo.webglRenderer) },
  };
}

/** File-name label of a run, e.g. "win32-gpu" or "linux-software". */
export function reportLabel(environment: TestEnvironment): string {
  return `${process.platform}-${environment.page.isGpuAccelerated ? 'gpu' : 'software'}`;
}

/** Warns in the console when the run cannot measure GPU rendering. */
export function warnIfSoftwareRendering(environment: TestEnvironment): void {
  if (environment.page.isGpuAccelerated) return;
  console.warn(
    `WebGL is rendered in software (${environment.page.webglRenderer}); FPS will measure the CPU rasteriser. ` +
      'Run headed on a machine with a GPU (the default; do not set PERF_HEADLESS=1).',
  );
}
