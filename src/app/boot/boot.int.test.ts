import { describe, expect, it, vi } from 'vitest';
import { BootSplash } from './BootSplash';
import { preloadUi, UI_ASSET_COUNT, type PreloadEnvironment } from './preloadUi';

describe('preloadUi', () => {
  it('loads every interface image and font, reports progress up to 1, and never fails on a broken file', async () => {
    const loaded: string[] = [];
    const environment: PreloadEnvironment = {
      loadImage: (url) => {
        loaded.push(url);
        return url.includes('broken') ? Promise.reject(new Error('404')).catch(() => undefined) : Promise.resolve();
      },
      loadFont: (font) => {
        loaded.push(font);
        return Promise.resolve();
      },
    };
    const progress: number[] = [];
    await preloadUi(
      ['/extra/sea.png', '/extra/broken.png', '/extra/sea.png'],
      (fraction) => progress.push(fraction),
      environment,
    );

    expect(UI_ASSET_COUNT).toBeGreaterThan(30);
    expect(loaded).toHaveLength(UI_ASSET_COUNT + 2); // duplicates are loaded once
    expect(loaded).toContain('400 20px "Lilita One"');
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });

  it('gives up waiting after ten seconds so a stalled file cannot keep the player out', async () => {
    vi.useFakeTimers();
    const environment: PreloadEnvironment = {
      loadImage: () => new Promise(() => undefined),
      loadFont: () => Promise.resolve(),
    };
    const done = preloadUi([], () => undefined, environment);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe('BootSplash', () => {
  it('shows the progress and removes itself after fading out', async () => {
    document.body.innerHTML = `<div id="boot-splash" aria-valuenow="0"><div class="boot-splash__fill"></div>
      <p class="boot-splash__status"></p></div>`;
    const splash = BootSplash.fromDocument(document);
    splash.setProgress(0.426);
    const element = document.getElementById('boot-splash');
    expect(element?.getAttribute('aria-valuenow')).toBe('43');
    expect(element?.querySelector<HTMLElement>('.boot-splash__fill')?.style.width).toBe('43%');
    expect(element?.textContent).toContain('43%');

    vi.useFakeTimers();
    const finished = splash.finish();
    expect(element?.classList.contains('boot-splash--done')).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    await finished;
    expect(document.getElementById('boot-splash')).toBeNull();
    vi.useRealTimers();
  });

  it('goes at once when motion is off (frozen test clock or reduced motion)', async () => {
    document.body.innerHTML = '<div id="boot-splash"></div>';
    document.documentElement.setAttribute('data-motion', 'still');
    await BootSplash.fromDocument(document).finish();
    expect(document.getElementById('boot-splash')).toBeNull();
    document.documentElement.removeAttribute('data-motion');
  });

  it('does nothing when the page has no splash', async () => {
    const splash = new BootSplash(null);
    splash.setProgress(0.5);
    await expect(splash.finish()).resolves.toBeUndefined();
  });
});
