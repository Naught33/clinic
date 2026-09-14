import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  destructive: "btn--destructive",
  ghost: "btn--ghost",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "btn--sm",
  md: "btn--md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`btn ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className ?? ""}`}
        {...rest}
      >
        {loading && <span className="btn__spinner" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
