import { useProductPreview } from "../lib/hooks";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { PageSpinner } from "./ui/Spinner";
import { Icon } from "./ui/Icon";

interface ProductModalProps {
  id: number;
  onClose: () => void;
  onExpand: () => void;
}

/**
 * Preview panel for the Products grid. Always fetches fresh (see
 * useProductPreview's forceRefresh default) so price/stock/description
 * can't be stale relative to the grid's cached list data.
 */
export function ProductModal({ id, onClose, onExpand }: ProductModalProps) {
  const preview = useProductPreview(id);

  return (
    <Card className="preview-panel">
      {preview.status === "loading" || preview.status === "idle" ? (
        <PageSpinner label="Loading preview" />
      ) : preview.status === "error" ? (
        <div className="preview-error">
          <Icon name="alert" size={20} className="icon--clinic-red" />
          <p className="preview-error__text">{preview.error.message}</p>
        </div>
      ) : (
        <>
          <div className="preview-panel__thumb">
            {preview.data.thumbnail ? (
              <img
                src={preview.data.thumbnail}
                alt={preview.data.title}
                className="preview-panel__img"
              />
            ) : (
              <Icon name="image" size={32} />
            )}
          </div>
          <div className="preview-panel__body">
            <h3 className="preview-panel__title">{preview.data.title}</h3>
            <p className="preview-panel__price">$ {preview.data.price?.toFixed(2) ?? "—"}</p>
            <p className="preview-panel__desc">
              {preview.data.description ?? "No description available."}
            </p>
            <p className="preview-panel__stock">{preview.data.stock} left</p>

            <div className="preview-panel__actions">
              <Button variant="primary" size="sm" onClick={onExpand} className="flex-1">
                Expand Item
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}