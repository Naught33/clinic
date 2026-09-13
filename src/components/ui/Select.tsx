import { forwardRef, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`h-9 cursor-pointer appearance-none rounded border border-line bg-surface pl-3 pr-8 text-[13px] font-medium text-ink outline-none transition-colors focus:border-clinic-green/60 dark:border-line-dark dark:bg-surface-dark dark:text-white ${className ?? ""}`}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft/60"
        />
      </div>
    );
  },
);
Select.displayName = "Select";
