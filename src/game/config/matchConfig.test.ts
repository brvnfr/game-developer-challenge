import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from './defaults';
import { createConfigKey, createMatchConfig } from './matchConfig';

describe('createMatchConfig', () => {
  it('applies the player settings to the snapshot', () => {
    const config = createMatchConfig({ sessionTimeSeconds: 90, spawnIntervalSeconds: 2 });
    expect(config.match.durationSeconds).toBe(90);
    expect(config.spawn.intervalSeconds).toBe(2);
    expect(config.settings).toEqual({ sessionTimeSeconds: 90, spawnIntervalSeconds: 2 });
  });

  it('returns a deeply frozen snapshot that later changes cannot affect', () => {
    const settings = { sessionTimeSeconds: 120, spawnIntervalSeconds: 3 };
    const config = createMatchConfig(settings);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.player.frontCannon)).toBe(true);
    expect(Object.isFrozen(config.difficulty[0])).toBe(true);
    expect(() => {
      (config.player as { maxHealth: number }).maxHealth = 1;
    }).toThrow(TypeError);
    settings.sessionTimeSeconds = 60;
    expect(config.match.durationSeconds).toBe(120);
    expect(Object.isFrozen(DEFAULT_GAME_CONFIG.player)).toBe(false);
  });

  it('refuses invalid settings', () => {
    expect(() => createMatchConfig({ sessionTimeSeconds: 10, spawnIntervalSeconds: 3 })).toThrow(/Invalid settings/);
  });
});

describe('createConfigKey', () => {
  it('identifies comparable configurations', () => {
    expect(createConfigKey({ sessionTimeSeconds: 120, spawnIntervalSeconds: 2.5 })).toBe('s120-i2.5');
  });
});
