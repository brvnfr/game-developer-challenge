import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/game/config/defaults';
import { DifficultyCurve } from './DifficultyCurve';

const curve = new DifficultyCurve(DEFAULT_GAME_CONFIG.difficulty);

describe('DifficultyCurve', () => {
  it('starts at the first keyframe', () => {
    expect(curve.levelAt(0)).toEqual({
      enemiesPerWave: 1,
      maxEnemiesAlive: 6,
      shooterProbability: 0.3,
      enemySpeedMultiplier: 1,
      shooterCooldownMultiplier: 1,
    });
  });

  it('interpolates between keyframes and rounds counts down', () => {
    const level = curve.levelAt(30);
    expect(level.shooterProbability).toBeCloseTo(0.375);
    expect(level.maxEnemiesAlive).toBe(7);
    expect(level.enemySpeedMultiplier).toBeCloseTo(1.05);
  });

  it('holds the last keyframe afterwards and never gets easier over time', () => {
    expect(curve.levelAt(999)).toEqual(curve.levelAt(150));
    let previous = curve.levelAt(0);
    for (let second = 1; second <= 180; second++) {
      const current = curve.levelAt(second);
      expect(current.enemiesPerWave).toBeGreaterThanOrEqual(previous.enemiesPerWave);
      expect(current.maxEnemiesAlive).toBeGreaterThanOrEqual(previous.maxEnemiesAlive);
      expect(current.shooterProbability).toBeGreaterThanOrEqual(previous.shooterProbability);
      previous = current;
    }
  });

  it('requires at least one keyframe', () => {
    expect(() => new DifficultyCurve([])).toThrow();
  });
});
