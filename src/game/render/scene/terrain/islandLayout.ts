import type { Arena } from '@/game/sim/arena/Arena';
import type { TerrainKind } from '@/game/sim/arena/ArenaDefinition';

export type IslandKind = Extract<TerrainKind, 'grassIsland' | 'sandIsland'>;

/** One island of the arena: a rectangle of tiles of a single kind. */
export interface IslandArea {
  readonly kind: IslandKind;
  readonly column: number;
  readonly row: number;
  readonly columns: number;
  readonly rows: number;
}

export interface GridCell {
  readonly column: number;
  readonly row: number;
}

/** Smallest island the nine-slice art can draw: its corners are one tile each. */
export const MIN_ISLAND_TILES = 2;

const isIslandKind = (kind: TerrainKind): kind is IslandKind => kind === 'grassIsland' || kind === 'sandIsland';

/** Tiles of one connected island (sides and corners count, so touching islands are reported together). */
function floodIsland(arena: Arena, start: GridCell, visited: Set<string>): GridCell[] {
  const cells: GridCell[] = [];
  const pending: GridCell[] = [start];
  visited.add(`${start.column},${start.row}`);
  for (let cell = pending.pop(); cell; cell = pending.pop()) {
    cells.push(cell);
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
        const next = { column: cell.column + columnOffset, row: cell.row + rowOffset };
        const key = `${next.column},${next.row}`;
        if (visited.has(key) || !isIslandKind(arena.terrainAt(next.column, next.row))) continue;
        visited.add(key);
        pending.push(next);
      }
    }
  }
  return cells;
}

/**
 * Reads the islands of an arena. Islands are drawn by stretching the sheet's complete island art (a nine-slice),
 * which only fits rectangles; a part that is not a rectangle of one kind, at least 2 × 2 tiles, is reported in
 * `problems` (unit tests keep the shipped arenas free of them) and still returned as its bounding rectangle.
 */
export function readIslands(arena: Arena): { readonly islands: IslandArea[]; readonly problems: string[] } {
  const visited = new Set<string>();
  const islands: IslandArea[] = [];
  const problems: string[] = [];
  for (let row = 0; row < arena.rows; row++) {
    for (let column = 0; column < arena.columns; column++) {
      const kind = arena.terrainAt(column, row);
      if (!isIslandKind(kind) || visited.has(`${column},${row}`)) continue;
      const cells = floodIsland(arena, { column, row }, visited);
      const minColumn = Math.min(...cells.map((cell) => cell.column));
      const maxColumn = Math.max(...cells.map((cell) => cell.column));
      const minRow = Math.min(...cells.map((cell) => cell.row));
      const maxRow = Math.max(...cells.map((cell) => cell.row));
      const island: IslandArea = {
        kind,
        column: minColumn,
        row: minRow,
        columns: maxColumn - minColumn + 1,
        rows: maxRow - minRow + 1,
      };
      const where = `island at column ${minColumn}, row ${minRow}`;
      if (cells.length !== island.columns * island.rows) problems.push(`${where} is not a rectangle`);
      if (cells.some((cell) => arena.terrainAt(cell.column, cell.row) !== kind)) {
        problems.push(`${where} mixes grass and sand`);
      }
      if (island.columns < MIN_ISLAND_TILES || island.rows < MIN_ISLAND_TILES) {
        problems.push(`${where} is thinner than ${MIN_ISLAND_TILES} tiles`);
      }
      islands.push(island);
    }
  }
  return { islands, problems };
}

/** Reef rocks of an arena. */
export function readRocks(arena: Arena): GridCell[] {
  const rocks: GridCell[] = [];
  for (let row = 0; row < arena.rows; row++) {
    for (let column = 0; column < arena.columns; column++) {
      if (arena.terrainAt(column, row) === 'rock') rocks.push({ column, row });
    }
  }
  return rocks;
}
