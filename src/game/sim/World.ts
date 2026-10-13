import type { Projectile } from './entities/Projectile';
import type { Ship } from './entities/Ship';

/** Container of the dynamic entities. Removal is deferred to `removeInactive()` at the end of each step. */
export class World {
  private readonly shipList: Ship[] = [];
  private readonly projectileList: Projectile[] = [];
  private lastEntityId = 0;
  private playerShip: Ship | null = null;

  createEntityId(): number {
    this.lastEntityId += 1;
    return this.lastEntityId;
  }

  get ships(): readonly Ship[] {
    return this.shipList;
  }

  get projectiles(): readonly Projectile[] {
    return this.projectileList;
  }

  get player(): Ship | null {
    return this.playerShip;
  }

  addShip(ship: Ship): Ship {
    this.shipList.push(ship);
    if (ship.kind === 'player') this.playerShip = ship;
    return ship;
  }

  addProjectile(projectile: Projectile): Projectile {
    this.projectileList.push(projectile);
    return projectile;
  }

  livingEnemies(): Ship[] {
    return this.shipList.filter((ship) => ship.faction === 'enemy' && ship.isAlive);
  }

  /** Removes destroyed enemies and inactive projectiles. The player is kept for the result screen. */
  removeInactive(): void {
    removeWhere(this.shipList, (ship) => !ship.isAlive && ship.kind !== 'player');
    removeWhere(this.projectileList, (projectile) => !projectile.isActive);
  }
}

function removeWhere<T>(items: T[], shouldRemove: (item: T) => boolean): void {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item !== undefined && shouldRemove(item)) items.splice(index, 1);
  }
}
