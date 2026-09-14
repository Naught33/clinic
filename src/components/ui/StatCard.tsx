import type { ReactNode } from "react";

export function StatCard({
  value,
  label,
  accent,
}: {
  value: ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="stat-card">
      <p className={`stat-card__value${accent ? " stat-card__value--accent" : ""}`}>{value}</p>
      <p className="stat-card__label">{label}</p>
    </div>
  );
}
