/**
 * Arena described as data. `tiles` is a grid of characters:
 *   "." water (navigable)   "#" land (blocks ships and projectiles)
 * The same definition feeds the simulation (colliders) and the renderer (tile art).
 */
export interface ArenaDefinition {
  readonly id: string;
  readonly tileSize: number;
  readonly tiles: readonly string[];
  /** Player start in tile coordinates (fractions allowed). */
  readonly playerStart: { readonly column: number; readonly row: number };
  /** Initial heading of the player (radians). */
  readonly playerStartHeading: number;
}

export const WATER_TILE = '.';
export const LAND_TILE = '#';
