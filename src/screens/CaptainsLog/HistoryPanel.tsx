import { useState } from 'react';
import type { MatchHistoryPage } from '@/api/contracts';
import { useHistoryPage, useOutbox } from '@/remote/hooks';
import { useRemoteServices } from '@/remote/remoteServicesContext';
import { Button } from '@/ui/components/Button';
import { Pagination } from '@/ui/components/Pagination';
import { RemoteList } from '@/ui/components/RemoteList';
import { describeDateTime, formatDayMonth, formatMatchDuration, formatTimeOfDay } from '@/ui/formatDate';
import { END_REASON_LABELS } from '@/ui/matchResultText';

interface HistoryPanelProps {
  readonly playerId: string;
  readonly playerName: string;
  /** The last completed match, highlighted in the list. */
  readonly highlightMatchId: string | null;
}

/** The player's battles waiting to be saved. They stay here (and are retried) until the server confirms them. */
function PendingSubmissions({ playerId }: { readonly playerId: string }) {
  const { registrar } = useRemoteServices();
  const pending = useOutbox().pending.filter((submission) => submission.request.playerId === playerId);
  if (pending.length === 0) return null;
  return (
    <section className="log-pending" aria-labelledby="log-pending-title" data-testid="pending-submissions">
      <h3 id="log-pending-title" className="log-pending__title">
        Waiting to be saved
      </h3>
      <ul>
        {pending.map(({ request, lastFailure }) => (
          <li key={request.matchId}>
            <span>
              {formatDayMonth(request.endedAt)} · {request.score} points · {END_REASON_LABELS[request.endReason]}
              {lastFailure ? ` — ${lastFailure.message}` : ' — sending…'}
            </span>
            <Button variant="small" onClick={() => registrar.retry(request.matchId)}>
              Retry now
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Match History: the player's confirmed battles, newest first. */
export function HistoryPanel({ playerId, playerName, highlightMatchId }: HistoryPanelProps) {
  const [page, setPage] = useState(1);
  const history = useHistoryPage(playerId, page);

  return (
    <>
      <PendingSubmissions playerId={playerId} />
      <RemoteList
        query={history}
        subject="your match history"
        testId="history-list"
        isEmpty={(data: MatchHistoryPage) => data.items.length === 0}
        emptyMessage={
          page > 1 ? 'No battles on this page.' : 'No battles recorded yet. Finish a match to start your log.'
        }
      >
        {(data) => (
          <table className="log-table">
            <caption className="visually-hidden">
              Match history of {playerName}, page {data.page} of {data.totalPages}
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Points</th>
                <th scope="col">Duration</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((record) => (
                <tr
                  key={record.matchId}
                  className={record.matchId === highlightMatchId ? 'log-table__row--highlight' : undefined}
                >
                  <td className="log-table__date">
                    <time dateTime={record.endedAt} title={describeDateTime(record.endedAt)}>
                      <span className="log-table__day">{formatDayMonth(record.endedAt)}</span>
                      <span className="log-table__time"> · {formatTimeOfDay(record.endedAt)}</span>
                    </time>
                  </td>
                  <td className="log-table__points">{record.score}</td>
                  <td>{formatMatchDuration(record.durationMs)}</td>
                  <td className={`log-table__reason log-table__reason--${record.endReason}`}>
                    {END_REASON_LABELS[record.endReason]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RemoteList>
      <Pagination
        label="Match history pages"
        page={page}
        totalPages={history.data?.totalPages ?? 0}
        onChange={setPage}
      />
    </>
  );
}
