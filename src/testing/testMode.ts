import { DEFAULT_USER_SETTINGS } from '@/game/config/defaults';
import { validateSettings } from '@/game/config/settingsValidation';
import type { UserSettings } from '@/game/config/types';
import type { MatchSetup } from '@/game/sim/match/MatchSetup';
import { COMBAT_SETUPS, isCombatSetupName } from './combatSetups';

/**
 * Test mode is enabled with `?test=1`. It only adds instrumentation (state observation, manual clock,
 * fixed seed); the game rules, input, collisions and rendering run exactly as in normal play.
 *
 *   ?test=1&seed=42&session=60&spawn=10&time=manual&touch=1&setup=chaser-ahead
 *
 * Profiling (`docs/PERFORMANCE.md`) adds `profile=1` (frame timing and entity counts) and may raise the player's
 * health with `playerHealth=10000`, a balancing value of the typed config, so a 3-minute match runs to the end.
 */
export interface TestModeOptions {
  readonly isEnabled: boolean;
  readonly seed: number | undefined;
  readonly settings: UserSettings | undefined;
  readonly manualTime: boolean;
  readonly forceTouchControls: boolean;
  /** Named starting layout (see combatSetups.ts); undefined for the normal start. */
  readonly setup: MatchSetup | undefined;
  /** Records frame timing and entity counts for the performance report. */
  readonly profile: boolean;
  /** Overrides `player.maxHealth` of the balancing config (profiling runs only). */
  readonly playerMaxHealth: number | undefined;
}

export function readTestMode(search: string = window.location.search): TestModeOptions {
  const params = new URLSearchParams(search);
  const isEnabled = params.get('test') === '1';
  const seedParam = Number(params.get('seed'));
  const setupName = params.get('setup');
  const playerHealth = Number(params.get('playerHealth'));
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
    setup: isEnabled && isCombatSetupName(setupName) ? COMBAT_SETUPS[setupName] : undefined,
    profile: isEnabled && params.get('profile') === '1',
    playerMaxHealth:
      isEnabled && Number.isInteger(playerHealth) && playerHealth >= 1 && playerHealth <= 1_000_000
        ? playerHealth
        : undefined,
  };
}
