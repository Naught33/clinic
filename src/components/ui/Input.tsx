import { forwardRef, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: "search" | "user";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className, ...rest }, ref) => {
    return (
      <div className="relative flex-1">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60">
            <Icon name={icon} size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={`h-10 w-full rounded border border-line bg-white text-sm text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-clinic-green/60 dark:border-line-dark dark:bg-[#171B19] dark:text-white ${
            icon ? "pl-9 pr-3" : "px-3"
          } ${className ?? ""}`}
          {...rest}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
