import type { MatchResult } from '@/game/sim/match/types';
import { Button } from '@/ui/components/Button';
import { MenuLayout } from '@/ui/components/MenuLayout';
import { formatClock } from '@/ui/hud/formatTime';
import { END_REASON_LABELS, isoDuration, playedSecondsOf, RESULT_TITLES } from '@/ui/matchResultText';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import { RegistrationStatus } from './RegistrationStatus';

interface ResultScreenProps {
  readonly result: MatchResult;
  readonly onPlayAgain: () => void;
  readonly onMainMenu: () => void;
}

/**
 * Result of a completed match: total score, time played, why it ended and whether it reached the Captain's Log.
 * Survives a page refresh.
 */
export function ResultScreen({ result, onPlayAgain, onMainMenu }: ResultScreenProps) {
  const playedSeconds = playedSecondsOf(result);
  const playAgainRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <MenuLayout labelledBy="result-title">
      <h1 id="result-title" className="panel__title">
        {RESULT_TITLES[result.endReason]}
      </h1>
      <p className="result__score" data-testid="result-score">
        {result.score}
      </p>
      <p className="result__details">
        <span>{result.score === 1 ? 'Point' : 'Points'}</span>
        {' · '}
        <span className="visually-hidden">Time played </span>
        <time dateTime={isoDuration(playedSeconds)} data-testid="result-time">
          {formatClock(playedSeconds)}
        </time>
        {' · '}
        <span className="visually-hidden">Ended by </span>
        <span data-testid="result-reason">{END_REASON_LABELS[result.endReason]}</span>
      </p>
      <RegistrationStatus matchId={result.matchId} />
      <div className="menu-panel__actions">
        <Button ref={playAgainRef} onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button onClick={onMainMenu}>Main Menu</Button>
      </div>
    </MenuLayout>
  );
}
