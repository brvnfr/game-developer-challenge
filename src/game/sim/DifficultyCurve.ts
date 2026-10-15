import type { DifficultyKeyframe } from '@/game/config/types';
import { clamp } from '@/game/core/math/numbers';

export interface DifficultyLevel {
  readonly enemiesPerWave: number;
  readonly maxEnemiesAlive: number;
  readonly shooterProbability: number;
  readonly enemySpeedMultiplier: number;
  readonly shooterCooldownMultiplier: number;
}

/**
 * Procedural difficulty: values interpolated linearly between keyframes and clamped to the first and last
 * keyframe. Counts are rounded down. The spawn interval itself never changes (it is the configured value).
 */
export class DifficultyCurve {
  private readonly keyframes: readonly DifficultyKeyframe[];
  private readonly lastKeyframe: DifficultyKeyframe;

  constructor(keyframes: readonly DifficultyKeyframe[]) {
    const sorted = [...keyframes].sort((first, second) => first.atSeconds - second.atSeconds);
    const firstKeyframe = sorted[0];
    const lastKeyframe = sorted[sorted.length - 1];
    if (!firstKeyframe || !lastKeyframe) throw new Error('The difficulty curve needs at least one keyframe');
    this.keyframes = sorted;
    this.lastKeyframe = lastKeyframe;
  }

  levelAt(elapsedSeconds: number): DifficultyLevel {
    const [before, after] = this.surroundingKeyframes(elapsedSeconds);
    const span = after.atSeconds - before.atSeconds;
    const progress = span > 0 ? clamp((elapsedSeconds - before.atSeconds) / span, 0, 1) : 0;
    const interpolate = (from: number, to: number) => from + (to - from) * progress;
    return {
      enemiesPerWave: Math.max(1, Math.floor(interpolate(before.enemiesPerWave, after.enemiesPerWave))),
      maxEnemiesAlive: Math.max(1, Math.floor(interpolate(before.maxEnemiesAlive, after.maxEnemiesAlive))),
      shooterProbability: clamp(interpolate(before.shooterProbability, after.shooterProbability), 0, 1),
      enemySpeedMultiplier: interpolate(before.enemySpeedMultiplier, after.enemySpeedMultiplier),
      shooterCooldownMultiplier: interpolate(before.shooterCooldownMultiplier, after.shooterCooldownMultiplier),
    };
  }

  private surroundingKeyframes(elapsedSeconds: number): [DifficultyKeyframe, DifficultyKeyframe] {
    const nextIndex = this.keyframes.findIndex((keyframe) => keyframe.atSeconds > elapsedSeconds);
    if (nextIndex === -1) return [this.lastKeyframe, this.lastKeyframe];
    const next = this.keyframes[nextIndex] ?? this.lastKeyframe;
    const previous = this.keyframes[nextIndex - 1] ?? next;
    return [previous, next];
  }
}
