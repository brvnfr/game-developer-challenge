import type { ArenaDefinition } from './ArenaDefinition';

/**
 * "Archipelago": 30 × 17 tiles of 64 px = 1920 × 1088 px, laid out as a small story rather than at random:
 * - Fort Island (north-east), the largest, walled, its gate facing the open water where the fights happen;
 * - Palm Island (north-west), the player's home waters: the player starts south-east of it;
 * - Ruins Island in the middle, the remains of an older fort;
 * - Turtle Island (south-east), wooded, and a sandbar (south-west) with a ship that ran aground on it;
 * - two lone reef rocks.
 * Rules kept by this layout (checked by unit tests):
 * - every island is a rectangle of one kind, at least 2 × 2 tiles (islands are drawn from the sheet's whole
 *   island art, which only joins seamlessly in its own arrangement);
 * - channels between islands are at least three tiles wide, rocks keep at least two tiles of open water
 *   around them, and islands keep at least two tiles from the arena's edges, so no corner or strip of water is
 *   a dead end for a ship being chased (the longest ship is 1.7 tiles long and turns within about one tile);
 * - the right half stays open for spawns and fights.
 */
export const DEFAULT_ARENA: ArenaDefinition = {
  id: 'archipelago',
  tileSize: 64,
  tiles: [
    '..............................',
    '..............................',
    '...#####............#######...',
    '...#####...r........#######...',
    '...#####............#######...',
    '...#####............#######...',
    '....................#######...',
    '............#####.............',
    '............#####.............',
    '............#####.............',
    '............#####...#####.....',
    '.....sss............#####.....',
    '.....sss............#####.....',
    '...............r....#####.....',
    '..............................',
    '..............................',
    '..............................',
  ],
  playerStart: { column: 7.5, row: 8.5 },
  playerStartHeading: 0,
};
