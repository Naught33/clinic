import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useProduct, useProductMutations } from "../lib/hooks";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { ProductSkeleton } from "../components/ui/Skeleton";
import { ProductFormModal } from "../components/ProductFormModal";
import { ConfirmModal } from "../components/ui/Confirm";
import { useToast } from "../components/ui/Toast";

type Tab = "info" | "reviews";

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const product = useProduct(id ? Number(id) : undefined);
  const mutations = useProductMutations();
  const { success, error } = useToast();

  const tab: Tab = searchParams.get("tab") === "reviews" ? "reviews" : "info";
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [discountOn, setDiscountOn] = useState(false);

  function handleTabChange(next: Tab) {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "info") nextParams.delete("tab");
    else nextParams.set("tab", "reviews");
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { preventScrollReset: true });
    }
  }

  if (product.status === "loading" || product.status === "idle") {
    return <ProductSkeleton />;
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

  const discount = p.discountPercentage ?? 0;
  const discountActive = discountOn && discount > 0 && p.price != null;
  const finalPrice = discountActive && p.price != null ? p.price * (1 - discount / 100) : p.price;

  async function handleDelete() {
    const ok = await mutations.remove(p.id);
    if (ok) {
      success("Product deleted", `${p.title} has been removed.`);
      navigate("/products");
    } else {
      setConfirmingDelete(false);
      error(
        "Couldn't delete product",
        mutations.status === "error" ? mutations.error.message : "Something went wrong.",
      );
    }
  }

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
    <Card className="product-detail">
      <div className="product-detail__back-row">
        <button type="button" onClick={() => navigate(-1)} className="back-link">
          <Icon name="arrow-left" size={14} />
          Back
        </button>
        <div className="product-detail__actions">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={13} />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Icon name="trash" size={13} />
            Delete
          </Button>
        </div>
      </div>

      <div className="product-layout">
        <div className="product-image">
          {p.thumbnail || p.images?.[0] ? (
            <img
              src={p.thumbnail ?? p.images?.[0]}
              alt={p.title}
              className="product-image__img"
            />
          ) : (
            <Icon name="image" size={36} />
          )}
        </div>

        <div className="product-info">
          <h1 className="product-info__title">{p.title}</h1>
          <p className="product-info__price">
            $ {finalPrice?.toFixed(2) ?? "—"}
            {discountActive && (
              <span className="price-compare">
                <del>$ {p.price?.toFixed(2)}</del>
                <span className="price-compare__save">-{discount.toFixed()}%</span>
              </span>
            )}
          </p>
          <p className="product-info__desc">{p.description}</p>
          <p
            className={`product-info__stock ${
              (p.stock ?? 0) < 5 ? "product-info__stock--low" : "product-info__stock--ok"
            }`}
          >
            {p.stock} Items left
          </p>

          {p.discountPercentage ? (
            <button
              type="button"
              aria-pressed={discountOn}
              onClick={() => setDiscountOn((v) => !v)}
              className={`discount-badge${discountOn ? " is-active" : ""}`}
            >
              <Icon name="check" size={12} className="discount-badge__check" />
              <Icon name="tag" size={13} />
              Apply {p.discountPercentage.toFixed(2)}% Discount
            </button>
          ) : null}
        </div>
      </div>

      <div className="product-tabs">
        {(["info", "reviews"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className={`product-tabs__tab${tab === t ? " is-active" : ""}`}
          >
            {t === "info" ? "Product Information" : "Reviews"}
          </button>
        ))}
      </div>

      <div>
        {tab === "info" ? (
          <dl className="product-details">
            {infoRows.map(([label, value]) => (
              <div key={label} className="product-details__row">
                <dt className="product-details__label">{label}</dt>
                <dd className="product-details__value">{value}</dd>
              </div>
            ))}
            {!!p.tags?.length && (
              <div className="product-details__row">
                <dt className="product-details__label">Tags</dt>
                <dd className="product-details__tags">
                  {p.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        ) : p.reviews?.length ? (
          <ul className="reviews">
            {p.reviews.map((review, i) => (
              <li key={i} className="review">
                <div className="review__head">
                  <p className="review__name">{review.reviewerName}</p>
                  <span className="review__date">{new Date(review.date).toLocaleDateString()}</span>
                </div>
                <div className="review__stars">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Icon
                      key={idx}
                      name="star"
                      size={13}
                      className={idx < review.rating ? undefined : "icon--line"}
                    />
                  ))}
                </div>
                <p className="review__comment">{review.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ paddingTop: 20 }}>
            <EmptyState icon="star" title="No reviews yet" />
          </div>
        )}
      </div>

      {editing && (
        <ProductFormModal
          product={p}
          onClose={() => setEditing(false)}
          onSaved={() => {
            success("Product updated", `${p.title} has been saved.`);
            setEditing(false);
            product.refetch(true);
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmModal
          title="Delete product"
          message={
            <>
              Are you sure you want to delete <strong>{p.title}</strong>? This action cannot be
              undone.
            </>
          }
          confirmLabel="Delete product"
          dangerous
          loading={mutations.status === "loading"}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </Card>
  );
}