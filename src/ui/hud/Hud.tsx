import { useEffect, useRef, useState, type ReactNode } from 'react';
import heartIcon from '@assets/png/retina/ui/hud/icon_heart.png';
import healthFrame from '@assets/png/retina/ui/hud/health_frame.png';
import healthFillGreen from '@assets/png/retina/ui/hud/health_fill_green.png';
import healthFillAmber from '@assets/png/retina/ui/hud/health_fill_amber.png';
import healthFillRed from '@assets/png/retina/ui/hud/health_fill_red.png';
import scoreIcon from '@assets/png/retina/ui/hud/icon_score.png';
import timeIcon from '@assets/png/retina/ui/hud/icon_time.png';
import pauseIcon from '@assets/png/retina/ui/controls/icon_pause.png';
import type { ExternalStore } from '@/game/bridge/ExternalStore';
import type { MatchView } from '@/game/bridge/MatchView';
import { useExternalStore } from '@/game/bridge/useExternalStore';
import type { MatchSnapshot } from '@/game/sim/match/types';
import { describeDuration, formatClock } from './formatTime';
import { MatchAnnouncer } from './MatchAnnouncer';
import './hud.css';

/** Fill area of health_frame.png, from the UI atlas metadata (`fill_rect`, logical pixels of a 256 px bar). */
const HEALTH_FILL_START = 30 / 256;
const HEALTH_FILL_WIDTH = 196 / 256;

function healthFillFor(ratio: number): string {
  if (ratio >= 0.5) return healthFillGreen;
  if (ratio >= 0.25) return healthFillAmber;
  return healthFillRed;
}

interface HudProps {
  readonly store: ExternalStore<MatchView>;
  readonly onPause: () => void;
  /** Extra buttons shown next to the pause button (e.g. the sound toggle). */
  readonly extraControls?: ReactNode;
  /** Called on every render; lets integration tests prove the HUD does not re-render each frame. */
  readonly onRender?: () => void;
}

/** Heads-up display: health, score, time left and the pause button, plus a semantic summary for assistive tech. */
export function Hud({ store, onPause, extraControls, onRender }: HudProps) {
  const match = useExternalStore(store);
  onRender?.();
  const healthRatio = match.maxHealth > 0 ? match.health / match.maxHealth : 0;
  const clipRight = (1 - (HEALTH_FILL_START + HEALTH_FILL_WIDTH * healthRatio)) * 100;

  return (
    <div className="hud">
      {/* Health, score and time: separate plaques on large screens, one slim ribbon on compact ones (hud.css). */}
      <div className="hud__status">
        <div className="hud__health" aria-hidden="true">
          <img className="hud__heart" src={heartIcon} alt="" />
          <div className="hud__bar">
            <img src={healthFrame} alt="" />
            <img
              className="hud__bar-fill"
              src={healthFillFor(healthRatio)}
              alt=""
              style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
            />
            <span className="hud__bar-label">
              {match.health} / {match.maxHealth}
            </span>
          </div>
        </div>
        <div className="hud__counters" aria-hidden="true">
          <div className="hud__counter">
            <img src={scoreIcon} alt="" />
            <span data-testid="hud-score">{match.score}</span>
          </div>
          <div className="hud__counter">
            <img src={timeIcon} alt="" />
            <span data-testid="hud-time">{formatClock(match.remainingSeconds)}</span>
          </div>
        </div>
      </div>
      {extraControls}
      <button
        type="button"
        className="round-button hud__pause"
        onClick={onPause}
        aria-label="Pause"
        disabled={match.status !== 'running'}
      >
        <img src={pauseIcon} alt="" />
      </button>
      <MatchStatusSummary match={match} />
    </div>
  );
}

/** Screen-reader view of the match: a static summary plus a polite live region with throttled announcements. */
function MatchStatusSummary({ match }: { readonly match: MatchSnapshot }) {
  const announcer = useRef(new MatchAnnouncer());
  const previous = useRef<MatchSnapshot | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const message = announcer.current.announcementFor(previous.current, match, performance.now());
    previous.current = match;
    if (message) setAnnouncement(message);
  }, [match]);

  return (
    <section className="visually-hidden" aria-label="Match status" data-testid="match-status">
      <dl>
        <dt>Status</dt>
        <dd data-testid="match-status-value">{match.status}</dd>
        <dt>Score</dt>
        <dd>{match.score}</dd>
        <dt>Time left</dt>
        <dd>{describeDuration(match.remainingSeconds)}</dd>
        <dt>Health</dt>
        <dd>
          {match.health} of {match.maxHealth}
        </dd>
      </dl>
      <p role="status" aria-live="polite" aria-atomic="true" data-testid="match-announcement">
        {announcement}
      </p>
    </section>
  );
}
