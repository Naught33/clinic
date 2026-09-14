import { useState, type ButtonHTMLAttributes } from "react";
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
 *
 * The check glyph is always rendered (invisible when inactive) so toggling
 * a chip never shifts its label or changes its size.
 */
export function CategoryPill({ label, active, className, ...rest }: CategoryPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`category-pill${active ? " is-active" : ""} ${className ?? ""}`}
      {...rest}
    >
      <span className="category-pill__check">
        <Icon name="check" size={12} />
      </span>
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

/**
 * Collapsible category filter. Header always shows the current count; the
 * pill row (and clear action) can be collapsed to free up vertical space.
 */
export function CategorySelector({
  categories,
  selected,
  onToggle,
  onClear,
  className,
}: CategorySelectorProps) {
  const [expanded, setExpanded] = useState(true);

  const summary = selected.length > 0 ? `: ${selected.length} selected` : ": All";

  return (
    <div className={`category-selector ${className ?? ""}`}>
      <div className="category-selector__head">
        <span className="category-selector__label">Categories{summary}</span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide categories" : "Show categories"}
          className="category-selector__toggle"
        >
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} />
        </button>
      </div>

      {expanded && (
        <div className="category-selector__content">
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
      )}
    </div>
  );
}
