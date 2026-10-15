import { BitmapText, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Vector2 } from '@/game/core/math/Vector2';
import { TimedEffect } from './TimedEffect';

const easeOut = (progress: number) => 1 - (1 - progress) ** 2;

/** Frame-by-frame explosion that grows and fades (ship destruction, Chaser ram, impacts). */
export class ExplosionEffect extends TimedEffect {
  constructor(
    position: Vector2,
    private readonly frames: readonly Texture[],
    private readonly maxScale: number,
    durationSeconds: number,
  ) {
    const [firstFrame] = frames;
    if (!firstFrame) throw new Error('An explosion needs at least one frame');
    const sprite = new Sprite({ texture: firstFrame, anchor: 0.5 });
    sprite.position.set(position.x, position.y);
    super(sprite, durationSeconds);
    this.render(0);
  }

  protected render(progress: number): void {
    const sprite = this.displayObject as Sprite;
    const frame = this.frames[Math.min(this.frames.length - 1, Math.floor(progress * this.frames.length))];
    if (frame) sprite.texture = frame;
    sprite.scale.set(this.maxScale * (0.4 + 0.6 * easeOut(progress)));
    sprite.alpha = 1 - progress ** 3;
  }
}

/** Quick flash at the muzzle when a cannon fires. */
export class MuzzleFlashEffect extends TimedEffect {
  constructor(position: Vector2, texture: Texture) {
    const sprite = new Sprite({ texture, anchor: 0.5 });
    sprite.position.set(position.x, position.y);
    super(sprite, 0.12);
    this.render(0);
  }

  protected render(progress: number): void {
    const sprite = this.displayObject as Sprite;
    sprite.scale.set(0.22 + 0.12 * progress);
    sprite.alpha = 1 - progress;
  }
}

/** Expanding ring on the water where a cannonball falls short or hits the sea. */
export class SplashEffect extends TimedEffect {
  constructor(
    position: Vector2,
    private readonly colour: number,
    private readonly maxRadius: number,
  ) {
    const ring = new Graphics();
    ring.position.set(position.x, position.y);
    super(ring, 0.5);
    this.render(0);
  }

  protected render(progress: number): void {
    const ring = this.displayObject as Graphics;
    const radius = 3 + this.maxRadius * easeOut(progress);
    ring
      .clear()
      .circle(0, 0, radius)
      .stroke({ width: 3 * (1 - progress) + 1, color: this.colour, alpha: 0.85 * (1 - progress) });
  }
}

/** A destroyed ship's wreck sinking: it shrinks, darkens and fades out. */
export class SinkingWreckEffect extends TimedEffect {
  constructor(position: Vector2, rotation: number, texture: Texture) {
    const sprite = new Sprite({ texture, anchor: 0.5, rotation });
    sprite.position.set(position.x, position.y);
    super(sprite, 1.6);
    this.render(0);
  }

  protected render(progress: number): void {
    const sprite = this.displayObject as Sprite;
    sprite.scale.set(1 - 0.35 * progress);
    sprite.alpha = 1 - progress;
  }
}

/** Floating number that rises from a ship when it takes damage ("-20"): red for the player, gold for enemies. */
export class DamageNumberEffect extends TimedEffect {
  private static readonly RISE = 34;

  constructor(
    private readonly origin: Vector2,
    amount: number,
    isPlayer: boolean,
  ) {
    const label = new BitmapText({
      text: `-${Math.round(amount)}`,
      anchor: 0.5,
      style: {
        fontFamily: 'Lilita One, sans-serif',
        fontSize: 30,
        fill: isPlayer ? 0xff6b5b : 0xffe08a,
        stroke: { color: 0x2b1406, width: 6 },
      },
    });
    super(label, 0.9);
    this.render(0);
  }

  protected render(progress: number): void {
    const label = this.displayObject as BitmapText;
    label.position.set(this.origin.x, this.origin.y - DamageNumberEffect.RISE * easeOut(progress));
    label.scale.set(progress < 0.15 ? 1.35 - (0.35 * progress) / 0.15 : 1);
    label.alpha = progress < 0.55 ? 1 : 1 - (progress - 0.55) / 0.45;
  }
}
