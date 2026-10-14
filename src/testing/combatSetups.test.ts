import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { Vector2 } from '@/game/core/math/Vector2';
import { MatchFactory } from '@/game/runtime/MatchFactory';
import { COMBAT_SETUPS } from './combatSetups';

describe('combat setups', () => {
  it.each(Object.entries(COMBAT_SETUPS))('%s places every ship in open water', (_name, setup) => {
    const match = new MatchFactory({ seed: 1, setup }).create(DEFAULT_USER_SETTINGS);
    const placement = match.simulationContext.hullPlacement;
    expect(placement.isBlocked(match.player, 0.01)).toBe(false);
    expect(match.world.livingEnemies()).toHaveLength('enemies' in setup ? setup.enemies.length : 0);
    for (const enemy of match.world.livingEnemies()) expect(placement.isBlocked(enemy, 0.01)).toBe(false);
  });

  it('keeps the line of fire east of the player clear of islands for a full shot', () => {
    const match = new MatchFactory({ seed: 1, setup: COMBAT_SETUPS['open-water'] }).create(DEFAULT_USER_SETTINGS);
    const range = match.config.player.frontCannon.range;
    for (let distance = 0; distance <= range; distance += 10) {
      const point = match.player.position.add(new Vector2(distance, 0));
      expect(match.arena.isCircleBlocked(point, match.config.player.frontCannon.projectileRadius)).toBe(false);
    }
  });

  it('starts the Shooter beyond its attack range', () => {
    const match = new MatchFactory({ seed: 1, setup: COMBAT_SETUPS['shooter-far'] }).create(DEFAULT_USER_SETTINGS);
    const shooter = match.world.livingEnemies()[0];
    expect(shooter?.position.distanceTo(match.player.position)).toBeGreaterThan(match.config.shooter.attackRange + 200);
  });
});
