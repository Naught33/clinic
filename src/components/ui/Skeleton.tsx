import { Card } from "./Card";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className ?? ""}`} style={style} />;
}

export function StatSkeleton() {
  return (
    <div className="stat-card stat-card--skeleton" aria-hidden="true">
      <span className="skeleton" style={{ width: 64, height: 36 }} />
      <span className="skeleton" style={{ width: 96, height: 14 }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="dash-table-wrap" aria-hidden="true">
      <table className="dash-table">
        <thead>
          <tr>
            <th>id</th>
            <th>Title</th>
            <th>Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td>
                <span className="skeleton" style={{ width: 36, height: 12 }} />
              </td>
              <td>
                <span className="skeleton" style={{ width: "55%", height: 12 }} />
              </td>
              <td>
                <span className="skeleton" style={{ width: 44, height: 12 }} />
              </td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-card">
          <div className="product-card__thumb">
            <span className="skeleton" style={{ width: "100%", height: "100%", borderRadius: 0 }} />
          </div>
          <div className="product-card__body">
            <span className="skeleton" style={{ width: "80%", height: 11 }} />
            <span className="skeleton" style={{ width: 56, height: 11 }} />
            <span className="skeleton" style={{ width: 64, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <Card className="product-detail" aria-hidden="true">
      <div className="product-detail__back-row">
        <span className="skeleton" style={{ width: 80, height: 14 }} />
      </div>
      <div className="product-layout">
        <div className="product-image">
          <span className="skeleton" style={{ width: "100%", height: "100%", borderRadius: 6 }} />
        </div>
        <div className="product-info">
          <span className="skeleton" style={{ width: "75%", height: 26 }} />
          <span className="skeleton" style={{ width: 128, height: 22 }} />
          <span className="skeleton" style={{ width: "100%", height: 12 }} />
          <span className="skeleton" style={{ width: "100%", height: 12 }} />
          <span className="skeleton" style={{ width: "60%", height: 12 }} />
        </div>
      </div>
    </Card>
  );
}