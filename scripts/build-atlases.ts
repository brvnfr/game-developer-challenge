/**
 * Builds the PixiJS texture atlases used by the game from the source files in `assets/`.
 *
 *   npm run assets
 *
 * Outputs (committed, so a clean checkout does not need to run this script):
 *   public/assets/game/ships.json + ships.png         ← assets/spritesheet/ships_miscellaneous_sheet.{xml,png}
 *   public/assets/game/tiles@1x.json + tiles@1x.png   ← assets/tilesheet/tiles_sheet.png (64×64 grid)
 *   public/assets/game/tiles@2x.json + tiles@2x.png   ← assets/tilesheet/tiles_sheet_retina.png (128×128 grid)
 *   public/assets/game/ui@1x.json / ui@2x.json (+png) ← assets/spritesheet/ui_sheet(_retina).json
 *   src/game/render/assets/atlasFrames.generated.ts   ← typed frame names
 *
 * Notes:
 * - The ships "retina" XML/PNG pair has the same pixel size as the default one, so a single 1× atlas is produced.
 * - Ships XML is a Starling/Sparrow `TextureAtlas`; it is converted to the PixiJS JSON hash format.
 * - Tile numbering is row-major (tile_1 is top-left); verified against assets/png/default/tiles.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p: string[]) => join(root, 'assets', ...p);
const outDir = join(root, 'public', 'assets', 'game');
const generatedTs = join(root, 'src', 'game', 'render', 'assets', 'atlasFrames.generated.ts');

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface PixiFrame {
  frame: Rect;
  rotated: false;
  trimmed: false;
  spriteSourceSize: Rect;
  sourceSize: { w: number; h: number };
  anchor?: { x: number; y: number };
  borders?: { left: number; top: number; right: number; bottom: number };
}
interface PixiAtlas {
  frames: Record<string, PixiFrame>;
  meta: { app: string; image: string; format: 'RGBA8888'; size: { w: number; h: number }; scale: string };
}

function pngSize(file: string): { w: number; h: number } {
  const buf = readFileSync(file);
  // PNG signature (8 bytes) + IHDR length/type (8 bytes) → width/height at offsets 16 and 20.
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error(`${file} is not a PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function frame(x: number, y: number, w: number, h: number): PixiFrame {
  return {
    frame: { x, y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
  };
}

function writeAtlas(name: string, image: string, imageSrc: string, frames: Record<string, PixiFrame>, scale: number) {
  copyFileSync(imageSrc, join(outDir, image));
  const atlas: PixiAtlas = {
    frames,
    meta: {
      app: 'pirate-battle/scripts/build-atlases.ts',
      image,
      format: 'RGBA8888',
      size: pngSize(imageSrc),
      scale: String(scale),
    },
  };
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(atlas, null, 1)}\n`);
  return Object.keys(frames);
}

function buildShips(): string[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const xml = parser.parse(readFileSync(src('spritesheet', 'ships_miscellaneous_sheet.xml'), 'utf8')) as {
    TextureAtlas: { SubTexture: { name: string; x: string; y: string; width: string; height: string }[] };
  };
  const frames: Record<string, PixiFrame> = {};
  for (const sub of xml.TextureAtlas.SubTexture) {
    frames[sub.name.replace(/\.png$/, '')] = frame(Number(sub.x), Number(sub.y), Number(sub.width), Number(sub.height));
  }
  return writeAtlas('ships', 'ships.png', src('spritesheet', 'ships_miscellaneous_sheet.png'), frames, 1);
}

function buildTiles(file: string, name: string, tileSize: number, scale: number): string[] {
  const size = pngSize(src('tilesheet', file));
  const cols = size.w / tileSize;
  const rows = size.h / tileSize;
  const frames: Record<string, PixiFrame> = {};
  for (let i = 0; i < cols * rows; i++) {
    frames[`tile_${i + 1}`] = frame((i % cols) * tileSize, Math.floor(i / cols) * tileSize, tileSize, tileSize);
  }
  return writeAtlas(name, `${name}.png`, src('tilesheet', file), frames, scale);
}

function buildUi(file: string, name: string, scale: number): string[] {
  const json = JSON.parse(readFileSync(src('spritesheet', file), 'utf8')) as {
    frames: Record<string, PixiFrame & { ui?: unknown }>;
    meta: { image: string };
  };
  const frames: Record<string, PixiFrame> = {};
  for (const [key, value] of Object.entries(json.frames)) {
    const { ui: _ui, ...rest } = value;
    frames[key] = rest;
  }
  return writeAtlas(name, `${name}.png`, src('spritesheet', json.meta.image), frames, scale);
}

function union(name: string, keys: string[]): string {
  const sorted = [...keys].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return `export const ${name} = [\n${sorted.map((k) => `  '${k}',`).join('\n')}\n] as const;\n`;
}

mkdirSync(outDir, { recursive: true });
const ships = buildShips();
const tiles1 = buildTiles('tiles_sheet.png', 'tiles@1x', 64, 1);
const tiles2 = buildTiles('tiles_sheet_retina.png', 'tiles@2x', 128, 2);
const ui1 = buildUi('ui_sheet.json', 'ui@1x', 1);
const ui2 = buildUi('ui_sheet_retina.json', 'ui@2x', 2);
if (tiles1.length !== tiles2.length || ui1.length !== ui2.length) throw new Error('1× and 2× atlases differ');

writeFileSync(
  generatedTs,
  [
    '// AUTO-GENERATED by scripts/build-atlases.ts — do not edit by hand. Run `npm run assets`.\n',
    union('SHIP_FRAMES', ships),
    union('TILE_FRAMES', tiles1),
    union('UI_FRAMES', ui1),
    'export type ShipFrame = (typeof SHIP_FRAMES)[number];',
    'export type TileFrame = (typeof TILE_FRAMES)[number];',
    'export type UiFrame = (typeof UI_FRAMES)[number];\n',
  ].join('\n'),
);
console.info(`Atlases written: ships(${ships.length}) tiles(${tiles1.length}) ui(${ui1.length})`);
