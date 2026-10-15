import type { UiFrame } from './assets/atlasFrames.generated';

/** A fill colour of a health bar, used down to `minimumRatio` of the ship's health. */
export interface HealthBand {
  readonly minimumRatio: number;
  readonly frame: UiFrame;
}

/** Art and layout of a health bar, from the UI atlas (`ui_sheet.json`, logical pixels). */
export interface HealthBarStyle {
  readonly frame: UiFrame;
  /** Width of the frame art. */
  readonly frameWidth: number;
  /** Fill colours from the highest to the lowest health band. */
  readonly bands: readonly HealthBand[];
  /** Area of the fill inside the frame (the atlas metadata's `fill_rect`). */
  readonly fillRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** On-screen width of the bar drawn over a ship (world pixels). */
  readonly displayWidth: number;
}

/**
 * The player's bar: drawn by PixiJS over the ship and by the React HUD, which therefore change colour at the same
 * health and fill the same part of the frame.
 */
export const PLAYER_HEALTH_BAR: HealthBarStyle = {
  frame: 'health_frame',
  frameWidth: 256,
  bands: [
    { minimumRatio: 0.5, frame: 'health_fill_green' },
    { minimumRatio: 0.25, frame: 'health_fill_amber' },
    { minimumRatio: 0, frame: 'health_fill_red' },
  ],
  fillRect: { x: 30, y: 15, width: 196, height: 20 },
  displayWidth: 92,
};

export const ENEMY_HEALTH_BAR: HealthBarStyle = {
  frame: 'enemy_health_frame',
  frameWidth: 160,
  bands: [
    { minimumRatio: 0.35, frame: 'enemy_health_fill_green' },
    { minimumRatio: 0, frame: 'enemy_health_fill_red' },
  ],
  fillRect: { x: 24, y: 12, width: 112, height: 15 },
  displayWidth: 70,
};

/** Fill art for a health ratio in [0, 1]. */
export function healthBandFor(style: HealthBarStyle, ratio: number): UiFrame {
  return (style.bands.find((band) => ratio >= band.minimumRatio) ?? style.bands.at(-1))?.frame ?? style.frame;
}
