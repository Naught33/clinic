import type { ReactNode } from "react";

export function StatCard({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-line bg-white px-6 py-6 shadow-panel dark:border-line-dark dark:bg-[#161A18]">
      <p
        className={`font-display text-4xl font-bold tabular-nums ${
          accent ? "text-clinic-green dark:text-clinic-green-dark" : "text-ink dark:text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-[13px] font-medium text-ink-soft dark:text-surface/60">{label}</p>
    </div>
  );
}
