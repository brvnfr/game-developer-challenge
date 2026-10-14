import { describe, expect, it } from 'vitest';
import { COMBAT_SETUPS } from './combatSetups';
import { readTestMode } from './testMode';

describe('readTestMode', () => {
  it('is disabled by default and ignores test parameters', () => {
    expect(readTestMode('?seed=4&session=60')).toMatchObject({
      isEnabled: false,
      seed: undefined,
      settings: undefined,
      manualTime: false,
    });
  });

  it('reads the seed, settings and clock mode in test mode', () => {
    expect(readTestMode('?test=1&seed=42&session=60&spawn=10&time=manual')).toEqual({
      isEnabled: true,
      seed: 42,
      settings: { sessionTimeSeconds: 60, spawnIntervalSeconds: 10 },
      manualTime: true,
      forceTouchControls: false,
      setup: undefined,
    });
  });

  it('ignores invalid settings', () => {
    expect(readTestMode('?test=1&session=5').settings).toBeUndefined();
  });

  it('reads a named combat setup only in test mode', () => {
    expect(readTestMode('?test=1&setup=chaser-ahead').setup).toBe(COMBAT_SETUPS['chaser-ahead']);
    expect(readTestMode('?setup=chaser-ahead').setup).toBeUndefined();
    expect(readTestMode('?test=1&setup=unknown').setup).toBeUndefined();
  });
});
