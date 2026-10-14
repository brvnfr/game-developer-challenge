import type { UserSettings } from './types';

export type SettingsField = keyof UserSettings;

export interface FieldRule {
  readonly label: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly increment: number;
}

/** Documented limits of the Options screen: session 60–180 s, positive and bounded spawn interval. */
export const SETTINGS_RULES: Readonly<Record<SettingsField, FieldRule>> = {
  sessionTimeSeconds: { label: 'Game session time', minimum: 60, maximum: 180, increment: 1 },
  spawnIntervalSeconds: { label: 'Enemy spawn time', minimum: 1, maximum: 10, increment: 0.5 },
};

export type SettingsErrors = Partial<Record<SettingsField, string>>;

export type SettingsValidationResult =
  | { readonly isValid: true; readonly settings: UserSettings }
  | { readonly isValid: false; readonly errors: SettingsErrors };

const SETTINGS_FIELDS = Object.keys(SETTINGS_RULES) as SettingsField[];

/** Accepts numbers or numeric strings; a decimal comma is accepted ("2,5" → 2.5). */
export function parseSettingValue(rawValue: unknown): number | null {
  if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : null;
  if (typeof rawValue !== 'string' || rawValue.trim() === '') return null;
  const parsed = Number(rawValue.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateField(rule: FieldRule, rawValue: unknown): { value: number } | { error: string } {
  const value = parseSettingValue(rawValue);
  if (value === null) return { error: `${rule.label} must be a number.` };
  if (value < rule.minimum || value > rule.maximum) {
    return { error: `${rule.label} must be between ${rule.minimum} and ${rule.maximum} seconds.` };
  }
  const incrementsFromMinimum = (value - rule.minimum) / rule.increment;
  if (Math.abs(incrementsFromMinimum - Math.round(incrementsFromMinimum)) > 1e-9) {
    return {
      error:
        rule.increment === 1
          ? `${rule.label} must be a whole number of seconds.`
          : `${rule.label} must be a multiple of ${rule.increment} seconds.`,
    };
  }
  return { value };
}

/** Validates raw input from the Options form or from storage. */
export function validateSettings(rawSettings: Record<SettingsField, unknown>): SettingsValidationResult {
  const errors: SettingsErrors = {};
  const values: Partial<Record<SettingsField, number>> = {};
  for (const field of SETTINGS_FIELDS) {
    const outcome = validateField(SETTINGS_RULES[field], rawSettings[field]);
    if ('error' in outcome) errors[field] = outcome.error;
    else values[field] = outcome.value;
  }
  if (values.sessionTimeSeconds === undefined || values.spawnIntervalSeconds === undefined) {
    return { isValid: false, errors };
  }
  return {
    isValid: true,
    settings: { sessionTimeSeconds: values.sessionTimeSeconds, spawnIntervalSeconds: values.spawnIntervalSeconds },
  };
}
