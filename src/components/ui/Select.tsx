import { forwardRef, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => {
    return (
      <div className="select-wrap">
        <select ref={ref} className={`select ${className ?? ""}`} {...rest}>
          {children}
        </select>
        <Icon name="chevron-down" size={13} className="select-wrap__chevron" />
      </div>
    );
  },
);
Select.displayName = "Select";