import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useCategories, useProducts } from "../lib/hooks";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { CategorySelector } from "../components/ui/CategoryPill";
import { Card } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { GridSkeleton } from "../components/ui/Skeleton";
import { ProductModal } from "../components/ProductModal";

const PAGE_SIZE = 10;
const SEARCH_DELAY = 350;

type SortBy = "" | "title" | "price" | "stock";
type Order = "asc" | "desc";

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * The whole page state lives in the URL query string so a filtered/paginated
 * result set can be shared, reloaded, or restored after a session expiry:
 *
 *   /products?q=vit&categories=beauty,skin-care&sortBy=price&order=asc&page=2
 *
 * The URL is the single source of truth for everything except the search
 * text box, which stays local so typing is instant (it commits to the URL
 * after a short debounce).
 */
export default function Products() {
  const categories = useCategories();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const urlCategories = (searchParams.get("categories") ?? "").split(",").filter(Boolean);
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const sortBy: SortBy = (searchParams.get("sortBy") ?? "") as SortBy;
  const order: Order = searchParams.get("order") === "desc" ? "desc" : "asc";

  const [searchInput, setSearchInput] = useState(urlQuery);
  const [previewId, setPreviewId] = useState<number | undefined>(undefined);

  // Back/forward: resync the text box with the committed URL term.
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchInput(urlQuery);
  }

  function updateParams(patch: Record<string, string | number | undefined>, opts?: { replace?: boolean }) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { preventScrollReset: true, replace: opts?.replace });
  }

  // Debounced as-you-type search: commit the term (and reset page) to URL.
  // `replace` keeps intermediate keystrokes out of browser history.
  useEffect(() => {
    const id = setTimeout(() => {
      updateParams({ q: searchInput.trim() || undefined, page: 1 }, { replace: true });
    }, SEARCH_DELAY);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    updateParams({ q: searchInput.trim() || undefined, page: 1 });
  }

  function handleToggleCategory(slug: string) {
    const next = urlCategories.includes(slug)
      ? urlCategories.filter((s) => s !== slug)
      : [...urlCategories, slug];
    updateParams({ categories: next.join(",") || undefined, page: 1 });
  }

  function handleClearCategories() {
    updateParams({ categories: undefined, page: 1 });
  }

  function handleSortChange(nextSortBy: SortBy, nextOrder: Order) {
    updateParams({
      sortBy: nextSortBy || undefined,
      order: nextSortBy ? nextOrder : undefined,
      page: 1,
    });
  }

  const products = useProducts({
    q: urlQuery || undefined,
    categories: urlCategories.length ? urlCategories : undefined,
    sortBy: sortBy || undefined,
    order,
    limit: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const list = products.status === "success" ? products.data.products : [];
  const total = products.status === "success" ? products.data.total : 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="products">
      <div className="products__list">
        <form onSubmit={handleSearch} className="products__search">
          <Input
            icon="search"
            placeholder="Medicrill"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" size="md" aria-label="Search products">
            <Icon name="search" size={16} />
          </Button>
        </form>

        <div className="products__sort">
          <Select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortBy, order)}
            aria-label="Sort by"
          >
            <option value="">Default</option>
            <option value="title">Title</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </Select>
          <Select
            value={order}
            onChange={(e) => handleSortChange(sortBy, e.target.value as Order)}
            aria-label="Order"
            disabled={!sortBy}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </Select>
        </div>

        <Card className="products__filter">
          {categories.status === "success" && (
            <CategorySelector
              categories={categories.data}
              selected={urlCategories}
              onToggle={handleToggleCategory}
              onClear={handleClearCategories}
            />
          )}
        </Card>

        {products.status === "loading" || products.status === "idle" ? (
          <GridSkeleton count={8} />
        ) : products.status === "error" ? (
          <EmptyState
            icon="alert"
            title="Couldn't load products"
            description={products.error.message}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try a different search term or clear your category filters."
          />
        ) : (
          <>
            <div className="product-grid">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreviewId(p.id)}
                  className={`product-card${previewId === p.id ? " product-card--open" : ""}`}
                >
                  <div className="product-card__thumb">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.title} className="product-card__img" />
                    ) : (
                      <Icon name="image" size={28} />
                    )}
                  </div>
                  <div className="product-card__body">
                    <p className="product-card__title">{p.title}</p>
                    <p className="product-card__price">$ {p.price?.toFixed(2) ?? "—"}</p>
                    <p className="product-card__stock">{p.stock} left</p>
                  </div>
                </button>
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => updateParams({ page: Math.max(1, page - 1) })}
              onNext={() => updateParams({ page: Math.min(totalPages, page + 1) })}
            />
          </>
        )}
      </div>

      {previewId !== undefined && (
        <ProductModal
          id={previewId}
          onClose={() => setPreviewId(undefined)}
          onExpand={() => navigate(`/products/${previewId}`)}
        />
      )}
    </div>
  );
}