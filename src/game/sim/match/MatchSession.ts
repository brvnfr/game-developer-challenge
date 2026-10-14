import type { MatchConfig } from '@/game/config/types';
import { SeededRandom } from '@/game/core/SeededRandom';
import type { Arena } from '../arena/Arena';
import { DamageResolver } from '../DamageResolver';
import type { Ship } from '../entities/Ship';
import { EventQueue } from '../events/EventQueue';
import { HullPlacement } from '../HullPlacement';
import type { GameEvent, MatchEndReason, PauseReason } from '../events/GameEvent';
import { IDLE_COMMANDS, type PlayerCommands } from '../PlayerCommands';
import { ShipFactory } from '../ShipFactory';
import type { SimulationContext } from '../SimulationContext';
import { EnemyAiSystem } from '../systems/EnemyAiSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { ShipCollisionSystem } from '../systems/ShipCollisionSystem';
import type { SimulationSystem } from '../systems/SimulationSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { World } from '../World';
import { ScoreKeeper } from './ScoreKeeper';
import type { MatchResult, MatchSnapshot, MatchStatus } from './types';

export interface MatchSessionOptions {
  readonly config: MatchConfig;
  readonly arena: Arena;
  readonly seed: number;
  /** Generates the match id (crypto.randomUUID in the browser, deterministic in tests). */
  readonly createMatchId: () => string;
  /** Wall clock, used only for the result timestamp. */
  readonly now: () => Date;
}

/**
 * One match. Owns the world and runs the systems in a fixed order every step:
 * enemy AI → weapons → movement → ship collisions → projectiles → spawns → score.
 *
 * Lifecycle: ready → running ⇄ paused → ended. After the end nothing changes (single guard in `step`).
 * Restarting creates a new session; abandoning drops it without a result.
 * When the player dies on the same step the time runs out, the end reason is `playerDestroyed`.
 */
export class MatchSession {
  readonly world = new World();
  readonly config: MatchConfig;
  readonly arena: Arena;
  readonly seed: number;
  readonly player: Ship;
  private readonly events = new EventQueue();
  private readonly context: SimulationContext;
  private readonly spawnSystem: SpawnSystem;
  private readonly systems: readonly SimulationSystem[];
  private readonly scoreKeeper = new ScoreKeeper();
  private readonly totalSteps: number;
  private readonly createMatchId: () => string;
  private readonly now: () => Date;
  private currentStep = 0;
  private currentStatus: MatchStatus = 'ready';
  private currentPauseReason: PauseReason | null = null;
  private matchResult: MatchResult | null = null;

  constructor(options: MatchSessionOptions) {
    this.config = options.config;
    this.arena = options.arena;
    this.seed = options.seed;
    this.createMatchId = options.createMatchId;
    this.now = options.now;
    this.totalSteps = Math.round(this.config.match.durationSeconds / this.config.match.stepSeconds);

    const ships = new ShipFactory(this.world, this.config);
    this.context = {
      world: this.world,
      arena: this.arena,
      config: this.config,
      events: this.events,
      random: new SeededRandom(options.seed),
      damage: new DamageResolver(this.world, this.events),
      ships,
      hullPlacement: new HullPlacement(this.arena),
      stepSeconds: this.config.match.stepSeconds,
    };
    this.spawnSystem = new SpawnSystem(this.config);
    this.systems = [
      new EnemyAiSystem(this.config),
      new WeaponSystem(),
      new MovementSystem(),
      new ShipCollisionSystem(),
      new ProjectileSystem(),
      this.spawnSystem,
    ];
    this.player = ships.createPlayer(this.arena.playerStart, this.arena.definition.playerStartHeading);
  }

  get status(): MatchStatus {
    return this.currentStatus;
  }

  get score(): number {
    return this.scoreKeeper.score;
  }

  get result(): MatchResult | null {
    return this.matchResult;
  }

  get stepsSimulated(): number {
    return this.currentStep;
  }

  get elapsedSeconds(): number {
    return this.currentStep * this.config.match.stepSeconds;
  }

  get remainingSeconds(): number {
    return Math.max(0, (this.totalSteps - this.currentStep) * this.config.match.stepSeconds);
  }

  get enemiesSpawned(): number {
    return this.spawnSystem.spawnedCount;
  }

  /** Read-only access to the systems' shared context (factories, damage) for tests and tooling. */
  get simulationContext(): SimulationContext {
    return this.context;
  }

  start(): void {
    if (this.currentStatus !== 'ready') return;
    this.currentStatus = 'running';
    this.events.push({ type: 'matchStarted' });
  }

  /** Returns true when the match was running and is now paused. Held triggers are dropped. */
  pause(reason: PauseReason): boolean {
    if (this.currentStatus !== 'running') return false;
    this.currentStatus = 'paused';
    this.currentPauseReason = reason;
    this.player.stopControls();
    this.events.push({ type: 'matchPaused', reason });
    return true;
  }

  /** Resuming always requires an explicit call (player action); it is never automatic. */
  resume(): boolean {
    if (this.currentStatus !== 'paused') return false;
    this.currentStatus = 'running';
    this.currentPauseReason = null;
    this.events.push({ type: 'matchResumed' });
    return true;
  }

  /** Advances the simulation by one fixed step. Does nothing unless the match is running. */
  step(commands: PlayerCommands = IDLE_COMMANDS): void {
    if (this.currentStatus !== 'running') return;
    this.currentStep++;
    const firstEventOfStep = this.events.size;
    this.applyPlayerCommands(commands);
    for (const system of this.systems) system.update(this.context, this.currentStep);
    this.scoreKeeper.collect(this.events, firstEventOfStep);
    this.world.removeInactive();

    if (!this.player.isAlive) this.end('playerDestroyed');
    else if (this.currentStep >= this.totalSteps) this.end('timeUp');
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): GameEvent[] {
    return this.events.drain();
  }

  snapshot(): MatchSnapshot {
    return {
      status: this.currentStatus,
      pauseReason: this.currentPauseReason,
      score: this.score,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      remainingSeconds: Math.ceil(this.remainingSeconds - 1e-9),
      durationSeconds: this.config.match.durationSeconds,
      enemiesAlive: this.world.livingEnemies().length,
      endReason: this.matchResult?.endReason ?? null,
    };
  }

  private applyPlayerCommands(commands: PlayerCommands): void {
    if (!this.player.isAlive) return;
    this.player.setControls(commands.isSailingForward ? 1 : 0, commands.turnDirection);
    const triggers = {
      front: commands.isFiringFront,
      left: commands.isFiringLeft,
      right: commands.isFiringRight,
      cannon: false,
    };
    for (const weapon of this.player.weapons) weapon.isTriggerHeld = triggers[weapon.slot];
  }

  private end(endReason: MatchEndReason): void {
    this.currentStatus = 'ended';
    this.player.stopControls();
    this.matchResult = {
      matchId: this.createMatchId(),
      score: this.score,
      durationMs: Math.round(this.elapsedSeconds * 1000),
      endReason,
      endedAt: this.now().toISOString(),
      settings: { ...this.config.settings },
      seed: this.seed,
    };
    this.events.push({ type: 'matchEnded', reason: endReason });
  }
}
