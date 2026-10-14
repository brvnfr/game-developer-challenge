import { describe, expect, it } from 'vitest';
import { SETTINGS_RULES } from '@/game/config/settingsValidation';
import { canStepSettingValue, formatSettingValue, stepSettingValue } from './settingsStepping';

const sessionRule = SETTINGS_RULES.sessionTimeSeconds;
const spawnRule = SETTINGS_RULES.spawnIntervalSeconds;

describe('settings stepping', () => {
  it('moves one increment in the pressed direction', () => {
    expect(stepSettingValue('120', 1, sessionRule)).toBe('121');
    expect(stepSettingValue('120', -1, sessionRule)).toBe('119');
    expect(stepSettingValue('3', 1, spawnRule)).toBe('3.5');
    expect(stepSettingValue('3', -1, spawnRule)).toBe('2.5');
  });

  it('never leaves the documented limits', () => {
    expect(stepSettingValue('180', 1, sessionRule)).toBe('180');
    expect(stepSettingValue('60', -1, sessionRule)).toBe('60');
    expect(stepSettingValue('1', -1, spawnRule)).toBe('1');
    expect(stepSettingValue('500', -1, sessionRule)).toBe('180');
  });

  it('snaps off-grid values back onto the grid', () => {
    expect(stepSettingValue('2.3', 1, spawnRule)).toBe('3');
    expect(stepSettingValue('2,5', 1, spawnRule)).toBe('3');
  });

  it('restarts from a limit when the text is not a number', () => {
    expect(stepSettingValue('abc', 1, sessionRule)).toBe('60');
    expect(stepSettingValue('', -1, spawnRule)).toBe('10');
  });

  it('disables a direction only at its limit', () => {
    expect(canStepSettingValue('180', 1, sessionRule)).toBe(false);
    expect(canStepSettingValue('180', -1, sessionRule)).toBe(true);
    expect(canStepSettingValue('1', -1, spawnRule)).toBe(false);
    expect(canStepSettingValue('oops', -1, spawnRule)).toBe(true);
  });

  it('formats whole and half seconds without noise', () => {
    expect(formatSettingValue(120)).toBe('120');
    expect(formatSettingValue(2.5)).toBe('2.5');
    expect(formatSettingValue(0.1 + 0.2)).toBe('0.3');
  });
});
