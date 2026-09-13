import { Icon } from "./Icon";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className="pagination">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="pagination__btn"
      >
        <Icon name="chevron-left" size={14} />
        Prev
      </button>
      <span className="pagination__info">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="pagination__btn"
      >
        Next
        <Icon name="chevron-right" size={14} />
      </button>
    </div>
  );
}