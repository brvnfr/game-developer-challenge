import { describeDateTime, formatDayMonth, formatTimeOfDay } from '@/ui/formatDate';

/** "08 SEP · 21:42" in the player's time zone; the full date is in the tooltip and the `<time>` element. */
export function MatchDateCell({ endedAt }: { readonly endedAt: string }) {
  return (
    <td className="log-table__date">
      <time dateTime={endedAt} title={describeDateTime(endedAt)}>
        <span className="log-table__day">{formatDayMonth(endedAt)}</span>
        <span className="log-table__time"> · {formatTimeOfDay(endedAt)}</span>
      </time>
    </td>
  );
}
