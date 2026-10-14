import { Vector2 } from '@/game/core/math/Vector2';
import { GameRuntime } from '@/game/runtime/GameRuntime';
import type { Ship } from '@/game/sim/entities/Ship';

export interface ObservedShip {
  readonly id: number;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly heading: number;
  readonly speed: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly isAlive: boolean;
}

export interface ObservedState {
  readonly status: string;
  readonly score: number;
  readonly remainingSeconds: number;
  readonly elapsedSeconds: number;
  readonly stepsSimulated: number;
  readonly player: ObservedShip;
  readonly enemies: readonly ObservedShip[];
  readonly projectiles: readonly {
    readonly id: number;
    readonly faction: string;
    readonly weaponSlot: string;
    readonly x: number;
    readonly y: number;
  }[];
  readonly enemiesSpawned: number;
  readonly arena: { readonly width: number; readonly height: number };
  readonly scene: unknown;
}

/** Instrumentation exposed on `window.__PIRATE_BATTLE__` in test mode only. It observes; it never changes rules. */
export interface PirateBattleTestApi {
  readonly liveRuntimes: () => number;
  readonly state: () => ObservedState | null;
  readonly setManualTime: (isManual: boolean) => void;
  readonly advanceTime: (milliseconds: number) => void;
  readonly isCircleBlocked: (x: number, y: number, radius: number) => boolean;
  /** True when any part of the player's hull overlaps land or leaves the arena. */
  readonly isPlayerHullBlocked: () => boolean;
}

declare global {
  interface Window {
    __PIRATE_BATTLE__?: PirateBattleTestApi;
  }
}

function currentRuntime(): GameRuntime | null {
  return GameRuntime.liveInstancesSnapshot.at(-1) ?? null;
}

function observeShip(ship: Ship): ObservedShip {
  return {
    id: ship.id,
    kind: ship.kind,
    x: ship.position.x,
    y: ship.position.y,
    heading: ship.heading,
    speed: ship.speed,
    health: ship.health,
    maxHealth: ship.maxHealth,
    isAlive: ship.isAlive,
  };
}

export function installTestHarness(): void {
  window.__PIRATE_BATTLE__ = {
    liveRuntimes: () => GameRuntime.liveInstanceCount,
    state: () => {
      const runtime = currentRuntime();
      if (!runtime) return null;
      const match = runtime.match;
      return {
        status: match.status,
        score: match.score,
        remainingSeconds: match.remainingSeconds,
        elapsedSeconds: match.elapsedSeconds,
        stepsSimulated: match.stepsSimulated,
        player: observeShip(match.player),
        enemies: match.world.livingEnemies().map(observeShip),
        projectiles: match.world.projectiles.map((projectile) => ({
          id: projectile.id,
          faction: projectile.faction,
          weaponSlot: projectile.weaponSlot,
          x: projectile.position.x,
          y: projectile.position.y,
        })),
        enemiesSpawned: match.enemiesSpawned,
        arena: { width: match.arena.width, height: match.arena.height },
        scene: runtime.sceneStatistics,
      };
    },
    setManualTime: (isManual) => currentRuntime()?.setTimeSource(isManual ? 'manual' : 'realTime'),
    advanceTime: (milliseconds) => currentRuntime()?.advanceTime(milliseconds),
    isPlayerHullBlocked: () => {
      const match = currentRuntime()?.match;
      return match ? match.simulationContext.hullPlacement.isBlocked(match.player, 0.01) : false;
    },
    isCircleBlocked: (x, y, radius) =>
      currentRuntime()?.match.arena.isCircleBlocked(new Vector2(x, y), radius) ?? false,
  };
}
