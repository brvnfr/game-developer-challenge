/**
 * Arena described as data. `tiles` is a grid of characters:
 *   "." water (navigable)
 *   "#" grass island (land: blocks ships and projectiles)
 *   "s" sand islet (land: blocks ships and projectiles)
 * The same definition feeds the simulation (colliders) and the renderer (tile art). For the simulation both
 * land kinds are identical; the renderer draws each one with its own tile set.
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

export type TerrainKind = 'water' | 'grassIsland' | 'sandIsland';

const TERRAIN_BY_CHARACTER: Readonly<Record<string, TerrainKind>> = {
  [WATER_TILE]: 'water',
  [GRASS_ISLAND_TILE]: 'grassIsland',
  [SAND_ISLAND_TILE]: 'sandIsland',
};

/** Terrain of a tile character, or null when the character is not part of the format. */
export function terrainKindOf(character: string): TerrainKind | null {
  return TERRAIN_BY_CHARACTER[character] ?? null;
}

export function isLand(kind: TerrainKind): boolean {
  return kind !== 'water';
}
