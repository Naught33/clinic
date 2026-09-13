/**
 * hooks.ts
 * ---------------------------------------------------------------------------
 * React bindings over client.ts. Every hook resolves to an `AsyncState<T>`
 * (`idle` | `loading` | `success` | `error`) so components can switch on
 * `.status` without any of these hooks knowing how that gets rendered.
 *
 * No markup, no styling, no assumptions about your component tree — these
 * are meant to be dropped into whatever UI you build next.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addProduct,
  authEvents,
  deleteProduct,
  getAllProductStockLevels,
  getCategories,
  getCurrentUser,
  getProducts,
  getProductById,
  getStoredUser,
  isAuthenticated as checkIsAuthenticated,
  login as clientLogin,
  logout as clientLogout,
  PRODUCT_PREVIEW_SELECT,
  recordActivity,
  startSessionManager,
  stopSessionManager,
  updateProduct,
  type AsyncState,
  type Category,
  type LoginPayload,
  type Product,
  type ProductListParams,
  type ProductListResult,
  type ProductWritePayload,
  type User,
  ApiError,
} from "./client";

// ============================================================================
// Small internal helper — not exported, just avoids repeating the
// idle/loading/success/error dance in every hook below.
// ============================================================================

function useAsyncState<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  const run = useCallback(async (fn: () => Promise<T>) => {
    setState({ status: "loading" });
    try {
      const data = await fn();
      setState({ status: "success", data });
      return data;
    } catch (err) {
      const error =
        err instanceof ApiError ? err : new ApiError(String(err), 0);
      setState({ status: "error", error });
      return undefined;
    }
  }, []);

  return [state, run] as const;
}

// ============================================================================
// Categories
// ============================================================================

export function useCategories() {
  const [state, run] = useAsyncState<Category[]>();

  const refetch = useCallback(
    (forceRefresh = false) => run(() => getCategories({ forceRefresh })),
    [run],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

// ============================================================================
// Active category filter set — pairs with client.ts's per-category cache.
// Purely local state: toggling a category on/off never itself triggers a
// fetch. Pass `selected` straight into `useProducts({ categories: selected })`
// — adding a slug may cause one fetch (if never seen before), removing one
// never does, per the caching strategy in client.ts.
// ============================================================================

export function useCategoryFilter(initial: string[] = []) {
  const [selected, setSelected] = useState<string[]>(initial);

  const add = useCallback((slug: string) => {
    setSelected((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
  }, []);

  const remove = useCallback((slug: string) => {
    setSelected((prev) => prev.filter((s) => s !== slug));
  }, []);

  const toggle = useCallback((slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  return { selected, add, remove, toggle, clear };
}

// ============================================================================
// Product list (home page grid, products page, category filter, search)
// ============================================================================

export function useProducts(params: ProductListParams) {
  const [state, run] = useAsyncState<ProductListResult>();

  // Params is an object literal from the caller's render — serialize it so
  // the effect only re-runs when the actual query changes, not on every render.
  const paramsKey = JSON.stringify(params);

  const refetch = useCallback(
    (forceRefresh = false) => run(() => getProducts({ ...params, forceRefresh })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, paramsKey],
  );

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return { ...state, refetch };
}

// ============================================================================
// Products page preview panel ("Modal") — a light, fresh re-fetch of just
// the fields the panel shows. Deliberately bypasses the cache by default:
// the grid data (id/title/price/stock/thumbnail/category) could be up to
// CACHE_TTL.productList old, so this fetch guards against showing stale
// price/stock/description at the exact moment a user opens the panel.
// ============================================================================

export function useProductPreview(id: number | undefined) {
  const [state, run] = useAsyncState<Product>();

  const refetch = useCallback(
    (forceRefresh = true) => {
      if (id === undefined) return Promise.resolve(undefined);
      return run(() => getProductById(id, { select: PRODUCT_PREVIEW_SELECT, forceRefresh }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, id],
  );

  useEffect(() => {
    if (id !== undefined) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { ...state, refetch };
}

// ============================================================================
// Single product (product detail page)
// ============================================================================

export function useProduct(id: number | undefined, select?: string[]) {
  const [state, run] = useAsyncState<Product>();
  const selectKey = select ? select.join(",") : "";

  const refetch = useCallback(
    (forceRefresh = false) => {
      if (id === undefined) return Promise.resolve(undefined);
      return run(() => getProductById(id, { select, forceRefresh }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, id, selectKey],
  );

  useEffect(() => {
    if (id !== undefined) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectKey]);

  return { ...state, refetch };
}

// ============================================================================
// Low-stock stat (home page) — id/title/stock only, sorted ascending
// ============================================================================

export function useLowStockProducts(threshold: number, order: "asc" | "desc" = "asc") {
  const [state, run] = useAsyncState<Pick<Product, "id" | "title" | "stock">[]>();

  const refetch = useCallback(
    (forceRefresh = false) => run(() => getAllProductStockLevels({ order, forceRefresh })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, order],
  );

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Filtering by threshold is a cheap client-side pass over already-cached,
  // already-sorted data — no extra network call per threshold change.
  const lowStock =
    state.status === "success"
      ? state.data.filter((p) => p.stock < threshold)
      : [];

  return { ...state, lowStock, refetch };
}

// ============================================================================
// Product mutations (add / edit / delete)
// ============================================================================

export function useProductMutations() {
  const [state, run] = useAsyncState<Product>();

  const create = useCallback(
    (payload: ProductWritePayload) => run(() => addProduct(payload)),
    [run],
  );

  const update = useCallback(
    (id: number, payload: ProductWritePayload, method: "PUT" | "PATCH" = "PATCH") =>
      run(() => updateProduct(id, payload, method)),
    [run],
  );

  const remove = useCallback(
    (id: number) => run(() => deleteProduct(id) as unknown as Promise<Product>),
    [run],
  );

  return { ...state, create, update, remove };
}

// ============================================================================
// Auth session — login/logout, current user, and the background
// refresh/inactivity cycle (Decision Log #4)
// ============================================================================

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await clientLogin(payload);
      setUser(loggedInUser);
      startSessionManager();
      return loggedInUser;
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(String(err), 0);
      setError(apiError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clientLogout();
    setUser(null);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!checkIsAuthenticated()) return undefined;
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) logout();
      return undefined;
    }
  }, [logout]);

  // Resume the refresh cycle on mount if a token already exists (page was
  // reloaded mid-session) — and react to a forced expiry from anywhere else.
  useEffect(() => {
    if (checkIsAuthenticated()) startSessionManager();

    const unsubscribeExpired = authEvents.on("auth:session-expired", () => {
      setUser(null);
    });
    const unsubscribeLogout = authEvents.on("auth:logout", () => {
      setUser(null);
    });

    return () => {
      unsubscribeExpired();
      unsubscribeLogout();
      stopSessionManager();
    };
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    logout,
    refreshCurrentUser,
  };
}

// ============================================================================
// Activity tracking — feeds the inactivity-strike logic in client.ts.
// Mount this once near the root of the authenticated part of the tree.
// ============================================================================

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function useActivityTracker(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = () => recordActivity();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
    };
  }, [enabled]);
}

// ============================================================================
// Generic auth-event subscription — e.g. wire `auth:debug-refresh` to a
// toast, or `auth:session-expired` to a redirect, without client.ts (or
// this file) knowing which toast/router library you picked.
// ============================================================================

export function useAuthEvent<K extends Parameters<typeof authEvents.on>[0]>(
  event: K,
  handler: (payload: Parameters<Parameters<typeof authEvents.on>[1]>[0]) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    // @ts-expect- error — payload type is narrowed by K at the call site;
    // this indirection just avoids re-subscribing on every render.
    return authEvents.on(event, (payload) => handlerRef.current(payload));
  }, [event]);
}