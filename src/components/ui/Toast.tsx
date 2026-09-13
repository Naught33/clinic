import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";

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

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; icon: "check" | "alert"; iconWrap: string }
> = {
  success: {
    border: "border-l-clinic-green",
    icon: "check",
    iconWrap:
      "bg-clinic-green-soft text-clinic-green dark:bg-clinic-green-soft-dark dark:text-clinic-green-dark",
  },
  error: {
    border: "border-l-clinic-red",
    icon: "alert",
    iconWrap: "bg-clinic-red/10 text-clinic-red dark:text-clinic-red-dark",
  },
  info: {
    border: "border-l-ink dark:border-l-surface",
    icon: "alert",
    iconWrap: "bg-surface text-ink dark:bg-surface-dark dark:text-surface",
  },
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
      <div
        className="fixed top-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={`animate-toast-in flex items-start gap-3 rounded border border-line bg-white p-3.5 pr-3 shadow-pop dark:border-line-dark dark:bg-[#1E2321] border-l-[3px] ${style.border}`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}
              >
                <Icon name={style.icon} size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-ink dark:text-white">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-soft dark:text-surface/70">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 text-ink-soft/60 hover:text-ink dark:hover:text-white"
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
