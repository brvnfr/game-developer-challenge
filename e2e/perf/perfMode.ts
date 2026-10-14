/**
 * Performance runs are headed by default: headless Chromium usually renders WebGL in software (SwiftShader) even
 * on machines with a GPU, which measures the CPU rasteriser instead of the game. PERF_HEADLESS=1 forces headless;
 * Linux without a display (CI, containers) is always headless.
 */
export const IS_PERF_HEADLESS =
  process.env.PERF_HEADLESS === '1' || (process.platform === 'linux' && !process.env.DISPLAY);

/** WebGL renderers that rasterise on the CPU. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function isGpuRenderer(webglRenderer: string): boolean {
  return webglRenderer !== 'unknown' && !SOFTWARE_RENDERER.test(webglRenderer);
}
