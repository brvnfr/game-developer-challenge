import { useSubmissionStatus, type SubmissionStatus } from '@/remote/hooks';
import { useRemoteServices } from '@/remote/remoteServicesContext';
import { Button } from '@/ui/components/Button';

function describe(status: SubmissionStatus): string {
  switch (status.kind) {
    case 'saved':
      return "Saved to the Captain's Log.";
    case 'sending':
      return "Saving to the Captain's Log…";
    case 'queued':
      return 'Waiting to be saved…';
    case 'retrying':
      return `Not saved yet: ${status.submission.lastFailure?.message ?? ''} It will be retried automatically.`;
    case 'failed':
      return `Could not be saved: ${status.submission.lastFailure?.message ?? ''}`;
    case 'unknown':
      return '';
  }
}

/**
 * Where the completed match is on its way to the ranking and history. Saving never blocks the screen: the
 * player can play again or leave while it is pending, and it keeps being retried in the background.
 */
export function RegistrationStatus({ matchId }: { readonly matchId: string }) {
  const status = useSubmissionStatus(matchId);
  const { registrar } = useRemoteServices();
  const canRetry = status.kind === 'retrying' || status.kind === 'failed';
  return (
    <div className="registration" data-testid="registration" data-state={status.kind}>
      <p role="status" className={canRetry ? 'registration__text registration__text--problem' : 'registration__text'}>
        {describe(status)}
      </p>
      {canRetry && (
        <Button variant="small" onClick={() => registrar.retry(matchId)}>
          Retry now
        </Button>
      )}
    </div>
  );
}
