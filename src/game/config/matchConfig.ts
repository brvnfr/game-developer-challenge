import { DEFAULT_GAME_CONFIG } from './defaults';
import { validateSettings } from './settingsValidation';
import type { GameConfig, MatchConfig, UserSettings } from './types';

type Mutable<T> = { -readonly [Key in keyof T]: Mutable<T[Key]> };

/** Recursively freezes an object graph, arrays included. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Builds the immutable configuration of a new match: the balancing base merged with the player's settings.
 * The result is a deep, frozen copy, so later changes to the settings or to the base cannot affect a match
 * in progress.
 */
export function createMatchConfig(settings: UserSettings, base: GameConfig = DEFAULT_GAME_CONFIG): MatchConfig {
  const validation = validateSettings(settings);
  if (!validation.isValid) throw new Error(`Invalid settings: ${Object.values(validation.errors).join(' ')}`);
  const config = structuredClone(base) as Mutable<GameConfig>;
  config.match.durationSeconds = validation.settings.sessionTimeSeconds;
  config.spawn.intervalSeconds = validation.settings.spawnIntervalSeconds;
  return deepFreeze({ ...config, settings: { ...validation.settings } });
}

/** Identifies the settings that make two matches comparable in the ranking (e.g. "s120-i3"). */
export function createConfigKey(settings: UserSettings): string {
  return `s${settings.sessionTimeSeconds}-i${settings.spawnIntervalSeconds}`;
}
