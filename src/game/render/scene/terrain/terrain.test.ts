import { describe, expect, it } from 'vitest';
import { Arena } from '@/game/sim/arena/Arena';
import type { ArenaDefinition } from '@/game/sim/arena/ArenaDefinition';
import { DEFAULT_ARENA } from '@/game/sim/arena/defaultArena';
import { SHIP_FRAMES, TILE_FRAMES } from '../../assets/atlasFrames.generated';
import { ARENA_DECOR } from './arenaDecor';
import { readIslands, readRocks, type IslandArea } from './islandLayout';

function arenaOf(tiles: readonly string[]): Arena {
  const definition: ArenaDefinition = {
    id: 'test',
    tileSize: 64,
    tiles,
    playerStart: { column: 0.5, row: 0.5 },
    playerStartHeading: 0,
  };
  return new Arena(definition);
}

describe('island layout', () => {
  it('reads each island as a rectangle of one kind, and the reef rocks', () => {
    const { islands, problems } = readIslands(arenaOf(['.......', '.###.ss', '.###.ss', '...r...']));
    expect(problems).toEqual([]);
    expect(islands).toEqual([
      { kind: 'grassIsland', column: 1, row: 1, columns: 3, rows: 2 },
      { kind: 'sandIsland', column: 5, row: 1, columns: 2, rows: 2 },
    ]);
    expect(readRocks(arenaOf(['.......', '...r...']))).toEqual([{ column: 3, row: 1 }]);
  });

  it('reports islands the nine-slice art cannot draw', () => {
    expect(readIslands(arenaOf(['....', '.##.', '.#..'])).problems).toEqual([
      'island at column 1, row 1 is not a rectangle',
    ]);
    expect(readIslands(arenaOf(['##ss', '##ss'])).problems).toEqual(['island at column 0, row 0 mixes grass and sand']);
    expect(readIslands(arenaOf(['###'])).problems).toEqual(['island at column 0, row 0 is thinner than 2 tiles']);
  });
});

describe('default arena layout', () => {
  const arena = new Arena(DEFAULT_ARENA);
  const { islands, problems } = readIslands(arena);
  const rocks = readRocks(arena);

  it('can draw every island (rectangles of one kind, at least 2 × 2)', () => {
    expect(problems).toEqual([]);
    expect(islands).toHaveLength(5);
    expect(rocks.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps channels of at least three tiles between islands and two around rocks', () => {
    const cellsOf = (island: IslandArea) =>
      Array.from({ length: island.columns * island.rows }, (_, index) => ({
        column: island.column + (index % island.columns),
        row: island.row + Math.floor(index / island.columns),
      }));
    const obstacles = [
      ...islands.map((island) => ({ cells: cellsOf(island), minimumGap: 3 })),
      ...rocks.map((rock) => ({ cells: [rock], minimumGap: 2 })),
    ];
    obstacles.forEach((first, firstIndex) => {
      obstacles.slice(firstIndex + 1).forEach((second) => {
        const required = Math.min(first.minimumGap, second.minimumGap);
        for (const a of first.cells) {
          for (const b of second.cells) {
            const gap = Math.max(Math.abs(a.column - b.column), Math.abs(a.row - b.row)) - 1;
            expect(gap).toBeGreaterThanOrEqual(required);
          }
        }
      });
    });
  });

  it('keeps every island two tiles or more from the edges, so no strip of water is a dead end', () => {
    for (const island of islands) {
      expect(island.column).toBeGreaterThanOrEqual(2);
      expect(island.row).toBeGreaterThanOrEqual(2);
      expect(arena.columns - (island.column + island.columns)).toBeGreaterThanOrEqual(2);
      expect(arena.rows - (island.row + island.rows)).toBeGreaterThanOrEqual(2);
    }
  });

  it('starts the player in open water', () => {
    const { column, row } = DEFAULT_ARENA.playerStart;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
        expect(arena.isLandTile(Math.floor(column) + columnOffset, Math.floor(row) + rowOffset)).toBe(false);
      }
    }
  });

  it('places every prop on an island (only floating planks may sit on the water), with existing art', () => {
    const decorations = ARENA_DECOR[DEFAULT_ARENA.id] ?? [];
    expect(decorations.length).toBeGreaterThan(30);
    for (const decoration of decorations) {
      const frames: readonly string[] = decoration.atlas === 'tiles' ? TILE_FRAMES : SHIP_FRAMES;
      expect(frames).toContain(decoration.frame);
      const island = islands.find(
        (candidate) =>
          decoration.x > candidate.column &&
          decoration.x < candidate.column + candidate.columns &&
          decoration.y > candidate.row &&
          decoration.y < candidate.row + candidate.rows,
      );
      const isFloatingPlank = decoration.frame.startsWith('wood_');
      expect(island ?? isFloatingPlank, `${decoration.frame} at ${decoration.x}, ${decoration.y}`).toBeTruthy();
    }
  });
});
