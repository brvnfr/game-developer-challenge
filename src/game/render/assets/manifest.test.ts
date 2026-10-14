import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHIP_FRAMES, TILE_FRAMES, UI_FRAMES } from './atlasFrames.generated';
import { atlasFile, createGameBundle, GAME_ATLASES, GAME_TEXTURES, pickAtlasResolution, type AtlasResolution, type GameAtlas } from './manifest';

const publicDir = join(process.cwd(), 'public', 'assets', 'game');

interface AtlasJson {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { image: string; size: { w: number; h: number }; scale: string };
}
const readAtlas = (atlas: GameAtlas, res: AtlasResolution) =>
  JSON.parse(readFileSync(join(publicDir, atlasFile(atlas, res)), 'utf8')) as AtlasJson;

const expectedFrames: Record<GameAtlas, readonly string[]> = { ships: SHIP_FRAMES, tiles: TILE_FRAMES, ui: UI_FRAMES };

describe('game asset manifest', () => {
  it.each(GAME_ATLASES.flatMap((atlas) => ([1, 2] as const).map((res) => [atlas, res] as const)))(
    '%s @%dx contains exactly the typed frame names and every frame fits the image',
    (atlas, res) => {
      const json = readAtlas(atlas, res);
      expect(Object.keys(json.frames).sort()).toEqual([...expectedFrames[atlas]].sort());
      for (const { frame } of Object.values(json.frames)) {
        expect(frame.x + frame.w).toBeLessThanOrEqual(json.meta.size.w);
        expect(frame.y + frame.h).toBeLessThanOrEqual(json.meta.size.h);
      }
    },
  );

  it.each(GAME_TEXTURES)('ships the %s texture as a square power-of-two PNG (it repeats on the GPU)', (texture) => {
    const bytes = readFileSync(join(publicDir, `${texture}.png`));
    const width = bytes.readUInt32BE(16);
    expect(bytes.readUInt32BE(20)).toBe(width);
    expect(Math.log2(width) % 1).toBe(0);
  });

  it('uses the 1× ships atlas for every resolution (no retina variant exists)', () => {
    expect(atlasFile('ships', 2)).toBe('ships.json');
  });

  it('picks the 2× atlas only on high-density screens', () => {
    expect(pickAtlasResolution(1)).toBe(1);
    expect(pickAtlasResolution(1.25)).toBe(1);
    expect(pickAtlasResolution(2)).toBe(2);
    expect(pickAtlasResolution(3)).toBe(2);
  });

  it('builds a bundle with one asset per atlas under the base URL', () => {
    const bundle = createGameBundle('/', 2);
    expect(bundle.assets).toEqual([
      { alias: 'ships', src: '/assets/game/ships.json' },
      { alias: 'tiles', src: '/assets/game/tiles@2x.json' },
      { alias: 'ui', src: '/assets/game/ui@2x.json' },
      { alias: 'water', src: '/assets/game/water.png' },
    ]);
  });
});
