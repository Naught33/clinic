/**
 * client.ts
 * ---------------------------------------------------------------------------
 * UI-agnostic data layer for the app. Wraps the DummyJSON REST API with:
 *
 *   - typed request/response shapes
 *   - a caching layer matched to how often each resource actually changes
 *     (categories: near-static / persisted, product lists: short TTL,
 *     product detail: longer TTL)
 *   - the full auth lifecycle: login, silent refresh, inactivity-based
 *     expiry, "get current user"
 *   - a tiny pub/sub (`authEvents`) so UI code (toasts, redirects) can react
 *     to what happens here without this file knowing anything about UI
 *
 * Nothing here imports React. `sessionStorage` / `localStorage` are browser
 * APIs, not UI — this file assumes an SPA (Vite) context, no SSR.
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// Config
// ============================================================================

const BASE_URL = "https://dummyjson.com";

/**
 * Set VITE_DEBUG_AUTH=true in your .env to get an `auth:debug-refresh` event
 * fired on every silent token refresh. Wire it to a toast in the UI layer —
 * this file never calls a toast library directly.
 */
const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "true";

/**
 * Set VITE_DEBUG_REQUEST_DELAY=true to artificially slow product-list
 * requests (see the `delay` param on ProductListParams). Fires
 * `debug:request-delay` so the UI can surface it as a toast while we
 * monitor the skeleton/loading UX.
 */
const DEBUG_REQUEST_DELAY = import.meta.env.VITE_DEBUG_REQUEST_DELAY === "true";

/** Consecutive inactive refresh cycles allowed before we force logout. */
const MAX_INACTIVITY_STRIKES = 5;

/** Default cache lifetimes, in ms. Override per-call when needed. */
const CACHE_TTL = {
  categories: Infinity, // near-static reference data — persisted, not just cached
  productList: 2 * 60 * 1000, // 2 min — list pages change rarely but can be re-filtered often
  productDetail: 10 * 60 * 1000, // 10 min — expensive payload (reviews, images, meta)
} as const;

/**
 * Fixed field set for per-category product caching (see
 * `getProductsForCategories` below). Kept constant so every category's
 * cache entry has the same shape and can be merged/sorted safely — if this
 * ever needs to vary per call, the cache key would need to include the
 * field set too.
 */
const CATEGORY_PRODUCT_SELECT = ["id", "title", "price", "stock", "thumbnail", "category"];

/**
 * Fixed field set for the Products page's preview panel ("Modal"). Slightly
 * richer than CATEGORY_PRODUCT_SELECT (adds `description`) and fetched
 * fresh on open rather than reused from the grid data, so the panel can't
 * show stale price/stock/description if the product changed between the
 * grid's fetch and the moment this item was opened.
 */
export const PRODUCT_PREVIEW_SELECT = ["id", "title", "price", "stock", "thumbnail", "description"];

const STORAGE_KEYS = {
  accessToken: "app.auth.accessToken",
  refreshToken: "app.auth.refreshToken",
  user: "app.auth.user",
  sessionSnapshot: "app.session.snapshot",
  categories: "app.cache.categories",
} as const;

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  expiresInMins?: number;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductMeta {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
}

/**
 * Full product shape (detail page). List endpoints will only populate the
 * fields you asked for via `select` — everything else will be `undefined`
 * at runtime even though TS won't complain, since DummyJSON just omits keys.
 * Treat unselected fields as optional when reading list data.
 */
export interface Product {
  id: number;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  discountPercentage?: number;
  rating?: number;
  stock: number;
  tags?: string[];
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  reviews?: ProductReview[];
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  meta?: ProductMeta;
  images?: string[];
  thumbnail?: string;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductListParams {
  limit?: number;
  skip?: number;
  /** Field names to return. Keep this tight — it's the main lever for payload size. */
  select?: string[];
  sortBy?: string;
  order?: "asc" | "desc";
  /** Free-text search — routes to /products/search instead of /products. */
  q?: string;
  /** Single category slug — convenience alias for `categories: [category]`. */
  category?: string;
  /**
   * One or more category slugs. DummyJSON only supports one category per
   * request, so with more than one slug this is served from
   * `getProductsForCategories`: each category is fetched/cached
   * independently and the results are merged, sorted, and paginated
   * client-side. Removing a slug from this array never triggers a
   * network call — it's just one fewer cached array in the merge.
   */
  categories?: string[];
  modifiedAfter?: string; // ISO 8601
  modifiedBefore?: string; // ISO 8601
  delay?: number;
  /** Bypass the cache and force a network round-trip. */
  forceRefresh?: boolean;
}

export type ProductWritePayload = Partial<Omit<Product, "id" | "meta" | "reviews">>;

/** Discriminated union every hook resolves to — UI switches on `.status`. */
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError };

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * The four fields Decision Log #4 wants preserved across a forced
 * re-login mid-session. UI (AuthContext) reads/writes this around
 * the redirect — this file just provides the storage.
 *
 * `path` is the canonical form: the page's own URL state (search term,
 * page number, open-product preview, applied filters) is already encoded
 * in the query string (see Products.tsx/Dashboard.tsx), so capturing the
 * full `pathname + search` restores the user to an identical screen.
 * The decomposed fields below remain available for consumers that need
 * a single value (e.g. a "resume at page 3" button) without reparsing.
 */
export interface SessionSnapshot {
  /** Full pathname + search, e.g. "/products?q=vit&categories=beauty&page=2&preview=19". */
  path?: string;
  searchTerm?: string;
  page?: number;
  openProductId?: number;
  filters?: Record<string, unknown>;
}

// ============================================================================
// Tiny pub/sub for auth events
// ============================================================================

// Object literals with string keys are used both as mappings and as generic
// emit maps — type aliases (not interfaces) satisfy `Record<string, unknown>`,
// which `createEmitter` requires, so interfaces can't be substituted here.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type AuthEventMap = {
  "auth:login": { user: User };
  "auth:logout": undefined;
  "auth:refreshed": { tokens: AuthTokens };
  "auth:debug-refresh": { message: string };
  "auth:session-expired": undefined;
  "auth:refresh-failed": { message: string; status: number };
};

interface Listener<T> {
  (payload: T): void;
}

function createEmitter<Events extends Record<string, unknown>>() {
  const listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  return {
    on<K extends keyof Events>(event: K, cb: Listener<Events[K]>): () => void {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb as Listener<unknown>);
      return () => listeners.get(event)?.delete(cb as Listener<unknown>);
    },
    off<K extends keyof Events>(event: K, cb: Listener<Events[K]>): void {
      listeners.get(event)?.delete(cb as Listener<unknown>);
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      listeners.get(event)?.forEach((cb) => cb(payload));
    },
  };
}

/** Subscribe from hooks.ts / UI: `authEvents.on("auth:session-expired", () => ...)` */
export const authEvents = createEmitter<AuthEventMap>();

/** Debug/diagnostic channel — e.g. when debug slow-mo delays a request. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DebugEventMap = {
  "debug:request-delay": { message: string };
};
export const debugEvents = createEmitter<DebugEventMap>();

// ============================================================================
// Storage helpers (guarded — safe to import in any environment)
// ============================================================================

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch (err) {
    console.warn(`[storage] read failed for "${key}"`, err);
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch (err) {
    /* storage unavailable or full — fall back to not persisting, but don't
       fail silently: tokens/snapshots that can't be written degrade the session. */
    console.warn(`[storage] write failed for "${key}"`, err);
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch (err) {
    /* no-op — but log it so a stuck value (e.g. a stale snapshot keeping a
       user pinned to a dead page) isn't invisible. */
    console.warn(`[storage] remove failed for "${key}"`, err);
  }
}

// --- Auth tokens: sessionStorage (short-lived, per Decision Log #4) --------

function getAccessToken(): string | null {
  return safeGet(sessionStorage, STORAGE_KEYS.accessToken);
}

function getRefreshToken(): string | null {
  return safeGet(sessionStorage, STORAGE_KEYS.refreshToken);
}

function setTokens(tokens: AuthTokens): void {
  safeSet(sessionStorage, STORAGE_KEYS.accessToken, tokens.accessToken);
  safeSet(sessionStorage, STORAGE_KEYS.refreshToken, tokens.refreshToken);
}

function clearTokens(): void {
  safeRemove(sessionStorage, STORAGE_KEYS.accessToken);
  safeRemove(sessionStorage, STORAGE_KEYS.refreshToken);
  safeRemove(sessionStorage, STORAGE_KEYS.user);
}

export function getStoredUser(): User | null {
  const raw = safeGet(sessionStorage, STORAGE_KEYS.user);
  return raw ? (JSON.parse(raw) as User) : null;
}

function setStoredUser(user: User): void {
  safeSet(sessionStorage, STORAGE_KEYS.user, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

// --- Session snapshot: sessionStorage, survives the auth redirect ---------

export function saveSessionSnapshot(snapshot: SessionSnapshot): void {
  safeSet(sessionStorage, STORAGE_KEYS.sessionSnapshot, JSON.stringify(snapshot));
}

export function getSessionSnapshot(): SessionSnapshot | null {
  const raw = safeGet(sessionStorage, STORAGE_KEYS.sessionSnapshot);
  return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
}

export function clearSessionSnapshot(): void {
  safeRemove(sessionStorage, STORAGE_KEYS.sessionSnapshot);
}

// ============================================================================
// Generic in-memory cache with TTL
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // ms epoch, Infinity = never
}

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: ttlMs === Infinity ? Infinity : Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate every key whose prefix matches — used to blow away all product-list pages at once. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

const productListCache = new TtlCache<ProductListResult>();
const productDetailCache = new TtlCache<Product>();

/**
 * One entry per category slug, holding that category's *entire* product
 * list (fetched with `limit=0`). Independent from `productListCache` —
 * this is what makes adding/removing categories from an active filter set
 * free after the first fetch of each slug. See `getProductsForCategories`.
 */
const categoryProductCache = new TtlCache<Product[]>();

// Categories: in-memory + localStorage backup so a hard refresh doesn't
// re-fetch near-static reference data (Decision Log #2).
let categoriesMemo: Category[] | null = null;

// ============================================================================
// Query string helper
// ============================================================================

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ============================================================================
// Debug slow-mo — artificial latency gated by VITE_DEBUG_REQUEST_DELAY.
// Sleeping keeps the native clock ticking; emitting lets the UI toast it.
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appliedDebugDelay(ms: number): Promise<void> {
  if (!DEBUG_REQUEST_DELAY || ms <= 0) return Promise.resolve();
  return sleep(ms).then(() => {
    debugEvents.emit("debug:request-delay", {
      message: `Debug slow-mo: this product request was slowed by ${ms}ms.`,
    });
  });
}

// ============================================================================
// Core request wrapper
// ============================================================================

interface RequestOptions extends RequestInit {
  /** Attach `Authorization: Bearer <token>` automatically. Default: true. */
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      // Belt-and-suspenders per DummyJSON docs. Note: dummyjson.com is a
      // different origin than your dev server, so third-party cookie
      // blocking may prevent this from actually persisting anything —
      // the Authorization header (bearer token) is what you should rely on.
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : "Network request failed", 0);
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message = (body as { message?: string } | null)?.message ?? res.statusText;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

// ============================================================================
// Auth API
// ============================================================================

export async function login(payload: LoginPayload): Promise<User> {
  const result = await request<User & AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });

  const { accessToken, refreshToken, ...user } = result;
  setTokens({ accessToken, refreshToken });
  setStoredUser(user);
  resetInactivityStrikes();
  authEvents.emit("auth:login", { user });

  return user;
}

export async function getCurrentUser(): Promise<User> {
  const user = await request<User>("/auth/me", { method: "GET" });
  setStoredUser(user);
  return user;
}

async function refreshSession(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const tokens = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken, expiresInMins: 30 }),
      auth: false,
    });
    setTokens(tokens);
    authEvents.emit("auth:refreshed", { tokens });
    if (DEBUG_AUTH) {
      authEvents.emit("auth:debug-refresh", {
        message: `Session silently refreshed at ${new Date().toLocaleTimeString()}`,
      });
    }
    return tokens;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const message = err instanceof ApiError ? err.message : "Session refresh failed";
    console.warn(`[auth] session refresh failed (${status}): ${message}`);
    authEvents.emit("auth:refresh-failed", { message, status });
    return null;
  }
}

export function logout(): void {
  stopSessionManager();
  clearTokens();
  clearSessionSnapshot();
  productListCache.clear();
  productDetailCache.clear();
  authEvents.emit("auth:logout", undefined);
}

// --- Inactivity-aware session manager --------------------------------------
// Every tick: if the user has been active since the last tick, refresh and
// reset the strike counter. If not, add a strike. After MAX_INACTIVITY_STRIKES
// consecutive inactive ticks, expire the session instead of refreshing.

let lastActivityAt = Date.now();
let inactivityStrikes = 0;
let sessionTimer: ReturnType<typeof setInterval> | null = null;

export function recordActivity(): void {
  lastActivityAt = Date.now();
}

function resetInactivityStrikes(): void {
  inactivityStrikes = 0;
  lastActivityAt = Date.now();
}

/**
 * Starts the background refresh cycle. `tickIntervalMs` should be somewhat
 * shorter than the access token's actual lifetime so refreshes land before
 * expiry — e.g. for a 30-minute token, tick every ~5 minutes.
 */
export function startSessionManager(tickIntervalMs = 5 * 60 * 1000): void {
  stopSessionManager();
  resetInactivityStrikes();

  sessionTimer = setInterval(async () => {
    const wasActive = Date.now() - lastActivityAt < tickIntervalMs;

    if (!wasActive) {
      inactivityStrikes += 1;
    } else {
      inactivityStrikes = 0;
    }

    if (inactivityStrikes >= MAX_INACTIVITY_STRIKES) {
      logout();
      authEvents.emit("auth:session-expired", undefined);
      return;
    }

    await refreshSession();
  }, tickIntervalMs);
}

export function stopSessionManager(): void {
  if (sessionTimer !== null) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

// ============================================================================
// Categories (near-static — cached indefinitely, persisted to localStorage)
// ============================================================================

export async function getCategories(options?: { forceRefresh?: boolean }): Promise<Category[]> {
  if (!options?.forceRefresh) {
    if (categoriesMemo) return categoriesMemo;

    const stored = safeGet(localStorage, STORAGE_KEYS.categories);
    if (stored) {
      categoriesMemo = JSON.parse(stored) as Category[];
      return categoriesMemo;
    }
  }

  const categories = await request<Category[]>("/products/categories", {
    method: "GET",
    auth: false,
  });

  categoriesMemo = categories;
  safeSet(localStorage, STORAGE_KEYS.categories, JSON.stringify(categories));
  return categories;
}

// ============================================================================
// Products
// ============================================================================

function productListCacheKey(path: string, qs: string): string {
  return `${path}${qs}`;
}

/**
 * Fetches one category's full product list (id/title/price/stock/thumbnail/
 * category only, via CATEGORY_PRODUCT_SELECT) and caches it under its own
 * slug — independent of every other category. This is the unit of caching
 * that makes multi-category filtering cheap: each slug is fetched at most
 * once per cache TTL, regardless of which other categories are active
 * alongside it.
 */
async function getCategoryProducts(
  slug: string,
  forceRefresh = false,
  delay?: number,
): Promise<Product[]> {
  await appliedDebugDelay(delay ?? 0);

  if (!forceRefresh) {
    const cached = categoryProductCache.get(slug);
    if (cached) return cached;
  }

  const qs = buildQueryString({ select: CATEGORY_PRODUCT_SELECT, limit: 0 });
  const result = await request<ProductListResult>(`/products/category/${slug}${qs}`, {
    method: "GET",
    auth: false,
  });

  categoryProductCache.set(slug, result.products, CACHE_TTL.productList);
  return result.products;
}

/**
 * Multi-category filtering. Since DummyJSON only accepts one category slug
 * per request, this fetches (or reuses from cache) each slug independently,
 * merges the results, dedupes by id, then sorts and paginates client-side.
 *
 *   - Adding a never-before-seen slug: one network call, for that slug only.
 *   - Adding a previously-fetched slug: zero network calls.
 *   - Removing a slug: zero network calls, always — the merge just runs
 *     over one fewer cached array.
 */
async function getProductsForCategories(
  slugs: string[],
  params: Pick<ProductListParams, "sortBy" | "order" | "limit" | "skip" | "forceRefresh" | "delay">,
): Promise<ProductListResult> {
  const perCategory = await Promise.all(
    slugs.map((slug) => getCategoryProducts(slug, params.forceRefresh, params.delay)),
  );

  // Dedup by id (defensive — a product should only ever belong to one
  // category in this dataset, but this keeps the merge correct either way).
  const merged = new Map<number, Product>();
  for (const list of perCategory) {
    for (const product of list) merged.set(product.id, product);
  }

  let all = Array.from(merged.values());

  if (params.sortBy) {
    const key = params.sortBy as keyof Product;
    const direction = params.order === "desc" ? -1 : 1;
    all = [...all].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === undefined || bv === undefined || av === bv) return 0;
      return av < bv ? -direction : direction;
    });
  }

  const total = all.length;
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 30;
  const page = limit === 0 ? all.slice(skip) : all.slice(skip, skip + limit);

  return { products: page, total, skip, limit };
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const { q, category, categories, forceRefresh, sortBy, order, limit, skip, delay, ...rest } =
    params;

  const activeCategories = categories?.length ? categories : category ? [category] : [];

  if (activeCategories.length > 0) {
    return getProductsForCategories(activeCategories, {
      sortBy,
      order,
      limit,
      skip,
      forceRefresh,
      delay,
    });
  }

  await appliedDebugDelay(delay ?? 0);

  const path = q ? "/products/search" : "/products";

  const qs = buildQueryString({ ...rest, sortBy, order, limit, skip, q });
  const cacheKey = productListCacheKey(path, qs);

  if (!forceRefresh) {
    const cached = productListCache.get(cacheKey);
    if (cached) return cached;
  }

  const result = await request<ProductListResult>(`${path}${qs}`, {
    method: "GET",
    auth: false,
  });

  productListCache.set(cacheKey, result, CACHE_TTL.productList);
  return result;
}

export async function getProductById(
  id: number,
  options?: { select?: string[]; forceRefresh?: boolean },
): Promise<Product> {
  // Keyed by id + field set — a lean preview fetch (e.g. PRODUCT_PREVIEW_SELECT)
  // and a full detail fetch (no select) for the same id must never collide,
  // or one could shadow the other with an incomplete shape.
  const cacheKey = `${id}::${options?.select?.join(",") ?? "full"}`;

  if (!options?.forceRefresh) {
    const cached = productDetailCache.get(cacheKey);
    if (cached) return cached;
  }

  const qs = buildQueryString({ select: options?.select });
  const product = await request<Product>(`/products/${id}${qs}`, {
    method: "GET",
    auth: false,
  });

  productDetailCache.set(cacheKey, product, CACHE_TTL.productDetail);
  return product;
}

/**
 * Convenience wrapper matched to the "low stock" stat: pulls just id/title/
 * stock for every product in one call (limit=0) and lets you sort/filter
 * cheaply client-side. See CACHE_TTL.productList for how long this is cached.
 */
export async function getAllProductStockLevels(options?: {
  order?: "asc" | "desc";
  forceRefresh?: boolean;
}): Promise<Pick<Product, "id" | "title" | "stock">[]> {
  const result = await getProducts({
    limit: 0,
    select: ["id", "title", "stock"],
    sortBy: "stock",
    order: options?.order ?? "asc",
    forceRefresh: options?.forceRefresh,
  });
  return result.products as Pick<Product, "id" | "title" | "stock">[];
}

function invalidateProductCaches(id?: number): void {
  productListCache.clear(); // safest: any mutation can change list order/membership
  categoryProductCache.clear(); // a mutated product's category isn't reliably known here, so clear all
  if (id !== undefined) productDetailCache.invalidatePrefix(`${id}::`);
}

export async function addProduct(payload: ProductWritePayload): Promise<Product> {
  const product = await request<Product>("/products/add", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
  invalidateProductCaches();
  return product;
}

export async function updateProduct(
  id: number,
  payload: ProductWritePayload,
  method: "PUT" | "PATCH" = "PATCH",
): Promise<Product> {
  const product = await request<Product>(`/products/${id}`, {
    method,
    body: JSON.stringify(payload),
    auth: false,
  });
  invalidateProductCaches(id);
  return product;
}

export interface DeletedProduct extends Product {
  isDeleted: true;
  deletedOn: string;
}

export async function deleteProduct(id: number): Promise<DeletedProduct> {
  const result = await request<DeletedProduct>(`/products/${id}`, {
    method: "DELETE",
    auth: false,
  });
  invalidateProductCaches(id);
  return result;
}

// ============================================================================
// Manual cache controls (exposed for pull-to-refresh / debug tooling)
// ============================================================================

export const cacheControls = {
  clearProductLists: () => productListCache.clear(),
  clearProductDetail: (id: number) => productDetailCache.invalidatePrefix(`${id}::`),
  /** Clear one category's cached product list, or all of them if no slug is given. */
  clearCategoryProducts: (slug?: string) => {
    if (slug) categoryProductCache.invalidate(slug);
    else categoryProductCache.clear();
  },
  clearCategories: () => {
    categoriesMemo = null;
    safeRemove(localStorage, STORAGE_KEYS.categories);
  },
  clearAll: () => {
    productListCache.clear();
    productDetailCache.clear();
    categoryProductCache.clear();
    categoriesMemo = null;
    safeRemove(localStorage, STORAGE_KEYS.categories);
  },
};
