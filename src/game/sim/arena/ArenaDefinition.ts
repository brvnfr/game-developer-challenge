/**
 * Arena described as data. `tiles` is a grid of characters:
 *   "." water (navigable)
 *   "#" grass island (land: blocks ships and projectiles)
 *   "s" sand islet (land: blocks ships and projectiles)
 *   "r" reef rock (a single-tile obstacle; its collider is smaller than the tile, like the rock art)
 * The same definition feeds the simulation (colliders) and the renderer (art). For the simulation both land
 * kinds are identical; the renderer draws each island kind with its own art.
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
export const GRASS_ISLAND_TILE = '#';
export const SAND_ISLAND_TILE = 's';
export const ROCK_TILE = 'r';

export type TerrainKind = 'water' | 'grassIsland' | 'sandIsland' | 'rock';

const TERRAIN_BY_CHARACTER: Readonly<Record<string, TerrainKind>> = {
  [WATER_TILE]: 'water',
  [GRASS_ISLAND_TILE]: 'grassIsland',
  [SAND_ISLAND_TILE]: 'sandIsland',
  [ROCK_TILE]: 'rock',
};

/** Terrain of a tile character, or null when the character is not part of the format. */
export function terrainKindOf(character: string): TerrainKind | null {
  return TERRAIN_BY_CHARACTER[character] ?? null;
}

/** Islands (grass or sand): merged into rectangular colliders that fill their tiles. */
export function isLand(kind: TerrainKind): boolean {
  return kind === 'grassIsland' || kind === 'sandIsland';
}

/** Anything a ship or a cannonball cannot cross. */
export function isObstacle(kind: TerrainKind): boolean {
  return kind !== 'water';
}
