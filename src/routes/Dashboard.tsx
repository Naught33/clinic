import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useCategories, useLowStockProducts, useProducts } from "../lib/hooks";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Pagination } from "../components/ui/Pagination";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";

const THRESHOLDS = [10, 20, 50, 100];
const PAGE_SIZE = 8;

export default function Dashboard() {
  const categories = useCategories();
  const totals = useProducts({ limit: 1 });

  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [threshold, setThreshold] = useState(10);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { lowStock, status } = useLowStockProducts(threshold, order);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lowStock;
    return lowStock.filter((p) => p.title.toLowerCase().includes(q));
  }, [lowStock, search]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalItems = totals.status === "success" ? totals.data.total : undefined;
  const totalCategories = categories.status === "success" ? categories.data.length : undefined;

  return (
    <div className="dashboard">
      <div className="dashboard__stats-row">
        <StatCard value={totalItems ?? "—"} label="Total Items" />
        <StatCard value={totalCategories ?? "—"} label="Total Categories" accent />
        <div className="dashboard__search">
          <Input
            icon="search"
            placeholder="Medicrill"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card className="dash-card">
        <div className="dashboard-card__head">
          <h2 className="dashboard-card__title">Stock Informatics</h2>
          <div className="dashboard-card__controls">
            <Select
              value={order}
              onChange={(e) => {
                setOrder(e.target.value as "asc" | "desc");
                setPage(1);
              }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Select>
            <Select
              value={threshold}
              onChange={(e) => {
                setThreshold(Number(e.target.value));
                setPage(1);
              }}
            >
              {THRESHOLDS.map((t) => (
                <option key={t} value={t}>
                  {`<${t}`}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {status === "loading" || status === "idle" ? (
          <PageSpinner label="Loading stock levels" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching products"
            description="Try a different search term or raise the stock threshold."
          />
        ) : (
          <div className="dash-table-wrap">
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
                {pageItems.map((p) => (
                  <tr key={p.id}>
                    <td className="dash-table__id">{p.id}</td>
                    <td className="dash-table__title">{p.title}</td>
                    <td>
                      <span
                        className={`dash-table__value ${
                          p.stock < 5 ? "dash-table__value--low" : "dash-table__value--ok"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="dash-table__actions">
                      <Link
                        to={`/products/${p.id}`}
                        className="dash-table__edit"
                        aria-label={`Edit ${p.title}`}
                      >
                        <Icon name="edit" size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="dash-table__pager">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      </Card>
    </div>
  );
}