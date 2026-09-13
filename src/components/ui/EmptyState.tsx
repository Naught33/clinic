import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "search", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-soft dark:bg-surface-dark dark:text-surface/60">
        <Icon name={icon} size={20} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink dark:text-white">{title}</p>
        {description && (
          <p className="max-w-xs text-[13px] text-ink-soft dark:text-surface/60">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
