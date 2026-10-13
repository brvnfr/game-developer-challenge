import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoPauseController } from './AutoPauseController';

function setTabVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('AutoPauseController', () => {
  let controller: AutoPauseController | null = null;
  afterEach(() => controller?.detach());

  it('pauses on window blur and when the tab is hidden, never resuming by itself', () => {
    const pause = vi.fn();
    controller = new AutoPauseController({ window, document }, pause);
    controller.attach();
    window.dispatchEvent(new Event('blur'));
    setTabVisibility('hidden');
    setTabVisibility('visible');
    expect(pause.mock.calls).toEqual([['blur'], ['hidden']]);
  });

  it('stops listening once detached', () => {
    const pause = vi.fn();
    controller = new AutoPauseController({ window, document }, pause);
    controller.attach();
    controller.detach();
    window.dispatchEvent(new Event('blur'));
    setTabVisibility('hidden');
    expect(pause).not.toHaveBeenCalled();
    expect(controller.isAttached).toBe(false);
  });
});
