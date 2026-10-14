import { Graphics } from 'pixi.js';

const FLASH_SECONDS = 0.35;
const FLASH_ALPHA = 0.28;
const SHAKE_SECONDS = 0.25;
const SHAKE_PIXELS = 7;

/**
 * Screen-level feedback when the player is hit: a short red flash over the arena and a small camera
 * shake (skipped when the user prefers reduced motion).
 */
export class DamageFeedback {
  readonly overlay = new Graphics({ label: 'damage-flash' });
  private flashSeconds = 0;
  private shakeSeconds = 0;

  constructor(
    width: number,
    height: number,
    private readonly prefersReducedMotion: boolean,
  ) {
    this.overlay.rect(0, 0, width, height).fill(0xd92b2b);
    this.overlay.alpha = 0;
  }

  trigger(): void {
    this.flashSeconds = FLASH_SECONDS;
    if (!this.prefersReducedMotion) this.shakeSeconds = SHAKE_SECONDS;
  }

  /** Returns the camera shake offset for this frame. */
  update(deltaSeconds: number): { x: number; y: number } {
    this.flashSeconds = Math.max(0, this.flashSeconds - deltaSeconds);
    this.shakeSeconds = Math.max(0, this.shakeSeconds - deltaSeconds);
    this.overlay.alpha = FLASH_ALPHA * (this.flashSeconds / FLASH_SECONDS);
    if (this.shakeSeconds <= 0) return { x: 0, y: 0 };
    const strength = SHAKE_PIXELS * (this.shakeSeconds / SHAKE_SECONDS);
    return { x: (Math.random() * 2 - 1) * strength, y: (Math.random() * 2 - 1) * strength };
  }

  reset(): void {
    this.flashSeconds = 0;
    this.shakeSeconds = 0;
    this.overlay.alpha = 0;
  }
}
