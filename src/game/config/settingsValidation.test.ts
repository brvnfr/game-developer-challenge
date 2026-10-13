import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from './defaults';
import { SETTINGS_RULES, validateSettings } from './settingsValidation';

describe('validateSettings', () => {
  it('accepts the defaults and the documented limits', () => {
    expect(validateSettings(DEFAULT_USER_SETTINGS).isValid).toBe(true);
    expect(validateSettings({ sessionTimeSeconds: 60, spawnIntervalSeconds: 1 }).isValid).toBe(true);
    expect(validateSettings({ sessionTimeSeconds: 180, spawnIntervalSeconds: 10 }).isValid).toBe(true);
  });

  it('parses numeric strings, including a decimal comma', () => {
    expect(validateSettings({ sessionTimeSeconds: '90', spawnIntervalSeconds: '2,5' })).toEqual({
      isValid: true,
      settings: { sessionTimeSeconds: 90, spawnIntervalSeconds: 2.5 },
    });
  });

  it.each([
    [59, 3, 'sessionTimeSeconds'],
    [181, 3, 'sessionTimeSeconds'],
    [90.5, 3, 'sessionTimeSeconds'],
    ['', 3, 'sessionTimeSeconds'],
    ['abc', 3, 'sessionTimeSeconds'],
    [Number.NaN, 3, 'sessionTimeSeconds'],
    [120, 0, 'spawnIntervalSeconds'],
    [120, -1, 'spawnIntervalSeconds'],
    [120, 10.5, 'spawnIntervalSeconds'],
    [120, 2.3, 'spawnIntervalSeconds'],
    [120, null, 'spawnIntervalSeconds'],
  ] as const)(
    'rejects session=%s and spawn=%s with an error on %s',
    (sessionTimeSeconds, spawnIntervalSeconds, invalidField) => {
      const validation = validateSettings({ sessionTimeSeconds, spawnIntervalSeconds });
      expect(validation.isValid).toBe(false);
      if (!validation.isValid) expect(validation.errors[invalidField]).toMatch(/must/);
    },
  );

  it('documents a positive spawn interval', () => {
    expect(SETTINGS_RULES.spawnIntervalSeconds.minimum).toBeGreaterThan(0);
  });
});
