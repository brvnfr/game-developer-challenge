import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@/api/ApiError';
import { Button } from './Button';

interface RemoteListProps<Data> {
  readonly query: UseQueryResult<Data>;
  /** What the list is, for messages ("the ranking"). */
  readonly subject: string;
  readonly isEmpty: (data: Data) => boolean;
  readonly emptyMessage: string;
  readonly skeletonRows?: number;
  readonly children: (data: Data) => ReactNode;
  readonly testId: string;
}

/**
 * The states of a remote list: first load (skeleton, aria-busy), error with Retry, empty, data, and a background
 * refresh indicator. A failed refresh keeps the last data on screen and says so.
 */
export function RemoteList<Data>({
  query,
  subject,
  isEmpty,
  emptyMessage,
  skeletonRows = 5,
  children,
  testId,
}: RemoteListProps<Data>) {
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = query;
  const retry = () => void refetch();
  const isRefreshing = isFetching && !isPending;

  let content: ReactNode;
  if (data === undefined) {
    content = error ? (
      <div role="alert" className="remote-list__error">
        <p>
          Could not load {subject}. {ApiError.from(error).userMessage}
        </p>
        <Button variant="small" onClick={retry}>
          Retry
        </Button>
      </div>
    ) : (
      <div className="remote-list__skeleton" aria-hidden="true">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <div key={index} className="remote-list__skeleton-row" />
        ))}
      </div>
    );
  } else if (isEmpty(data)) {
    content = <p className="remote-list__empty">{emptyMessage}</p>;
  } else {
    content = children(data);
  }

  return (
    <div
      className={isPlaceholderData ? 'remote-list remote-list--stale' : 'remote-list'}
      aria-busy={isPending || isPlaceholderData}
      data-testid={testId}
      data-state={data === undefined ? (error ? 'error' : 'loading') : isEmpty(data) ? 'empty' : 'ready'}
    >
      <p role="status" className="remote-list__status">
        {isPending ? `Loading ${subject}…` : isRefreshing ? `Updating ${subject}…` : ''}
      </p>
      {data !== undefined && error && !isFetching && (
        <div role="alert" className="remote-list__refresh-error">
          <span>Could not refresh {subject}. Showing the last loaded data.</span>
          <Button variant="small" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      {content}
    </div>
  );
}
