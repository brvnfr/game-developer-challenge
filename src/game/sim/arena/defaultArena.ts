import type { ArenaDefinition } from './ArenaDefinition';

/**
 * "Archipelago": 30 × 17 tiles of 64 px = 1920 × 1088 px, laid out as a small story rather than at random:
 * - Fort Island (north-east), the largest, walled, its gate facing the open water where the fights happen;
 * - Palm Island (west), the player's home waters: the player starts just off its south-east beach;
 * - Ruins Island in the middle, the remains of an older fort;
 * - Jungle Island (south-west) and Turtle Island (south-east), wooded;
 * - two sandbars, one holding a ship that ran aground on the reef rocks beside it.
 * Rules kept by this layout (checked by unit tests):
 * - every island is a rectangle of one kind, at least 2 × 2 tiles (islands are drawn from the sheet's whole
 *   island art, which only joins seamlessly in its own arrangement);
 * - channels between islands are at least three tiles wide, and rocks keep at least two tiles of open water
 *   around them (the longest ship is 1.7 tiles long);
 * - the right half stays open for spawns and fights.
 */
export const DEFAULT_ARENA: ArenaDefinition = {
  id: 'archipelago',
  tileSize: 64,
  tiles: [
    '..............................',
    '...........sss......#######...',
    '.#####.....sss......#######...',
    '.#####..............#######...',
    '.#####...........r..#######...',
    '.#####..r...........#######...',
    '..............................',
    '............#####.............',
    '............#####.............',
    '............#####.............',
    '............#####.............',
    '.....................#####....',
    '..######.............#####....',
    '..######.............#####....',
    '..######....sss..r...#####....',
    '............sss...............',
    '..............................',
  ],
  playerStart: { column: 7.5, row: 8.5 },
  playerStartHeading: 0,
};
