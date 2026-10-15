import { parseSettingValue, type FieldRule } from '@/game/config/settingsValidation';
import { clamp } from '@/game/core/math/numbers';

/** Formats a setting for its text field: integers without decimals, halves with one ("2.5"). */
export function formatSettingValue(value: number): string {
  return String(Number(value.toFixed(3)));
}

/**
 * Value after pressing − or +: one increment away, snapped to the rule's grid and kept inside its limits.
 * Text that is not a number restarts from the closest limit in the pressed direction.
 */
export function stepSettingValue(rawValue: string, direction: -1 | 1, rule: FieldRule): string {
  const current = parseSettingValue(rawValue);
  if (current === null) return formatSettingValue(direction > 0 ? rule.minimum : rule.maximum);
  const target = current + direction * rule.increment;
  const snapped = rule.minimum + Math.round((target - rule.minimum) / rule.increment) * rule.increment;
  return formatSettingValue(clamp(snapped, rule.minimum, rule.maximum));
}

/** Whether − (direction −1) or + (direction 1) can still change the value. */
export function canStepSettingValue(rawValue: string, direction: -1 | 1, rule: FieldRule): boolean {
  const current = parseSettingValue(rawValue);
  if (current === null) return true;
  return direction > 0 ? current < rule.maximum : current > rule.minimum;
}
