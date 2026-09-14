import { forwardRef, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: "search" | "user";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className, ...rest }, ref) => {
    return (
      <div className="input-wrap">
        {icon && (
          <span className="input-wrap__icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        <input
          ref={ref}
          className={`input${icon ? " input--with-icon" : ""} ${className ?? ""}`}
          {...rest}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
