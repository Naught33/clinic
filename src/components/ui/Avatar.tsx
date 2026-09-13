export function Avatar({ src, name, size = 40 }: { src?: string; name?: string; size?: number }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name ?? "User avatar"} className="avatar__img" />
      ) : (
        <span className="avatar__text">{initial}</span>
      )}
    </div>
  );
}