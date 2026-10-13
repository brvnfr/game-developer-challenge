import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';
import type { SimulationSystem } from './SimulationSystem';

/**
 * Ship-against-ship contact. A Chaser touching the player explodes (no score) and damages the player;
 * any other overlap is separated symmetrically and re-resolved against the islands.
 */
export class ShipCollisionSystem implements SimulationSystem {
  update(context: SimulationContext): void {
    const ships = context.world.ships;
    for (let first = 0; first < ships.length; first++) {
      for (let second = first + 1; second < ships.length; second++) {
        const shipA = ships[first];
        const shipB = ships[second];
        if (shipA?.isAlive && shipB?.isAlive && shipA.overlaps(shipB)) this.resolveContact(shipA, shipB, context);
      }
    }
  }

  private resolveContact(shipA: Ship, shipB: Ship, context: SimulationContext): void {
    const chaser = [shipA, shipB].find((ship) => ship.kind === 'chaser');
    const player = [shipA, shipB].find((ship) => ship.kind === 'player');
    if (chaser && player) {
      context.damage.destroy(chaser, 'ram');
      context.damage.applyDamage(player, chaser.ramDamage, 'ram');
      return;
    }
    this.separate(shipA, shipB, context);
  }

  private separate(shipA: Ship, shipB: Ship, context: SimulationContext): void {
    const offset = shipB.position.subtract(shipA.position);
    const distance = offset.length;
    const direction = distance > 1e-6 ? offset.scale(1 / distance) : shipA.forward;
    const halfOverlap = (shipA.radius + shipB.radius - distance) / 2;
    shipA.position = context.arena.resolveCircle(
      shipA.position.subtract(direction.scale(halfOverlap)),
      shipA.radius,
    ).position;
    shipB.position = context.arena.resolveCircle(
      shipB.position.add(direction.scale(halfOverlap)),
      shipB.radius,
    ).position;
  }
}
