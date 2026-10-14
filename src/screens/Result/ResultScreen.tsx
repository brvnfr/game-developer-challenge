import type { MatchResult } from '@/game/sim/match/types';
import { describeDuration, formatClock } from '@/ui/hud/formatTime';
import { useFocusOnMount } from '@/ui/useFocusOnMount';

const END_REASON_TEXT: Record<MatchResult['endReason'], string> = {
  timeUp: "Time's up",
  playerDestroyed: 'Your ship was destroyed',
};

interface ResultScreenProps {
  readonly result: MatchResult;
  readonly onPlayAgain: () => void;
  readonly onMainMenu: () => void;
}

/** Match result (minimal version; registration status and persistence arrive in later milestones). */
export function ResultScreen({ result, onPlayAgain, onMainMenu }: ResultScreenProps) {
  const playedSeconds = Math.round(result.durationMs / 1000);
  const playAgainRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <main className="menu-screen">
      <div className="panel menu-panel" aria-labelledby="result-title">
        <h1 id="result-title" className="panel__title">
          {END_REASON_TEXT[result.endReason]}
        </h1>
        <dl className="result-stats">
          <div>
            <dt>Score</dt>
            <dd data-testid="result-score">{result.score}</dd>
          </div>
          <div>
            <dt>Time played</dt>
            <dd data-testid="result-time" aria-label={describeDuration(playedSeconds)}>
              {formatClock(playedSeconds)}
            </dd>
          </div>
        </dl>
        <button ref={playAgainRef} type="button" className="primary-button" onClick={onPlayAgain}>
          Play Again
        </button>
        <button type="button" className="secondary-button" onClick={onMainMenu}>
          Main Menu
        </button>
      </div>
    </main>
  );
}
