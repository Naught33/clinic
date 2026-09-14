import { useState, type FormEvent } from "react";
import { useProductMutations } from "../lib/hooks";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface ProductFormValues {
  title: string;
  price: string;
  stock: string;
  description: string;
}

interface ProductFormModalProps {
  /** When provided the modal edits this product, otherwise it creates a new one. */
  product?: {
    id: number;
    title?: string;
    price?: number;
    stock?: number;
    description?: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: ProductFormModalProps) {
  const mutations = useProductMutations();
  const isEdit = product != null;

  const [values, setValues] = useState<ProductFormValues>({
    title: product?.title ?? "",
    price: product?.price != null ? String(product.price) : "",
    stock: product?.stock != null ? String(product.stock) : "",
    description: product?.description ?? "",
  });

  function set(field: keyof ProductFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      title: values.title.trim(),
      price: values.price ? Number(values.price) : undefined,
      stock: values.stock ? Number(values.stock) : undefined,
      description: values.description.trim() || undefined,
    };

    const result = isEdit
      ? await mutations.update(product.id, payload)
      : await mutations.create(payload);

    if (result) {
      onSaved();
    }
  }

  return (
    <Modal title={isEdit ? "Edit Product" : "Add Product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal__form">
        <div>
          <label htmlFor="product-title" className="form-label">
            Title
          </label>
          <Input
            id="product-title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>

        <div className="modal__row">
          <div>
            <label htmlFor="product-price" className="form-label">
              Price
            </label>
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="product-stock" className="form-label">
              Stock
            </label>
            <Input
              id="product-stock"
              type="number"
              min="0"
              value={values.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="product-description" className="form-label">
            Description
          </label>
          <textarea
            id="product-description"
            className="textarea"
            rows={4}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {mutations.status === "error" && <p className="form-error">{mutations.error.message}</p>}

        <div className="modal__actions">
          <Button
            type="submit"
            loading={mutations.status === "loading"}
            disabled={mutations.status === "loading"}
          >
            {isEdit ? "Save changes" : "Create product"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
