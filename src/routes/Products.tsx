import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useCategories, useCategoryFilter, useProducts } from "../lib/hooks";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { CategorySelector } from "../components/ui/CategoryPill";
import { Card } from "../components/ui/Card";
import { Pagination } from "../components/ui/Pagination";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { ProductModal } from "../components/ProductModal";

const PAGE_SIZE = 10;

export default function Products() {
  const categories = useCategories();
  const categoryFilter = useCategoryFilter();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<number | undefined>(undefined);

  const products = useProducts({
    q: query || undefined,
    categories: categoryFilter.selected.length ? categoryFilter.selected : undefined,
    limit: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  }

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

        <Card className="products__filter">
          {categories.status === "success" && (
            <CategorySelector
              categories={categories.data}
              selected={categoryFilter.selected}
              onToggle={(slug) => {
                categoryFilter.toggle(slug);
                setPage(1);
              }}
              onClear={() => {
                categoryFilter.clear();
                setPage(1);
              }}
            />
          )}
        </Card>

        {products.status === "loading" || products.status === "idle" ? (
          <PageSpinner label="Loading products" />
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
              onPrev={() => setPage((n) => Math.max(1, n - 1))}
              onNext={() => setPage((n) => Math.min(totalPages, n + 1))}
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