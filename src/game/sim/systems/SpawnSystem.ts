import type { EnemyKind, MatchConfig } from '@/game/config/types';
import { DifficultyCurve, type DifficultyLevel } from '../DifficultyCurve';
import type { SimulationContext } from '../SimulationContext';
import { SpawnPointFinder } from '../spawning/SpawnPointFinder';
import type { SimulationSystem } from './SimulationSystem';

/**
 * Spawns enemy waves every configured interval of active time until the match ends.
 * - the first spawns follow the opening sequence (Chaser, then Shooter) so both kinds always appear
 * - wave size, alive cap, kind mix and enemy strength follow the difficulty curve
 */
export class SpawnSystem implements SimulationSystem {
  private readonly stepsBetweenWaves: number;
  private readonly difficulty: DifficultyCurve;
  private readonly spawnPoints: SpawnPointFinder;
  private nextWaveStep: number;
  private spawned = 0;
  private skipped = 0;

  constructor(private readonly config: MatchConfig) {
    this.stepsBetweenWaves = Math.max(1, Math.round(config.spawn.intervalSeconds / config.match.stepSeconds));
    this.nextWaveStep = this.stepsBetweenWaves;
    this.difficulty = new DifficultyCurve(config.difficulty);
    this.spawnPoints = new SpawnPointFinder(config.spawn);
  }

  get spawnedCount(): number {
    return this.spawned;
  }

  /** Spawns that found no valid point (kept for diagnostics). */
  get skippedCount(): number {
    return this.skipped;
  }

  /** `step` is the 1-based index of the step being simulated. */
  update(context: SimulationContext, step: number): void {
    if (step < this.nextWaveStep) return;
    this.nextWaveStep += this.stepsBetweenWaves;
    const player = context.world.player;
    if (!player?.isAlive) return;
    const level = this.difficulty.levelAt(step * this.config.match.stepSeconds);

    for (let index = 0; index < level.enemiesPerWave; index++) {
      if (context.world.livingEnemies().length >= level.maxEnemiesAlive) return;
      this.spawnEnemy(this.chooseKind(level, context), level, context);
    }
  }

  private spawnEnemy(kind: EnemyKind, level: DifficultyLevel, context: SimulationContext): void {
    const player = context.world.player;
    if (!player) return;
    const position = this.spawnPoints.find(this.config[kind].radius, player.position, context);
    if (!position) {
      this.skipped++;
      return;
    }
    const enemy = context.ships.createEnemy(kind, position, position.angleTo(player.position), {
      speedMultiplier: level.enemySpeedMultiplier,
      shooterCooldownMultiplier: level.shooterCooldownMultiplier,
      preferredAvoidanceSide: context.random.sign(),
    });
    this.spawned++;
    context.events.push({ type: 'enemySpawned', shipId: enemy.id, kind, position });
  }

  private chooseKind(level: DifficultyLevel, context: SimulationContext): EnemyKind {
    return (
      this.config.spawn.openingSequence[this.spawned] ??
      (context.random.chance(level.shooterProbability) ? 'shooter' : 'chaser')
    );
  }
}
