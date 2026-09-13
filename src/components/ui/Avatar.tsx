export function Avatar({ src, name, size = 40 }: { src?: string; name?: string; size?: number }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-ink-soft dark:bg-surface-dark dark:text-surface/70"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name ?? "User avatar"} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-medium">{initial}</span>
      )}
    </div>
  );
}
