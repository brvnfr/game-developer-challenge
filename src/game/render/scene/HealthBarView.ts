import { Container, Graphics, Sprite } from 'pixi.js';
import type { UiFrame } from '../assets/atlasFrames.generated';
import type { GameTextures } from '../assets/GameTextures';

interface HealthBarStyle {
  readonly frame: UiFrame;
  /** Fill textures from the highest to the lowest health band. */
  readonly fills: readonly { readonly minimumRatio: number; readonly frame: UiFrame }[];
  /** Area of the fill inside the bar, in logical pixels of the UI atlas (from ui_sheet.json `fill_rect`). */
  readonly fillRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly displayWidth: number;
}

export const PLAYER_HEALTH_BAR: HealthBarStyle = {
  frame: 'health_frame',
  fills: [
    { minimumRatio: 0.5, frame: 'health_fill_green' },
    { minimumRatio: 0.25, frame: 'health_fill_amber' },
    { minimumRatio: 0, frame: 'health_fill_red' },
  ],
  fillRect: { x: 30, y: 15, width: 196, height: 20 },
  displayWidth: 92,
};

export const ENEMY_HEALTH_BAR: HealthBarStyle = {
  frame: 'enemy_health_frame',
  fills: [
    { minimumRatio: 0.35, frame: 'enemy_health_fill_green' },
    { minimumRatio: 0, frame: 'enemy_health_fill_red' },
  ],
  fillRect: { x: 24, y: 12, width: 112, height: 15 },
  displayWidth: 70,
};

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
    this.fill = new Sprite(textures.uiElement(style.fills[0]?.frame ?? style.frame));
    this.fill.mask = this.clip;
    this.container.addChild(frame, this.fill, this.clip);
    this.container.scale.set(style.displayWidth / frame.texture.width);
    this.container.pivot.set(frame.texture.width / 2, frame.texture.height);
    this.setRatio(1);
  }

  setRatio(ratio: number): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    if (clamped === this.shownRatio) return;
    this.shownRatio = clamped;
    const band = this.style.fills.find((fill) => clamped >= fill.minimumRatio) ?? this.style.fills.at(-1);
    if (band) this.fill.texture = this.textures.uiElement(band.frame);
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
