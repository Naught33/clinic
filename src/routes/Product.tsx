import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useProduct } from "../lib/hooks";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";

type Tab = "info" | "reviews";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProduct(id ? Number(id) : undefined);
  const [tab, setTab] = useState<Tab>("info");

  if (product.status === "loading" || product.status === "idle") {
    return <PageSpinner label="Loading product" />;
  }

  if (product.status === "error") {
    return (
      <EmptyState
        icon="alert"
        title="Couldn't load this product"
        description={product.error.message}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    );
  }

  const p = product.data;
  const infoRows: [string, string][] = [
    ["Brand", p.brand ?? "—"],
    ["Category", p.category ?? "—"],
    ["SKU", p.sku ?? "—"],
    ["Weight", p.weight ? `${p.weight} g` : "—"],
    [
      "Dimensions",
      p.dimensions
        ? `${p.dimensions.width} × ${p.dimensions.height} × ${p.dimensions.depth} cm`
        : "—",
    ],
    ["Warranty", p.warrantyInformation ?? "—"],
    ["Shipping", p.shippingInformation ?? "—"],
    ["Availability", p.availabilityStatus ?? "—"],
    ["Return policy", p.returnPolicy ?? "—"],
    ["Minimum order qty", p.minimumOrderQuantity ? String(p.minimumOrderQuantity) : "—"],
  ];

  return (
    <Card className="mx-auto max-w-4xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink dark:text-surface/60 dark:hover:text-white"
        >
          <Icon name="arrow-left" size={14} />
          Back
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded bg-surface text-ink-soft/40 dark:bg-surface-dark">
          {p.thumbnail || p.images?.[0] ? (
            <img
              src={p.thumbnail ?? p.images?.[0]}
              alt={p.title}
              className="h-full w-full rounded object-cover"
            />
          ) : (
            <Icon name="image" size={36} />
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white">
            {p.title}
          </h1>
          <p className="font-mono text-2xl font-bold text-ink dark:text-white">
            $ {p.price?.toFixed(2) ?? "—"}
          </p>
          <p className="text-sm leading-relaxed text-ink-soft dark:text-surface/60">
            {p.description}
          </p>
          <p
            className={`text-sm font-semibold ${
              (p.stock ?? 0) < 5 ? "text-clinic-red" : "text-clinic-green dark:text-clinic-green-dark"
            }`}
          >
            {p.stock} Items left
          </p>

          {!!p.discountPercentage && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-clinic-green-soft px-3.5 py-1.5 text-[13px] font-semibold text-clinic-green dark:bg-clinic-green-soft-dark dark:text-clinic-green-dark">
              <Icon name="tag" size={13} />
              Apply {p.discountPercentage.toFixed(2)}% Discount
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-6 border-b border-line dark:border-line-dark">
        {(["info", "reviews"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2.5 text-lg font-bold transition-colors ${
              tab === t
                ? "border-ink font-display text-ink dark:border-white dark:text-white"
                : "border-transparent font-display text-ink-soft/50 dark:text-surface/40"
            }`}
          >
            {t === "info" ? "Product Information" : "Reviews"}
          </button>
        ))}
      </div>

      <div className="pt-5">
        {tab === "info" ? (
          <dl className="divide-y divide-line dark:divide-line-dark">
            {infoRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] font-medium text-ink-soft dark:text-surface/60">{label}</dt>
                <dd className="text-right text-sm font-medium text-ink dark:text-white">{value}</dd>
              </div>
            ))}
            {!!p.tags?.length && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] font-medium text-ink-soft dark:text-surface/60">Tags</dt>
                <dd className="flex flex-wrap justify-end gap-1.5">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-soft dark:bg-surface-dark dark:text-surface/70"
                    >
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        ) : p.reviews?.length ? (
          <ul className="space-y-4">
            {p.reviews.map((review, i) => (
              <li key={i} className="border-b border-line pb-4 last:border-0 dark:border-line-dark">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink dark:text-white">
                    {review.reviewerName}
                  </p>
                  <span className="text-[12px] text-ink-soft dark:text-surface/50">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="mb-1.5 flex gap-0.5 text-clinic-green dark:text-clinic-green-dark">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Icon
                      key={idx}
                      name="star"
                      size={13}
                      className={idx < review.rating ? "" : "text-line dark:text-line-dark"}
                    />
                  ))}
                </div>
                <p className="text-[13px] leading-relaxed text-ink-soft dark:text-surface/70">
                  {review.comment}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="star" title="No reviews yet" />
        )}
      </div>
    </Card>
  );
}
