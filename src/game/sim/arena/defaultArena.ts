import type { ArenaDefinition } from './ArenaDefinition';

/**
 * "Archipelago": 30 × 17 tiles of 64 px = 1920 × 1088 px. Five grass islands (one with a fort) and two sand
 * islets; shores turn inwards only on the larger islands, where the grass keeps a wide interior.
 * Rules kept by this layout (checked by unit tests):
 * - channels between islands are at least three tiles wide (one tile wider than the longest ship);
 * - every island is at least two tiles thick and each shore piece has art in the tile sets (see `autotile.ts`);
 * - grass islands and sand islets never touch, so each keeps its own shore;
 * - the player starts in open water on the left, with the right half kept open for spawns and fights.
 */
export const DEFAULT_ARENA: ArenaDefinition = {
  id: 'archipelago',
  tileSize: 64,
  tiles: [
    '..............................',
    '.######....sss......#######...',
    '.######....sss......#######...',
    '.######.............#######...',
    '.###................#######...',
    '.###................#######...',
    '..............................',
    '............#####.............',
    '............#####.............',
    '............#####.............',
    '............#####.............',
    '......................######..',
    '..#####.............########..',
    '..#####.............########..',
    '..#####...sss.......######....',
    '..#####...sss........#####....',
    '..............................',
  ],
  playerStart: { column: 7.5, row: 8.5 },
  playerStartHeading: 0,
};
