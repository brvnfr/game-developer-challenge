import { Button } from '@/ui/components/Button';
import { useFocusOnMount } from '@/ui/useFocusOnMount';
import type { GameAssetsState } from './useGameAssets';

interface LoadingViewProps {
  readonly state: Exclude<GameAssetsState, { status: 'ready' }>;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}

/** Visible, accessible loading progress, and the error with a retry action when loading fails. */
export function LoadingView({ state, onRetry, onBack }: LoadingViewProps) {
  if (state.status === 'error') return <LoadingErrorView message={state.message} onRetry={onRetry} onBack={onBack} />;
  return <LoadingProgressView progress={state.progress} />;
}

function LoadingErrorView({
  message,
  onRetry,
  onBack,
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}) {
  const retryRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <div className="screen-center">
      <div className="panel loading-panel" role="alert">
        <h2 className="panel__title">Could not load the game</h2>
        <p>{message} Check your connection and try again.</p>
        <Button ref={retryRef} onClick={onRetry}>
          Retry
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Main Menu
        </Button>
      </div>
    </div>
  );
}

function LoadingProgressView({ progress }: { readonly progress: number }) {
  const percent = Math.round(progress * 100);
  return (
    <div className="screen-center">
      <div className="panel loading-panel">
        <h2 className="panel__title" id="loading-title">
          Loading the fleet…
        </h2>
        <div
          className="progress"
          role="progressbar"
          aria-labelledby="loading-title"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <p aria-hidden="true">{percent}%</p>
      </div>
    </div>
  );
}
