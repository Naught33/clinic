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
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="empty-state__body">
        <p className="empty-state__title">{title}</p>
        {description && <p className="empty-state__desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}
