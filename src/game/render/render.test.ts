import { describe, expect, it } from 'vitest';
import { DEFAULT_ARENA } from '@/game/sim/arena/defaultArena';
import { SHIP_FRAMES, TILE_FRAMES } from './assets/atlasFrames.generated';
import { islandTileFor } from './scene/islandTiles';
import { damageStageFor, shipFrameFor, WRECK_STAGE } from './spriteCatalog';
import { Viewport } from './Viewport';

describe('ship damage stages', () => {
  it.each([
    [1, false, 0],
    [0.67, false, 0],
    [0.66, false, 1],
    [0.34, false, 1],
    [0.33, false, 2],
    [0.01, false, 2],
    [0, false, WRECK_STAGE],
    [0.5, true, WRECK_STAGE],
  ] as const)('health ratio %f (destroyed: %s) shows stage %i', (ratio, isDestroyed, stage) => {
    expect(damageStageFor(ratio, isDestroyed)).toBe(stage);
  });

  it('maps every kind and stage to an existing ship frame, with distinct colours per kind', () => {
    for (const kind of ['player', 'chaser', 'shooter'] as const) {
      for (const stage of [0, 1, 2, 3] as const) expect(SHIP_FRAMES).toContain(shipFrameFor(kind, stage));
    }
    expect(new Set([shipFrameFor('player', 0), shipFrameFor('chaser', 0), shipFrameFor('shooter', 0)]).size).toBe(3);
  });
});

describe('island autotiling', () => {
  it('uses corner tiles where two coasts meet', () => {
    expect(islandTileFor({ north: false, west: false, south: true, east: true }, 0, 0)).toBe('tile_6');
    expect(islandTileFor({ north: true, west: true, south: false, east: false }, 0, 0)).toBe('tile_57');
  });

  it('only picks existing tiles for every land tile of the default arena', () => {
    const rows = DEFAULT_ARENA.tiles;
    const isLand = (column: number, row: number) => rows[row]?.charAt(column) === '#';
    rows.forEach((rowTiles, row) => {
      for (let column = 0; column < rowTiles.length; column++) {
        if (!isLand(column, row)) continue;
        const neighbours = {
          north: isLand(column, row - 1),
          south: isLand(column, row + 1),
          east: isLand(column + 1, row),
          west: isLand(column - 1, row),
        };
        expect(TILE_FRAMES).toContain(islandTileFor(neighbours, column, row));
      }
    });
  });

  it('has no land part thinner than two tiles in the default arena', () => {
    const rows = DEFAULT_ARENA.tiles;
    const isLand = (column: number, row: number) => rows[row]?.charAt(column) === '#';
    rows.forEach((rowTiles, row) => {
      for (let column = 0; column < rowTiles.length; column++) {
        if (!isLand(column, row)) continue;
        expect(isLand(column, row - 1) || isLand(column, row + 1)).toBe(true);
        expect(isLand(column - 1, row) || isLand(column + 1, row)).toBe(true);
      }
    });
  });
});

describe('Viewport', () => {
  it('fits the world with letterbox bars and preserves its aspect ratio', () => {
    const viewport = new Viewport(1920, 1088);
    expect(viewport.fit(960, 544)).toEqual({ scale: 0.5, offsetX: 0, offsetY: 0 });
    const wide = viewport.fit(2400, 1088);
    expect(wide.scale).toBe(1);
    expect(wide.offsetX).toBe(240);
    const tall = viewport.fit(960, 1000);
    expect(tall.scale).toBe(0.5);
    expect(tall.offsetY).toBe(228);
  });

  it('converts between screen and world coordinates', () => {
    const viewport = new Viewport(1920, 1088);
    viewport.fit(2400, 1088);
    const world = viewport.screenToWorld(240 + 100, 50);
    expect(world.x).toBeCloseTo(100);
    expect(viewport.worldToScreen(world).x).toBeCloseTo(340);
  });

  it('caps the render resolution', () => {
    expect(Viewport.renderResolutionFor(3)).toBe(2);
    expect(Viewport.renderResolutionFor(0.5)).toBe(1);
  });
});
