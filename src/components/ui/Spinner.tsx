export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`spinner ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="page-spinner">
      <Spinner size={26} />
      <p className="page-spinner__label">{label}</p>
    </div>
  );
}