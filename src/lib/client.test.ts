import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import {
  ApiError,
  authEvents,
  cacheControls,
  clearSessionSnapshot,
  getAllProductStockLevels,
  getCategories,
  getProductById,
  getProducts,
  getSessionSnapshot,
  isAuthenticated,
  login,
  logout,
  saveSessionSnapshot,
  startSessionManager,
  stopSessionManager,
  updateProduct,
} from "./client";
import type { Product } from "./client";

/**
 * Unit tests for src/lib/client.ts — the UI-agnostic data layer.
 * This is the stable core of the app (caching, query building, merging,
 * auth/session lifecycle), so it's the right first thing to pin down.
 * All HTTP is exercised through a stubbed global `fetch`; storage writes
 * go to the real sessionStorage/localStorage provided by jsdom.
 */

const PRODUCTS: Product[] = [
  { id: 1, title: "Vitamins", price: 10, stock: 5, category: "beauty", thumbnail: "a.jpg" },
  { id: 2, title: "Serum", price: 25, stock: 0, category: "beauty", thumbnail: "b.jpg" },
  { id: 3, title: "Perfume", price: 15, stock: 8, category: "fragrances", thumbnail: "c.jpg" },
];

function productList(products: Product[] = PRODUCTS) {
  return { products, total: products.length, skip: 0, limit: products.length };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {} as Headers,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** Routes `fetch` per category slug, mirroring how DummyJSON scopes requests. */
function mockCategoryProducts() {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/category/beauty")) {
      return jsonResponse(productList([PRODUCTS[0], PRODUCTS[1]]));
    }
    if (url.includes("/category/fragrances")) {
      return jsonResponse(productList([PRODUCTS[1], PRODUCTS[2]]));
    }
    return jsonResponse(productList());
  });
}

let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  cacheControls.clearAll();
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  stopSessionManager();
  vi.useRealTimers();
});

describe("product list fetching", () => {
  it("omits empty and undefined params from the request query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ limit: 10, skip: 0, q: "", sortBy: undefined });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("q=");
    expect(url).not.toContain("sortBy=");
    expect(url).toContain("limit=10");
  });

  it("routes free-text search through /products/search", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ q: "vit", limit: 10, skip: 0 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/products/search?");
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=vit");
  });

  it("caches a product list per unique query", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    const first = await getProducts({ limit: 10 });
    const second = await getProducts({ limit: 10 });
    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats different params as different cache entries", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ limit: 10, skip: 0 });
    await getProducts({ limit: 10, skip: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("re-fetches a list once its cache entry expires", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2 * 60 * 1000 + 1);
    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("multi-category filtering", () => {
  it("fetches each category slug once, then serves newer combos from cache", async () => {
    mockCategoryProducts();
    const single = await getProducts({ categories: ["beauty"] });
    expect(single.total).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const both = await getProducts({ categories: ["beauty", "fragrances"] });
    expect(both.total).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const onlyFragrances = await getProducts({ categories: ["fragrances"] });
    expect(onlyFragrances.total).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes, sorts, and paginates merged results client-side", async () => {
    mockCategoryProducts();
    const result = await getProducts({
      categories: ["beauty", "fragrances"],
      sortBy: "price",
      order: "desc",
      limit: 2,
      skip: 0,
    });
    expect(result.total).toBe(3);
    expect(result.products.map((p) => p.price)).toEqual([25, 15]);
  });
});

describe("product detail caching", () => {
  it("keys detail cache entries by id + selected fields", async () => {
    fetchMock.mockResolvedValue(jsonResponse(PRODUCTS[0]));
    await getProductById(1);
    await getProductById(1, { select: ["id", "title"] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await getProductById(1);
    await getProductById(1, { select: ["id", "title"] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("forceRefresh bypasses the detail cache", async () => {
    fetchMock.mockResolvedValue(jsonResponse(PRODUCTS[0]));
    await getProductById(1);
    await getProductById(1, { forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("mutations and cache invalidation", () => {
  it("issues a PUT with the stock payload (stock-correction flow)", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    fetchMock.mockImplementation(async (input, init) => {
      calls.push([String(input), init]);
      return jsonResponse(productList());
    });
    await updateProduct(1, { stock: 9 }, "PUT");
    expect(calls[0][0]).toContain("/products/1");
    expect(calls[0][1]?.method).toBe("PUT");
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ stock: 9 });
  });

  it("invalidates list caches after a mutation so lists re-fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValue(jsonResponse({ ...PRODUCTS[0], stock: 9 }));
    await updateProduct(1, { stock: 9 });

    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("stock levels", () => {
  it("reuses the list cache for the dashboard's lean stock snapshot", async () => {
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    const levels = await getAllProductStockLevels({ order: "asc" });
    expect(levels).toHaveLength(3);
    expect(levels.map((p) => p.stock)).toEqual([5, 0, 8]);
  });
});

describe("auth", () => {
  it("stores tokens and emits auth:login on success", async () => {
    const emitted: unknown[] = [];
    const off = authEvents.on("auth:login", (payload) => emitted.push(payload));
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 7,
        username: "emilys",
        email: "emily@x.dev",
        firstName: "Emily",
        lastName: "Smith",
        gender: "female",
        image: "u.png",
        accessToken: "access-123",
        refreshToken: "refresh-456",
      }),
    );
    const user = await login({ username: "emilys", password: "emilyspass", expiresInMins: 1 });
    expect(user.firstName).toBe("Emily");
    expect(isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem("app.auth.accessToken")).toBe("access-123");
    expect(emitted).toHaveLength(1);
    off();
  });

  it("rejects bad credentials and leaves the user unauthenticated", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Invalid credentials" }, 400));
    await expect(login({ username: "no", password: "way" })).rejects.toBeInstanceOf(ApiError);
    expect(isAuthenticated()).toBe(false);
  });

  it("wraps a network failure as an ApiError with status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(getProducts({ limit: 10 })).rejects.toBeInstanceOf(ApiError);
    await expect(getProducts({ limit: 10 })).rejects.toMatchObject({ status: 0 });
  });

  it("logout clears tokens and caches and emits auth:logout", async () => {
    sessionStorage.setItem("app.auth.accessToken", "access-123");
    sessionStorage.setItem("app.auth.refreshToken", "refresh-456");
    fetchMock.mockResolvedValue(jsonResponse(productList()));
    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    let events = 0;
    const off = authEvents.on("auth:logout", () => events++);
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem("app.auth.accessToken")).toBeNull();
    expect(events).toBe(1);
    off();

    await getProducts({ limit: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("session snapshot", () => {
  it("round-trips a snapshot through sessionStorage", () => {
    const snapshot = { path: "/products?q=vit&page=2", searchTerm: "vit", page: 2 };
    saveSessionSnapshot(snapshot);
    expect(getSessionSnapshot()).toEqual(snapshot);
    clearSessionSnapshot();
    expect(getSessionSnapshot()).toBeNull();
  });
});

describe("session manager", () => {
  it("emits auth:refresh-failed when a silent refresh fails", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const onFailed = vi.fn();
    const off = authEvents.on("auth:refresh-failed", onFailed);
    sessionStorage.setItem("app.auth.refreshToken", "refresh-456");
    fetchMock.mockResolvedValue(jsonResponse({ message: "Refresh token expired" }, 401));

    startSessionManager(1000);
    await vi.advanceTimersByTimeAsync(1100);

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    off();
  });
});

describe("categories", () => {
  it("fetches once, memoizes, and refetches only after clearing", async () => {
    const categories = [
      { slug: "beauty", name: "Beauty", url: "https://dummyjson.com/products/category/beauty" },
    ];
    fetchMock.mockResolvedValue(jsonResponse(categories));
    const first = await getCategories();
    const second = await getCategories();
    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    cacheControls.clearAll();
    await getCategories();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
