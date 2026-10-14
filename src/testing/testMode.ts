import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { validateSettings } from '@/game/config/settingsValidation';
import type { UserSettings } from '@/game/config/types';

/**
 * Test mode is enabled with `?test=1`. It only adds instrumentation (state observation, manual clock,
 * fixed seed); the game rules, input, collisions and rendering run exactly as in normal play.
 *
 *   ?test=1&seed=42&session=60&spawn=10&time=manual&touch=1
 */
export interface TestModeOptions {
  readonly isEnabled: boolean;
  readonly seed: number | undefined;
  readonly settings: UserSettings | undefined;
  readonly manualTime: boolean;
  readonly forceTouchControls: boolean;
}

export function readTestMode(search: string = window.location.search): TestModeOptions {
  const params = new URLSearchParams(search);
  const isEnabled = params.get('test') === '1';
  const seedParam = Number(params.get('seed'));
  const settings = validateSettings({
    sessionTimeSeconds: params.get('session') ?? DEFAULT_USER_SETTINGS.sessionTimeSeconds,
    spawnIntervalSeconds: params.get('spawn') ?? DEFAULT_USER_SETTINGS.spawnIntervalSeconds,
  });
  return {
    isEnabled,
    seed: isEnabled && params.has('seed') && Number.isInteger(seedParam) ? seedParam : undefined,
    settings:
      isEnabled && settings.isValid && (params.has('session') || params.has('spawn')) ? settings.settings : undefined,
    manualTime: isEnabled && params.get('time') === 'manual',
    forceTouchControls: params.get('touch') === '1',
  };
}
