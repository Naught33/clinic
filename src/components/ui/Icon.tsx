import type { SVGProps } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Image,
  LayoutDashboard,
  Moon,
  Pencil,
  Plus,
  Power,
  Search,
  Star,
  Store,
  Sun,
  Tag,
  Trash2,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "dashboard"
  | "store"
  | "power"
  | "search"
  | "x"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "chevron-up"
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

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  store: Store,
  power: Power,
  search: Search,
  x: X,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  sun: Sun,
  moon: Moon,
  edit: Pencil,
  star: Star,
  image: Image,
  tag: Tag,
  check: Check,
  alert: CircleAlert,
  "arrow-left": ArrowLeft,
  user: User,
  plus: Plus,
  trash: Trash2,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/**
 * Thin wrapper around lucide-react so the rest of the app can keep using
 * the generic `<Icon name="..." />` API. Uses `currentColor`, so tint an
 * icon via a text-color className on the icon or an ancestor.
 */
export function Icon({ name, size = 18, className, ...rest }: IconProps) {
  const LucideIcon = ICONS[name];
  return (
    <LucideIcon
      className={`icon ${className ?? ""}`}
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      {...rest}
    />
  );
}