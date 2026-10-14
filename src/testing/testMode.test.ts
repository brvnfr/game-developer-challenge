import { describe, expect, it } from 'vitest';
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
    });
  });

  it('ignores invalid settings', () => {
    expect(readTestMode('?test=1&session=5').settings).toBeUndefined();
  });
});
