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
      className={`category-pill${active ? " is-active" : ""} ${className ?? ""}`}
      {...rest}
    >
      {active && <Icon name="check" size={12} />}
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
    <div className={`category-selector ${className ?? ""}`}>
      <span className="category-selector__label">
        Categories{selected.length > 0 ? `: ${selected.length}` : ""}
      </span>
      <div className="category-selector__pills">
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
        <button type="button" onClick={onClear} className="category-selector__clear">
          Clear
        </button>
      )}
    </div>
  );
}