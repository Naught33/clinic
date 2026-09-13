import type { SVGProps } from "react";

export type IconName =
  | "dashboard"
  | "store"
  | "power"
  | "search"
  | "x"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "sun"
  | "moon"
  | "edit"
  | "star"
  | "image"
  | "tag"
  | "check"
  | "alert"
  | "arrow-left"
  | "user"
  | "plus"
  | "trash";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/**
 * Renders one symbol from /icons.svg. Uses `currentColor`, so tint it with
 * a text-color className on the icon itself or an ancestor.
 */
export function Icon({ name, size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      className={`icon ${className ?? ""}`}
      width={size}
      height={size}
      aria-hidden="true"
      {...rest}
    >
      <use href={`/icons.svg#icon-${name}`} />
    </svg>
  );
}
