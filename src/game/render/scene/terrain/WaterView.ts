import { TilingSprite, type Texture } from 'pixi.js';

/** On-screen size of one repeat of the sea texture (px of the arena); larger than a tile so waves look broad. */
const WAVE_REPEAT_SIZE = 192;
/** Steady drift of the wave pattern (px/s)… */
const DRIFT_VELOCITY = { x: 7, y: 3 } as const;
/** …plus a slow back-and-forth sway, so the sea seems to swell rather than scroll. */
const SWAY_AMPLITUDE = { x: 10, y: 6 } as const;
const SWAY_RATE = 0.55;
/** Slightly deeper than the raw tile, so the light shallows and the beaches stand out against open water. */
const DEEP_WATER_TINT = 0xd9ecf7;

/**
 * Animated sea: one repeating layer of the provided water texture that drifts and sways. It covers the whole
 * screen, not only the arena (no letterbox bars on screens of another shape), drawn as a single quad; the
 * pattern stays anchored to the world when the covered area changes. (A second, additive "glints" layer was tried and dropped: it
 * cost a quarter of the frame time where WebGL is rasterised in software, see docs/PERFORMANCE.md.)
 * Animation follows presentation time, so it freezes on pause.
 */
export class WaterView {
  readonly sprite: TilingSprite;
  private elapsedSeconds = 0;
  private originX = 0;
  private originY = 0;

  constructor(
    width: number,
    height: number,
    texture: Texture,
    private readonly isAnimated: boolean,
  ) {
    this.sprite = new TilingSprite({ texture, width, height, label: 'water', tint: DEEP_WATER_TINT });
    this.sprite.tileScale.set(WAVE_REPEAT_SIZE / texture.width);
  }

  /** Covers this area of the world (it may extend beyond the arena), keeping the waves where they were. */
  cover(x: number, y: number, width: number, height: number): void {
    this.originX = x;
    this.originY = y;
    this.sprite.position.set(x, y);
    this.sprite.width = width;
    this.sprite.height = height;
    this.layOut();
  }

  update(deltaSeconds: number): void {
    if (!this.isAnimated || deltaSeconds <= 0) return;
    this.elapsedSeconds += deltaSeconds;
    this.layOut();
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private layOut(): void {
    const time = this.elapsedSeconds;
    const sway = Math.sin(time * SWAY_RATE);
    this.sprite.tilePosition.set(
      time * DRIFT_VELOCITY.x + sway * SWAY_AMPLITUDE.x - this.originX,
      time * DRIFT_VELOCITY.y + sway * SWAY_AMPLITUDE.y - this.originY,
    );
  }
}
