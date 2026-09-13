export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[2.5px] border-current border-t-transparent text-ink-soft dark:text-surface/50 ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-3 text-ink-soft dark:text-surface/60">
      <Spinner size={26} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
