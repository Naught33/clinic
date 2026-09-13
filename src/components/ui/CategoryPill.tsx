import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface CategoryPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

/**
 * Single category chip. Both states live in the same green family so the
 * row reads as one control, not a traffic-light of unrelated colors:
 *  - inactive: hairline green outline, transparent fill, muted green text
 *  - active:   solid light-green fill, deeper green text, check glyph
 */
export function CategoryPill({ label, active, className, ...rest }: CategoryPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 ${
        active
          ? "border-clinic-green/40 bg-clinic-green-soft text-clinic-green dark:border-clinic-green-dark/40 dark:bg-clinic-green-soft-dark dark:text-clinic-green-dark"
          : "border-clinic-green/25 bg-transparent text-ink-soft hover:border-clinic-green/50 hover:text-clinic-green dark:border-clinic-green-dark/25 dark:text-surface/70 dark:hover:text-clinic-green-dark"
      } ${className ?? ""}`}
      {...rest}
    >
      {active && <Icon name="check" size={12} className="shrink-0" />}
      {label}
    </button>
  );
}

interface CategorySelectorProps {
  categories: { slug: string; name: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear?: () => void;
  className?: string;
}

/** Scrollable row of CategoryPill, plus a count + clear-all affordance. */
export function CategorySelector({
  categories,
  selected,
  onToggle,
  onClear,
  className,
}: CategorySelectorProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="mr-1 text-[13px] font-medium text-ink-soft dark:text-surface/70">
        Categories{selected.length > 0 ? `: ${selected.length}` : ""}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <CategoryPill
            key={c.slug}
            label={c.name}
            active={selected.includes(c.slug)}
            onClick={() => onToggle(c.slug)}
          />
        ))}
      </div>
      {selected.length > 0 && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-[13px] font-medium text-ink-soft underline decoration-line underline-offset-2 hover:text-clinic-red dark:text-surface/60"
        >
          Clear
        </button>
      )}
    </div>
  );
}
