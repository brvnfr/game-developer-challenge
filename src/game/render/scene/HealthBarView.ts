import { Container, Graphics, Sprite } from 'pixi.js';
import { clamp } from '@/game/core/math/numbers';
import type { GameTextures } from '../assets/GameTextures';
import { healthBandFor, type HealthBarStyle } from '../healthBarStyles';

/**
 * Health bar drawn above a ship. The fill is clipped from the left (as described by the UI atlas
 * metadata) and only redrawn when the health ratio changes.
 */
export class HealthBarView {
  readonly container = new Container({ label: 'health-bar' });
  private readonly fill: Sprite;
  private readonly clip = new Graphics();
  private shownRatio = -1;

  constructor(
    private readonly textures: GameTextures,
    private readonly style: HealthBarStyle,
  ) {
    const frame = new Sprite(textures.uiElement(style.frame));
    this.fill = new Sprite(textures.uiElement(healthBandFor(style, 1)));
    this.fill.mask = this.clip;
    this.container.addChild(frame, this.fill, this.clip);
    this.container.scale.set(style.displayWidth / frame.texture.width);
    this.container.pivot.set(frame.texture.width / 2, frame.texture.height);
    this.setRatio(1);
  }

  setRatio(ratio: number): void {
    const clamped = clamp(ratio, 0, 1);
    if (clamped === this.shownRatio) return;
    this.shownRatio = clamped;
    this.fill.texture = this.textures.uiElement(healthBandFor(this.style, clamped));
    const { x, y, width, height } = this.style.fillRect;
    this.clip
      .clear()
      .rect(x, y, width * clamped, height)
      .fill(0xffffff);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
