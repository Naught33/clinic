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
    <Card className="sticky top-0 hidden w-72 shrink-0 flex-col overflow-hidden lg:flex xl:w-80">
      {preview.status === "loading" || preview.status === "idle" ? (
        <PageSpinner label="Loading preview" />
      ) : preview.status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Icon name="alert" size={20} className="text-clinic-red" />
          <p className="text-[13px] text-ink-soft dark:text-surface/60">{preview.error.message}</p>
        </div>
      ) : (
        <>
          <div className="flex aspect-square items-center justify-center bg-surface text-ink-soft/40 dark:bg-surface-dark">
            {preview.data.thumbnail ? (
              <img
                src={preview.data.thumbnail}
                alt={preview.data.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Icon name="image" size={32} />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-4">
            <h3 className="font-display text-lg font-bold text-ink dark:text-white">
              {preview.data.title}
            </h3>
            <p className="font-mono text-xl font-bold text-ink dark:text-white">
              $ {preview.data.price?.toFixed(2) ?? "—"}
            </p>
            <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-soft dark:text-surface/60">
              {preview.data.description ?? "No description available."}
            </p>
            <p className="mt-1 text-[13px] font-medium text-clinic-green dark:text-clinic-green-dark">
              {preview.data.stock} left
            </p>

            <div className="mt-auto flex gap-2 pt-4">
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
