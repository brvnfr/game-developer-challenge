import { clamp } from '@/game/core/math/numbers';

/** Time the splash takes to fade out (matches the transition in index.html). */
const FADE_OUT_MS = 350;

/**
 * Controls the loading screen written inline in index.html, which shows as soon as the page opens: it reports
 * the boot progress (bar, text and `aria-valuenow`) and fades out once the first screen has been drawn.
 */
export class BootSplash {
  private readonly fill: HTMLElement | null;
  private readonly status: HTMLElement | null;

  constructor(private readonly element: HTMLElement | null) {
    this.fill = element?.querySelector<HTMLElement>('.boot-splash__fill') ?? null;
    this.status = element?.querySelector<HTMLElement>('.boot-splash__status') ?? null;
  }

  static fromDocument(document: Document): BootSplash {
    return new BootSplash(document.getElementById('boot-splash'));
  }

  /** `fraction` from 0 to 1. */
  setProgress(fraction: number): void {
    const percent = Math.round(clamp(fraction, 0, 1) * 100);
    this.element?.setAttribute('aria-valuenow', String(percent));
    if (this.fill) this.fill.style.width = `${percent}%`;
    if (this.status) this.status.textContent = `Hoisting the sails… ${percent}%`;
  }

  /**
   * Fades out (no longer blocking clicks from the first frame of the fade) and removes the splash. Without
   * motion (reduced motion, or the frozen test clock) it goes at once.
   */
  finish(): Promise<void> {
    const { element } = this;
    if (!element) return Promise.resolve();
    this.setProgress(1);
    if (BootSplash.isMotionless(element.ownerDocument)) {
      element.remove();
      return Promise.resolve();
    }
    element.classList.add('boot-splash--done');
    element.setAttribute('aria-hidden', 'true');
    return new Promise((resolve) => {
      window.setTimeout(() => {
        element.remove();
        resolve();
      }, FADE_OUT_MS);
    });
  }

  private static isMotionless(document: Document): boolean {
    const view = document.defaultView;
    // Some environments (jsdom) have no matchMedia.
    const prefersReducedMotion =
      view !== null && 'matchMedia' in view && view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return prefersReducedMotion || document.documentElement.getAttribute('data-motion') === 'still';
  }
}
