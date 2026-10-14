import type { SpawnConfig } from '@/game/config/types';
import { Vector2 } from '@/game/core/math/Vector2';
import type { SimulationContext } from '../SimulationContext';

type ArenaEdge = 'top' | 'right' | 'bottom' | 'left';
const ARENA_EDGES: readonly ArenaEdge[] = ['top', 'right', 'bottom', 'left'];

/**
 * Finds spawn points that are free of islands and ships and far enough from the player that the new
 * enemy cannot cause unavoidable immediate damage. Tries random points in a band along the arena edges,
 * then falls back to the water tile farthest from the player.
 */
export class SpawnPointFinder {
  constructor(private readonly rules: SpawnConfig) {}

  /** `radius` encloses the whole hull of the ship to spawn. */
  find(radius: number, playerPosition: Vector2, context: SimulationContext): Vector2 | null {
    for (let attempt = 0; attempt < this.rules.maxAttempts; attempt++) {
      const candidate = this.randomEdgePoint(radius, context);
      if (this.isValid(candidate, radius, playerPosition, context)) return candidate;
    }
    return (
      context.arena
        .waterTileCenters()
        .filter((candidate) => this.isValid(candidate, radius, playerPosition, context))
        .sort((first, second) => second.distanceTo(playerPosition) - first.distanceTo(playerPosition))[0] ?? null
    );
  }

  isValid(candidate: Vector2, radius: number, playerPosition: Vector2, context: SimulationContext): boolean {
    const { clearance, minDistanceFromPlayer } = this.rules;
    return (
      candidate.distanceTo(playerPosition) >= minDistanceFromPlayer &&
      !context.arena.isCircleBlocked(candidate, radius + clearance) &&
      context.world.ships.every(
        (ship) => !ship.isAlive || ship.position.distanceTo(candidate) >= ship.boundingRadius + radius + clearance,
      )
    );
  }

  private randomEdgePoint(radius: number, context: SimulationContext): Vector2 {
    const { arena, random } = context;
    const margin = radius + this.rules.clearance;
    const depth = random.between(margin, Math.max(margin, this.rules.edgeBandWidth));
    const alongWidth = margin + random.next() * (arena.width - 2 * margin);
    const alongHeight = margin + random.next() * (arena.height - 2 * margin);
    switch (random.pick(ARENA_EDGES)) {
      case 'top':
        return new Vector2(alongWidth, depth);
      case 'right':
        return new Vector2(arena.width - depth, alongHeight);
      case 'bottom':
        return new Vector2(alongWidth, arena.height - depth);
      case 'left':
        return new Vector2(depth, alongHeight);
    }
  }
}
