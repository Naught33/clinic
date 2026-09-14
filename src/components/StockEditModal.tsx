import { useState, type FormEvent } from "react";
import { useProductMutations } from "../lib/hooks";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface StockEditModalProps {
  product: { id: number; title: string; stock: number };
  onClose: () => void;
  onSaved: () => void;
}

export function StockEditModal({ product, onClose, onSaved }: StockEditModalProps) {
  const mutations = useProductMutations();
  const [stock, setStock] = useState(String(product.stock));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(stock);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    const result = await mutations.update(product.id, { stock: quantity });
    if (result) onSaved();
  }

  return (
    <Modal title="Edit stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal__form">
        <p className="modal__description">
          Update the stock level for <strong>{product.title}</strong>.
        </p>

        <div>
          <label htmlFor="stock-value" className="form-label">
            Stock quantity
          </label>
          <Input
            id="stock-value"
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>

        {mutations.status === "error" && <p className="form-error">{mutations.error.message}</p>}

        <div className="modal__actions">
          <Button
            type="submit"
            loading={mutations.status === "loading"}
            disabled={mutations.status === "loading"}
          >
            Save stock
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
