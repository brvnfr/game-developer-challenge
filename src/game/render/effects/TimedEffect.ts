import type { Container } from 'pixi.js';

/**
 * A short-lived visual effect. Subclasses describe how the display object looks at each point of its
 * lifetime (template method); the base class tracks time and cleanup.
 */
export abstract class TimedEffect {
  private elapsedSeconds = 0;

  protected constructor(
    readonly displayObject: Container,
    private readonly durationSeconds: number,
  ) {}

  get isFinished(): boolean {
    return this.elapsedSeconds >= this.durationSeconds;
  }

  /** Advances the effect; returns false once it has finished. */
  update(deltaSeconds: number): boolean {
    this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + deltaSeconds);
    this.render(this.elapsedSeconds / this.durationSeconds);
    return !this.isFinished;
  }

  destroy(): void {
    this.displayObject.destroy({ children: true });
  }

  /** Draws the effect at `progress` in [0, 1]. */
  protected abstract render(progress: number): void;
}
