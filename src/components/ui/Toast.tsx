import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./Icon";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  /** Fire a toast. Success/error map to green/red; info stays neutral ink. */
  notify: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { toast: string; icon: IconName; iconWrap: string }> = {
  success: { toast: "toast--success", icon: "check", iconWrap: "toast__icon--success" },
  error: { toast: "toast--error", icon: "alert", iconWrap: "toast__icon--error" },
  info: { toast: "toast--info", icon: "alert", iconWrap: "toast__icon--info" },
};

const AUTO_DISMISS_MS = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, description?: string) =>
      notify({ variant: "success", title, description }),
    [notify],
  );

  const error = useCallback(
    (title: string, description?: string) =>
      notify({ variant: "error", title, description }),
    [notify],
  );

  const value = useMemo(() => ({ notify, success, error }), [notify, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <div key={toast.id} role="status" className={`toast ${style.toast}`}>
              <span className={`toast__icon ${style.iconWrap}`}>
                <Icon name={style.icon} size={13} />
              </span>
              <div className="toast__content">
                <p className="toast__title">{toast.title}</p>
                {toast.description && <p className="toast__desc">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="toast__close"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}