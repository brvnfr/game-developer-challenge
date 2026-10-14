import previousIcon from '@assets/png/retina/ui/controls/icon_turn_left.png';
import nextIcon from '@assets/png/retina/ui/controls/icon_turn_right.png';
import { RoundIconButton } from './RoundIconButton';

interface PaginationProps {
  readonly label: string;
  readonly page: number;
  readonly totalPages: number;
  readonly onChange: (page: number) => void;
}

/** "‹ Page 1 of 3 ›". Hidden when everything fits on one page. */
export function Pagination({ label, page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1 && page <= 1) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <RoundIconButton
        icon={previousIcon}
        label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      />
      <span className="pagination__label" aria-live="polite">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <RoundIconButton
        icon={nextIcon}
        label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      />
    </nav>
  );
}
