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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <StatCard value={totalItems ?? "—"} label="Total Items" />
        <StatCard value={totalCategories ?? "—"} label="Total Categories" accent />
        <div className="flex flex-[1.4] items-center">
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

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink dark:text-white">Stock Informatics</h2>
          <div className="flex items-center gap-2">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[13px] text-ink-soft dark:border-line-dark dark:text-surface/60">
                  <th className="py-2 pr-4 font-medium">id</th>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Stock</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-line last:border-0 dark:border-line-dark"
                  >
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-ink-soft dark:text-surface/60">
                      {p.id}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-ink dark:text-white">{p.title}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`font-mono text-[13px] font-medium ${
                          p.stock < 5
                            ? "text-clinic-red"
                            : "text-clinic-green dark:text-clinic-green-dark"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <Link
                        to={`/products/${p.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-soft transition-colors hover:bg-surface hover:text-ink dark:text-surface/60 dark:hover:bg-surface-dark dark:hover:text-white"
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

        <div className="mt-4">
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
