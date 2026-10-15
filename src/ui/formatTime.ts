const twoDigits = (value: number) => String(value).padStart(2, '0');

/** Whole minutes and seconds of a duration; negative durations count as zero. */
function splitMinutes(totalSeconds: number): { readonly minutes: number; readonly seconds: number } {
  const wholeSeconds = Math.max(0, Math.floor(totalSeconds));
  return { minutes: Math.floor(wholeSeconds / 60), seconds: wholeSeconds % 60 };
}

/** Clock of the HUD and the result screen, m:ss (e.g. 102 → "1:42"). */
export function formatClock(totalSeconds: number): string {
  const { minutes, seconds } = splitMinutes(totalSeconds);
  return `${minutes}:${twoDigits(seconds)}`;
}

/** Match duration in the Match History table, mm:ss rounded to the second (e.g. 102 400 ms → "01:42"). */
export function formatMatchDuration(durationMs: number): string {
  const { minutes, seconds } = splitMinutes(Math.round(durationMs / 1000));
  return `${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

/** Spoken form for screen readers (e.g. 102 → "1 minute 42 seconds"). */
export function describeDuration(totalSeconds: number): string {
  const { minutes, seconds } = splitMinutes(totalSeconds);
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (seconds > 0 || minutes === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}
