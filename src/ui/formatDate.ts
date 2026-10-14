const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/** "08 SEP" in the player's time zone. */
export function formatDayMonth(isoDate: string): string {
  const date = new Date(isoDate);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()] ?? ''}`;
}

/** "21:42" in the player's time zone. */
export function formatTimeOfDay(isoDate: string): string {
  const date = new Date(isoDate);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Full, unambiguous date for screen readers and tooltips (e.g. "8 September 2026, 21:42"). */
export function describeDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(isoDate));
}

/** Match duration as "mm:ss" (e.g. 102 000 ms → "01:42"). */
export function formatMatchDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

/** "120 second battles · 3 second spawn interval". */
export function describeBattleSettings(settings: {
  readonly sessionTimeSeconds: number;
  readonly spawnIntervalSeconds: number;
}): string {
  return `${settings.sessionTimeSeconds} second battles · ${settings.spawnIntervalSeconds} second spawn interval`;
}
