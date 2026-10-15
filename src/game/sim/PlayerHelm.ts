import { angleDifference } from '@/game/core/math/angles';
import { turnInputFor } from './ai/SteeringNavigator';
import type { Ship } from './entities/Ship';
import type { WeaponSlot } from './entities/types';
import type { PlayerCommands } from './PlayerCommands';

/**
 * Turns the player's commands into the controls of the player's ship for one step.
 * - Keys and on-screen buttons drive the sails and the rudder directly.
 * - The touch helm gives a heading to sail towards; the ship turns to it with the same rudder limits as any
 *   turn (no overshoot). A held turn or sail key always wins over the helm.
 * - Each cannon fires while its trigger is held (the WeaponSystem enforces the cooldowns).
 */
export class PlayerHelm {
  constructor(
    private readonly ship: Ship,
    private readonly stepSeconds: number,
  ) {}

  apply(commands: PlayerCommands): void {
    const { ship } = this;
    if (!ship.isAlive) return;
    const usesKeys = commands.isSailingForward || commands.turnDirection !== 0;
    if (commands.steering && !usesKeys) {
      const headingError = angleDifference(ship.heading, commands.steering.heading);
      ship.setControls(commands.steering.throttle, turnInputFor(ship, headingError, this.stepSeconds));
    } else {
      ship.setControls(commands.isSailingForward ? 1 : 0, commands.turnDirection);
    }
    const triggers: Readonly<Record<WeaponSlot, boolean>> = {
      front: commands.isFiringFront,
      left: commands.isFiringLeft,
      right: commands.isFiringRight,
      cannon: false,
    };
    for (const weapon of ship.weapons) weapon.isTriggerHeld = triggers[weapon.slot];
  }
}
