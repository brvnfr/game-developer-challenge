import type { GameConfig, UserSettings } from './types';

/**
 * Default balancing. The rationale for each value is documented in ARCHITECTURE.md (Balancing).
 * Reference arena: 1920 × 1088 px (30 × 17 tiles of 64 px).
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  match: {
    durationSeconds: 120,
    stepSeconds: 1 / 60,
  },
  player: {
    maxHealth: 100,
    maxSpeed: 170,
    acceleration: 260,
    deceleration: 200,
    turnSpeed: 2.6,
    hullRadius: 21,
    hullLength: 108,
    frontCannon: { cooldownSeconds: 0.45, projectileSpeed: 560, damage: 20, range: 560, projectileRadius: 5 },
    broadside: {
      cooldownSeconds: 1.4,
      projectileSpeed: 500,
      damage: 15,
      range: 400,
      projectileRadius: 5,
      projectileCount: 3,
      projectileSpacing: 22,
    },
  },
  chaser: {
    maxHealth: 30,
    maxSpeed: 135,
    acceleration: 220,
    deceleration: 200,
    turnSpeed: 2.1,
    hullRadius: 20,
    hullLength: 104,
    ramDamage: 25,
  },
  shooter: {
    maxHealth: 50,
    maxSpeed: 100,
    acceleration: 160,
    deceleration: 160,
    turnSpeed: 1.8,
    hullRadius: 21,
    hullLength: 108,
    attackRange: 430,
    preferredRange: 320,
    aimTolerance: 0.14,
    cannon: { cooldownSeconds: 1.8, projectileSpeed: 380, damage: 10, range: 470, projectileRadius: 5 },
  },
  spawn: {
    intervalSeconds: 3,
    minDistanceFromPlayer: 480,
    clearance: 16,
    edgeBandWidth: 160,
    maxAttempts: 40,
    openingSequence: ['chaser', 'shooter'],
  },
  difficulty: [
    {
      atSeconds: 0,
      enemiesPerWave: 1,
      maxEnemiesAlive: 6,
      shooterProbability: 0.3,
      enemySpeedMultiplier: 1,
      shooterCooldownMultiplier: 1,
    },
    {
      atSeconds: 60,
      enemiesPerWave: 2,
      maxEnemiesAlive: 9,
      shooterProbability: 0.45,
      enemySpeedMultiplier: 1.1,
      shooterCooldownMultiplier: 0.85,
    },
    {
      atSeconds: 150,
      enemiesPerWave: 3,
      maxEnemiesAlive: 14,
      shooterProbability: 0.6,
      enemySpeedMultiplier: 1.3,
      shooterCooldownMultiplier: 0.7,
    },
  ],
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sessionTimeSeconds: DEFAULT_GAME_CONFIG.match.durationSeconds,
  spawnIntervalSeconds: DEFAULT_GAME_CONFIG.spawn.intervalSeconds,
};
