import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useCategories, useLowStockProducts, useProducts } from "../lib/hooks";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Icon } from "../components/ui/Icon";
import { StatSkeleton, TableSkeleton } from "../components/ui/Skeleton";
import { StockEditModal } from "../components/StockEditModal";
import { ProductFormModal } from "../components/ProductFormModal";
import { useToast } from "../components/ui/Toast";

const THRESHOLDS = [10, 20, 50, 100];
const PAGE_SIZE = 8;
const SEARCH_DELAY = 350;

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Home page state lives in the URL too, so a given stock view (search term,
 * threshold, sort order, and page) can be shared, reloaded, or restored
 * after a session expiry:  /dashboard?q=vit&threshold=20&order=desc&page=2
 *
 * The URL is the single source of truth for threshold/order/page; only the
 * search text box is local (it commits to the URL after a short debounce).
 */
export default function Dashboard() {
  const categories = useCategories();
  const totals = useProducts({ limit: 1 });
  const { success } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const threshold = THRESHOLDS.includes(Number(searchParams.get("threshold")))
    ? Number(searchParams.get("threshold"))
    : 10;
  const order: "asc" | "desc" = searchParams.get("order") === "desc" ? "desc" : "asc";
  const urlQuery = searchParams.get("q") ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);

  const [search, setSearch] = useState(urlQuery);
  const [stockTarget, setStockTarget] = useState<{
    id: number;
    title: string;
    stock: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  // Back/forward: resync the text box with the committed URL term.
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearch(urlQuery);
  }

  function updateParams(
    patch: Record<string, string | number | undefined>,
    opts?: { replace?: boolean },
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { preventScrollReset: true, replace: opts?.replace });
  }

  // Debounced as-you-type search: the dashboard filters its cached list
  // instantly; the URL only gets the committed term. `replace` keeps
  // intermediate keystrokes out of browser history. Page only resets when
  // the term actually changed — see Products.tsx for the reload rationale.
  useEffect(() => {
    const id = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed === urlQuery) {
        updateParams({ q: trimmed || undefined }, { replace: true });
      } else {
        updateParams({ q: trimmed || undefined, page: 1 }, { replace: true });
      }
    }, SEARCH_DELAY);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stockLevels = useLowStockProducts(threshold, order);
  const { lowStock, status, refetch } = stockLevels;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lowStock;
    return lowStock.filter((p) => p.title.toLowerCase().includes(q));
  }, [lowStock, search]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalItems = totals.status === "success" ? totals.data.total : undefined;
  const totalCategories = categories.status === "success" ? categories.data.length : undefined;
  const statsLoading = totals.status === "loading" || totals.status === "idle";

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    updateParams({ q: search.trim() || undefined, page: 1 });
    refetch(true);
  }

  return (
    <div className="dashboard">
      <div className="dashboard__top-row">
        <form onSubmit={handleSearch} className="dashboard__search-row">
          <Input
            icon="search"
            placeholder="Medicrill"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" size="md" aria-label="Search products">
            <Icon name="search" size={16} />
          </Button>
        </form>

        <Button type="button" variant="secondary" size="md" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} />
          Add Product
        </Button>
      </div>

      <div className="dashboard__stats-row">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard value={totalItems ?? "—"} label="Total Items" />
            <StatCard value={totalCategories ?? "—"} label="Total Categories" accent />
          </>
        )}
      </div>

      <Card className="dash-card">
        <div className="dashboard-card__head">
          <h2 className="dashboard-card__title">Stock Informatics</h2>
          <div className="dashboard-card__controls">
            <Select
              value={order}
              onChange={(e) => updateParams({ order: e.target.value as "asc" | "desc", page: 1 })}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Select>
            <Select
              value={threshold}
              onChange={(e) => updateParams({ threshold: Number(e.target.value), page: 1 })}
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
          <TableSkeleton />
        ) : stockLevels.status === "error" ? (
          <ErrorState
            title="Couldn't load stock levels"
            code={stockLevels.error.status}
            message={stockLevels.error.message}
            onRetry={() => stockLevels.refetch(true)}
          />
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
                    <td>
                      <Link to={`/products/${p.id}`} className="dash-table__title">
                        {p.title}
                      </Link>
                    </td>
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
                      <button
                        type="button"
                        onClick={() => setStockTarget({ id: p.id, title: p.title, stock: p.stock })}
                        className="dash-table__edit"
                        aria-label={`Edit ${p.title} stock`}
                        title="Edit stock"
                      >
                        <Icon name="edit" size={15} />
                      </button>
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
            onPrev={() => updateParams({ page: Math.max(1, page - 1) })}
            onNext={() => updateParams({ page: Math.min(totalPages, page + 1) })}
          />
        </div>
      </Card>

      {stockTarget && (
        <StockEditModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onSaved={() => {
            success("Stock updated", `${stockTarget.title} is now at ${stockTarget.stock}.`);
            setStockTarget(null);
            refetch(true);
            totals.refetch(true);
          }}
        />
      )}

      {creating && (
        <ProductFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            success("Product created", `Your new product has been added.`);
            setCreating(false);
            refetch(true);
            totals.refetch(true);
          }}
        />
      )}
    </div>
  );
}
