import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { Arena } from './Arena';
import type { ArenaDefinition } from './ArenaDefinition';
import { DEFAULT_ARENA } from './defaultArena';

const TINY_ARENA: ArenaDefinition = {
  id: 'tiny',
  tileSize: 10,
  tiles: ['.....', '.##..', '.##..', '.....'],
  playerStart: { column: 4.5, row: 0.5 },
  playerStartHeading: 0,
};

describe('Arena', () => {
  it('merges land tiles into rectangular colliders', () => {
    const arena = new Arena(TINY_ARENA);
    expect(arena.width).toBe(50);
    expect(arena.height).toBe(40);
    expect(arena.islandColliders).toEqual([{ minX: 10, minY: 10, maxX: 30, maxY: 30 }]);
  });

  it('builds colliders that cover exactly the land tiles of the default arena', () => {
    const arena = new Arena(DEFAULT_ARENA);
    const landTileCount = DEFAULT_ARENA.tiles
      .join('')
      .split('')
      .filter((tile) => tile === '#' || tile === 's').length;
    const rockCount = DEFAULT_ARENA.tiles.join('').split('r').length - 1;
    const rockSide = 64 * (1 - 2 * 0.18);
    const colliderArea = arena.islandColliders.reduce(
      (area, box) => area + (box.maxX - box.minX) * (box.maxY - box.minY),
      0,
    );
    expect(colliderArea).toBeCloseTo(landTileCount * 64 * 64 + rockCount * rockSide * rockSide);
    for (let row = 0; row < arena.rows; row++) {
      for (let column = 0; column < arena.columns; column++) {
        const tileCenter = new Vector2((column + 0.5) * 64, (row + 0.5) * 64);
        const isInsideCollider = arena.islandColliders.some(
          (box) =>
            tileCenter.x > box.minX && tileCenter.x < box.maxX && tileCenter.y > box.minY && tileCenter.y < box.maxY,
        );
        expect(isInsideCollider).toBe(arena.isLandTile(column, row));
      }
    }
  });

  it('treats grass islands and sand islets as land and reports their terrain', () => {
    const arena = new Arena({ ...TINY_ARENA, tiles: ['.....', '.##ss', '.##ss', '.....'] });
    expect(arena.isLandTile(1, 1)).toBe(true);
    expect(arena.isLandTile(4, 2)).toBe(true);
    expect(arena.terrainAt(1, 1)).toBe('grassIsland');
    expect(arena.terrainAt(3, 1)).toBe('sandIsland');
    expect(arena.terrainAt(0, 0)).toBe('water');
    expect(arena.terrainAt(-1, 99)).toBe('water');
  });

  it('gives a reef rock a collider smaller than its tile', () => {
    const arena = new Arena({ ...TINY_ARENA, tileSize: 100, tiles: ['.....', '..r..', '.....'] });
    expect(arena.terrainAt(2, 1)).toBe('rock');
    expect(arena.isLandTile(2, 1)).toBe(true);
    expect(arena.islandColliders).toEqual([{ minX: 218, minY: 118, maxX: 282, maxY: 182 }]);
    expect(arena.isCircleBlocked(new Vector2(205, 150), 10)).toBe(false); // inside the tile, beside the rock
    expect(arena.isCircleBlocked(new Vector2(250, 150), 10)).toBe(true);
  });

  it('rejects malformed definitions', () => {
    expect(() => new Arena({ ...TINY_ARENA, tiles: ['...', '..'] })).toThrow();
    expect(() => new Arena({ ...TINY_ARENA, tiles: ['.x.'] })).toThrow();
    expect(() => new Arena({ ...TINY_ARENA, tiles: [] })).toThrow();
  });

  it('reports circles blocked by land or by the arena edge', () => {
    const arena = new Arena(TINY_ARENA);
    expect(arena.isCircleBlocked(new Vector2(20, 20), 2)).toBe(true);
    expect(arena.isCircleBlocked(new Vector2(45, 35), 3)).toBe(false);
    expect(arena.isCircleBlocked(new Vector2(2, 20), 3)).toBe(true);
  });

  it('pushes a circle out of an island and back inside the bounds', () => {
    const arena = new Arena(TINY_ARENA);
    const fromIsland = arena.resolveCircle(new Vector2(33, 20), 5);
    expect(fromIsland.touchedIsland).toBe(true);
    expect(fromIsland.position.x).toBeCloseTo(35);
    expect(arena.isCircleBlocked(fromIsland.position, 5 - 1e-6)).toBe(false);
    const fromOutside = arena.resolveCircle(new Vector2(-10, 38), 3);
    expect(fromOutside.touchedBounds).toBe(true);
    expect(fromOutside.position).toEqual(new Vector2(3, 37));
  });

  it('measures free distance against land and bounds', () => {
    const arena = new Arena(TINY_ARENA);
    expect(arena.measureClearance(new Vector2(5, 20), 0, 100)).toBeCloseTo(5);
    expect(arena.measureClearance(new Vector2(45, 35), Math.PI / 2, 100)).toBeCloseTo(5);
    expect(arena.measureClearance(new Vector2(45, 5), Math.PI, 20)).toBeCloseTo(20);
  });

  it('computes line of sight across islands', () => {
    const arena = new Arena(TINY_ARENA);
    expect(arena.hasLineOfSight(new Vector2(5, 20), new Vector2(45, 20))).toBe(false);
    expect(arena.hasLineOfSight(new Vector2(5, 5), new Vector2(45, 5))).toBe(true);
  });

  it('starts the player on open water, away from islands', () => {
    const arena = new Arena(DEFAULT_ARENA);
    expect(arena.isCircleBlocked(arena.playerStart, 40)).toBe(false);
  });
});
