import { formatClock } from './formatTime';
import './match-start-banner.css';

/**
 * "Battle stations!" call shown over the arena for the first moments of a match. Decorative (the live region
 * of the HUD already announces the start), so it is hidden from assistive technology and never takes input.
 */
export function MatchStartBanner({ durationSeconds }: { readonly durationSeconds: number }) {
  return (
    <div className="match-start-banner" aria-hidden="true" data-testid="match-start-banner">
      <p className="match-start-banner__title">Battle stations!</p>
      <p className="match-start-banner__subtitle">
        Sink every ship you can in <strong>{formatClock(durationSeconds)}</strong>
      </p>
    </div>
  );
}
