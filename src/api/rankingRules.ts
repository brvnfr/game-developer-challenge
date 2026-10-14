import type { MatchRecord, Page, PageRequest } from './contracts';

/**
 * Ranking order (ADR-011), fully deterministic:
 * 1. more points first;
 * 2. same points: the shorter match first (the points were scored faster);
 * 3. still tied: the match that ended first (it reached the score earlier in real time);
 * 4. finally the match id, so two different matches never compare as equal.
 */
export function compareForRanking(
  first: Pick<MatchRecord, 'score' | 'durationMs' | 'endedAt' | 'matchId'>,
  second: Pick<MatchRecord, 'score' | 'durationMs' | 'endedAt' | 'matchId'>,
): number {
  return (
    second.score - first.score ||
    first.durationMs - second.durationMs ||
    Date.parse(first.endedAt) - Date.parse(second.endedAt) ||
    (first.matchId < second.matchId ? -1 : first.matchId > second.matchId ? 1 : 0)
  );
}

/** Newest first, then by match id (stable order for matches that ended at the same instant). */
export function compareForHistory(first: MatchRecord, second: MatchRecord): number {
  return (
    Date.parse(second.endedAt) - Date.parse(first.endedAt) ||
    (first.matchId < second.matchId ? -1 : first.matchId > second.matchId ? 1 : 0)
  );
}

/** Slices an already sorted list. Pages are 1-based; a page past the end is empty but keeps the totals. */
export function paginate<Item>(
  sortedItems: readonly Item[],
  { page, pageSize }: PageRequest,
  generatedAt: Date,
): Page<Item> {
  const start = (page - 1) * pageSize;
  return {
    items: sortedItems.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: sortedItems.length,
    totalPages: Math.ceil(sortedItems.length / pageSize),
    generatedAt: generatedAt.toISOString(),
  };
}
