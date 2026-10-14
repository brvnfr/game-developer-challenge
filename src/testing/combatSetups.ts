import type { MatchSetup } from '@/game/sim/match/MatchSetup';

const EAST = 0;
const WEST = Math.PI;

/**
 * Named starting layouts for reproducible combat tests (`?test=1&setup=<name>`). The east of the arena
 * (x 1088–1920, y 384–768) is open water, so shots and ships there never meet an island.
 */
export const COMBAT_SETUPS = {
  /** The player alone in open water, facing east. */
  'open-water': { player: { x: 1150, y: 560, heading: EAST } },
  /** A Chaser 450 px straight ahead, coming at the player. */
  'chaser-ahead': {
    player: { x: 1150, y: 560, heading: EAST },
    enemies: [{ kind: 'chaser', x: 1600, y: 560, heading: WEST }],
  },
  /** A Shooter beyond its attack range (≈ 675 px away), north-east of the player. */
  'shooter-far': {
    player: { x: 1150, y: 600, heading: EAST },
    enemies: [{ kind: 'shooter', x: 1800, y: 420, heading: WEST }],
  },
} as const satisfies Record<string, MatchSetup>;

export type CombatSetupName = keyof typeof COMBAT_SETUPS;

export function isCombatSetupName(name: string | null): name is CombatSetupName {
  return name !== null && Object.hasOwn(COMBAT_SETUPS, name);
}
