import type { HullContact, Ship } from '../entities/Ship';
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
        if (!shipA?.isAlive || !shipB?.isAlive) continue;
        const contact = shipA.findContactWith(shipB);
        if (contact) this.resolveContact(shipA, shipB, contact, context);
      }
    }
  }

  private resolveContact(shipA: Ship, shipB: Ship, contact: HullContact, context: SimulationContext): void {
    const chaser = [shipA, shipB].find((ship) => ship.kind === 'chaser');
    const player = [shipA, shipB].find((ship) => ship.kind === 'player');
    if (chaser && player) {
      context.damage.destroy(chaser, 'ram');
      context.damage.applyDamage(player, chaser.ramDamage, 'ram');
      return;
    }
    this.separate(shipA, shipB, contact, context);
  }

  /** Pushes both hulls apart along the deepest contact, then keeps them out of islands. */
  private separate(shipA: Ship, shipB: Ship, contact: HullContact, context: SimulationContext): void {
    const halfPush = contact.normal.scale(contact.depth / 2);
    context.hullPlacement.place(shipA, shipA.position.subtract(halfPush));
    context.hullPlacement.place(shipB, shipB.position.add(halfPush));
  }
}
