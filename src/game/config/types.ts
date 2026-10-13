/**
 * Typed gameplay configuration. Every balancing value lives here; systems read a frozen per-match
 * snapshot (`MatchConfig`) and never hard-code tuning numbers.
 *
 * Units: distances in world pixels, speeds in px/s, angles in radians, times in seconds.
 */

export interface ShipStats {
  readonly maxHealth: number;
  /** Top forward speed (px/s). */
  readonly maxSpeed: number;
  /** Forward acceleration (px/s²). */
  readonly acceleration: number;
  /** Deceleration when not thrusting (px/s²). */
  readonly deceleration: number;
  /** Rotation speed (rad/s). */
  readonly turnSpeed: number;
  /** Collision circle radius (px). */
  readonly radius: number;
}

export interface WeaponStats {
  /** Minimum time between two shots of this weapon. */
  readonly cooldownSeconds: number;
  readonly projectileSpeed: number;
  readonly damage: number;
  /** Maximum travel distance (px). Projectile lifetime = range / speed. */
  readonly range: number;
  readonly projectileRadius: number;
}

export interface BroadsideStats extends WeaponStats {
  /** Projectiles per broadside, fired in parallel. */
  readonly projectileCount: number;
  /** Distance between the parallel projectiles along the hull (px). */
  readonly projectileSpacing: number;
}

export interface PlayerShipConfig extends ShipStats {
  readonly frontCannon: WeaponStats;
  readonly broadside: BroadsideStats;
}

export interface ChaserShipConfig extends ShipStats {
  /** Damage dealt to the player when the Chaser rams it (the Chaser explodes). */
  readonly ramDamage: number;
}

export interface ShooterShipConfig extends ShipStats {
  /** The Shooter only fires when the player is within this distance (px). */
  readonly attackRange: number;
  /** Distance the Shooter tries to keep from the player (px). */
  readonly preferredRange: number;
  /** Maximum heading error allowed to open fire (rad). */
  readonly aimTolerance: number;
  readonly cannon: WeaponStats;
}

export type EnemyKind = 'chaser' | 'shooter';

export interface SpawnConfig {
  /** Time between spawn waves. Exposed in Options as "Enemy spawn time". */
  readonly intervalSeconds: number;
  /** Minimum distance between a spawn point and the player (px). */
  readonly minDistanceFromPlayer: number;
  /** Extra clearance from islands and other ships around a spawn point (px). */
  readonly clearance: number;
  /** Width of the band along the arena edges where spawn points are picked (px). */
  readonly edgeBandWidth: number;
  readonly maxAttempts: number;
  /** Enemy kinds of the first spawns, guaranteeing both kinds appear in a standard match. */
  readonly openingSequence: readonly EnemyKind[];
}

/** One point of the procedural difficulty curve. Values are interpolated linearly between keyframes. */
export interface DifficultyKeyframe {
  /** Elapsed active match time. */
  readonly atSeconds: number;
  /** Enemies spawned per wave (rounded down after interpolation). */
  readonly enemiesPerWave: number;
  /** Maximum enemies alive at the same time (rounded down after interpolation). */
  readonly maxEnemiesAlive: number;
  /** Probability in [0, 1] that a spawned enemy (after the opening sequence) is a Shooter. */
  readonly shooterProbability: number;
  /** Multiplier applied to enemy speed and turn rate when spawned. */
  readonly enemySpeedMultiplier: number;
  /** Multiplier applied to the Shooter cannon cooldown when spawned (below 1 fires faster). */
  readonly shooterCooldownMultiplier: number;
}

export interface MatchRules {
  /** Active match duration. Exposed in Options as "Game session time". */
  readonly durationSeconds: number;
  /** Fixed simulation step. */
  readonly stepSeconds: number;
}

export interface GameConfig {
  readonly match: MatchRules;
  readonly player: PlayerShipConfig;
  readonly chaser: ChaserShipConfig;
  readonly shooter: ShooterShipConfig;
  readonly spawn: SpawnConfig;
  readonly difficulty: readonly DifficultyKeyframe[];
}

/** Settings the player edits in the Options screen. */
export interface UserSettings {
  readonly sessionTimeSeconds: number;
  readonly spawnIntervalSeconds: number;
}

/** Frozen configuration used by one match. Later changes to the settings only affect new matches. */
export interface MatchConfig extends GameConfig {
  readonly settings: UserSettings;
}
