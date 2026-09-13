import { Icon } from "./Icon";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-1 pt-4 dark:border-line-dark">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1 rounded border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-line-dark dark:text-white"
      >
        <Icon name="chevron-left" size={14} />
        Prev
      </button>
      <span className="font-mono text-[13px] text-ink-soft dark:text-surface/60">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="inline-flex h-9 items-center gap-1 rounded border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-line-dark dark:text-white"
      >
        Next
        <Icon name="chevron-right" size={14} />
      </button>
    </div>
  );
}
