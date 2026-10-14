import { describe, expect, it } from 'vitest';
import { Arena } from '@/game/sim/arena/Arena';
import { DEFAULT_ARENA } from '@/game/sim/arena/defaultArena';
import { TILE_FRAMES } from '../../assets/atlasFrames.generated';
import { ARENA_DECOR } from './arenaDecor';
import {
  findConnectedParts,
  findUnrenderableCells,
  growRegion,
  shapeOf,
  TILE_SHAPES,
  type RegionTest,
} from './autotile';
import { GRASS_ISLAND_TILES, SAND_ISLAND_TILES, SHALLOW_WATER_TILES, tileFrameFor } from './tileSets';

/** Region from a small character map: "x" is inside. */
function region(map: readonly string[]): RegionTest {
  return (column, row) => map[row]?.charAt(column) === 'x';
}

describe('shore autotiling', () => {
  const lShape = region(['......', '.xxxx.', '.xxxx.', '.xxxx.', '.xx...', '.xx...', '......']);

  it('picks outer corners, straight shores and the centre', () => {
    expect(shapeOf(lShape, 1, 1)).toBe('northWest');
    expect(shapeOf(lShape, 2, 1)).toBe('north');
    expect(shapeOf(lShape, 4, 1)).toBe('northEast');
    expect(shapeOf(lShape, 1, 2)).toBe('west');
    expect(shapeOf(lShape, 4, 3)).toBe('southEast');
    expect(shapeOf(lShape, 2, 5)).toBe('southEast');
    expect(shapeOf(lShape, 1, 5)).toBe('southWest');
  });

  it('uses an inner corner where the coast turns inwards', () => {
    expect(shapeOf(lShape, 2, 3)).toBe('innerSouthEast');
    expect(shapeOf(region(['xxx', 'xxx', 'xx.']), 1, 1)).toBe('innerSouthEast');
    expect(shapeOf(region(['.xx', 'xxx', 'xxx']), 1, 1)).toBe('innerNorthWest');
    expect(shapeOf(region(['xxx', 'xxx', 'xxx']), 1, 1)).toBe('centre');
  });

  it('reports shapes without art: one-tile strips and two inner corners in one tile', () => {
    const strip = region(['xxxx']);
    expect(shapeOf(strip, 1, 0)).toBeNull();
    expect(shapeOf(region(['.x.', 'xxx', 'xxx']), 1, 1)).toBeNull();
    expect(findUnrenderableCells(4, 1, strip)).toHaveLength(4);
    expect(findUnrenderableCells(6, 7, lShape)).toEqual([]);
  });

  it('grows a region by one tile around it, diagonals included', () => {
    const grown = growRegion(region(['...', '.x.', '...']), 3, 3);
    expect(grown(0, 0)).toBe(true);
    expect(grown(2, 2)).toBe(true);
    expect(grown(3, 1)).toBe(false);
  });

  it('splits a region into parts touching by a side or a corner', () => {
    const parts = findConnectedParts(6, 3, region(['xx..x.', 'x....x', '...x..']));
    expect(parts.map((part) => part.length).sort()).toEqual([1, 2, 3]);
  });
});

describe('tile sets', () => {
  it.each([
    ['grass island', GRASS_ISLAND_TILES],
    ['sand islet', SAND_ISLAND_TILES],
    ['shallow water', SHALLOW_WATER_TILES],
  ] as const)('%s has existing art for every shape and position', (_name, art) => {
    for (const shape of TILE_SHAPES) {
      for (const [column, row] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, -1],
      ] as const) {
        expect(TILE_FRAMES).toContain(tileFrameFor(art, shape, column, row));
      }
    }
  });

  it('alternates the grass variants in the 2 × 2 pattern of the tile sheet', () => {
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'centre', 1, 1)).toBe('tile_23');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'centre', 2, 1)).toBe('tile_24');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'centre', 1, 2)).toBe('tile_39');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'centre', 2, 2)).toBe('tile_40');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'north', 1, 5)).toBe('tile_7');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'north', 2, 5)).toBe('tile_8');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'west', 0, 3)).toBe('tile_22');
    expect(tileFrameFor(GRASS_ISLAND_TILES, 'west', 0, 4)).toBe('tile_38');
  });
});

describe('default arena layout', () => {
  const arena = new Arena(DEFAULT_ARENA);
  const isLand: RegionTest = (column, row) => arena.isLandTile(column, row);
  const isGrass: RegionTest = (column, row) => arena.terrainAt(column, row) === 'grassIsland';
  const isSand: RegionTest = (column, row) => arena.terrainAt(column, row) === 'sandIsland';

  it('can draw every island and the shallows around them', () => {
    expect(findUnrenderableCells(arena.columns, arena.rows, isGrass)).toEqual([]);
    expect(findUnrenderableCells(arena.columns, arena.rows, isSand)).toEqual([]);
    expect(findUnrenderableCells(arena.columns, arena.rows, growRegion(isLand, arena.columns, arena.rows))).toEqual([]);
  });

  it('never lets a grass island touch a sand islet', () => {
    for (let row = 0; row < arena.rows; row++) {
      for (let column = 0; column < arena.columns; column++) {
        if (!isGrass(column, row)) continue;
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            expect(isSand(column + columnOffset, row + rowOffset)).toBe(false);
          }
        }
      }
    }
  });

  it('keeps channels between islands at least three tiles wide', () => {
    const islandOf = new Map<string, number>();
    const key = (column: number, row: number) => `${column},${row}`;
    let islandCount = 0;
    for (let row = 0; row < arena.rows; row++) {
      for (let column = 0; column < arena.columns; column++) {
        if (!isLand(column, row) || islandOf.has(key(column, row))) continue;
        const pending = [[column, row] as const];
        islandOf.set(key(column, row), islandCount);
        while (pending.length > 0) {
          const [currentColumn, currentRow] = pending.pop() ?? [0, 0];
          for (const [columnOffset, rowOffset] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const next = [currentColumn + columnOffset, currentRow + rowOffset] as const;
            if (isLand(...next) && !islandOf.has(key(...next))) {
              islandOf.set(key(...next), islandCount);
              pending.push(next);
            }
          }
        }
        islandCount++;
      }
    }
    expect(islandCount).toBe(7);
    const cells = [...islandOf.entries()].map(([position, island]) => {
      const [column = 0, row = 0] = position.split(',').map(Number);
      return { column, row, island };
    });
    for (const first of cells) {
      for (const second of cells) {
        if (first.island === second.island) continue;
        const gap = Math.max(Math.abs(first.column - second.column), Math.abs(first.row - second.row)) - 1;
        expect(gap).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('places every prop on an island, with existing art', () => {
    const decorations = ARENA_DECOR[DEFAULT_ARENA.id] ?? [];
    expect(decorations.length).toBeGreaterThan(10);
    for (const decoration of decorations) {
      expect(TILE_FRAMES).toContain(decoration.frame);
      expect(isLand(Math.floor(decoration.x), Math.floor(decoration.y))).toBe(true);
    }
  });
});
