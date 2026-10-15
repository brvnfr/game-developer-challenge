import { describe, expect, it } from 'vitest';
import { Vector2 } from '@/game/core/math/Vector2';
import { IDLE_COMMANDS, type PlayerCommands } from './PlayerCommands';
import { PlayerHelm } from './PlayerHelm';
import { createTestContext } from './testing/fixtures';

function setUp() {
  const context = createTestContext();
  const player = context.ships.createPlayer(new Vector2(400, 400), 0);
  return { player, helm: new PlayerHelm(player, context.stepSeconds) };
}

const commands = (changes: Partial<PlayerCommands>): PlayerCommands => ({ ...IDLE_COMMANDS, ...changes });

describe('PlayerHelm', () => {
  it('drives the sails and the rudder directly from keys and buttons', () => {
    const { player, helm } = setUp();
    helm.apply(commands({ isSailingForward: true, turnDirection: -1 }));
    expect(player.throttle).toBe(1);
    expect(player.turnInput).toBe(-1);
    helm.apply(IDLE_COMMANDS);
    expect(player.throttle).toBe(0);
    expect(player.turnInput).toBe(0);
  });

  it('steers towards the helm heading at the helm throttle', () => {
    const { player, helm } = setUp();
    helm.apply(commands({ steering: { heading: Math.PI / 2, throttle: 0.4 } }));
    expect(player.throttle).toBeCloseTo(0.4);
    expect(player.turnInput).toBeGreaterThan(0);
  });

  it('lets a held key win over the helm', () => {
    const { player, helm } = setUp();
    helm.apply(commands({ turnDirection: -1, steering: { heading: Math.PI / 2, throttle: 1 } }));
    expect(player.turnInput).toBe(-1);
    expect(player.throttle).toBe(0);
  });

  it('holds each cannon trigger from its own command', () => {
    const { player, helm } = setUp();
    helm.apply(commands({ isFiringFront: true, isFiringRight: true }));
    expect(player.weapons.map((weapon) => [weapon.slot, weapon.isTriggerHeld])).toEqual([
      ['front', true],
      ['left', false],
      ['right', true],
    ]);
  });

  it('ignores commands once the ship is destroyed', () => {
    const { player, helm } = setUp();
    player.destroy();
    helm.apply(commands({ isSailingForward: true, isFiringFront: true }));
    expect(player.throttle).toBe(0);
    expect(player.weapon('front')?.isTriggerHeld).toBe(false);
  });
});
