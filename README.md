# Clinic-O

A mock clinic-inventory SPA. Signed-in staff can browse the 194-product catalogue, filter by category, search, sort, open any item on its own shareable route, and correct stock levels against the DummyJSON API.

Auth, caching, session-expiry behavior, and the error/empty/loading surfaces are all implemented — with one designed caveat: **bug reporting** (after 3 retry failures) logs to the console only, since there is no backend behind it yet.

---

## Steps to run locally

Requirements: Node.js 22+ (CI uses 22). npm is the package manager.

```bash
npm install       # installs dependencies, then runs husky's `prepare` hook
npm run dev       # start the Vite dev server → http://localhost:5173
```

Open http://localhost:5173, sign in with the pre-filled demo credentials (`emilys` / `emilyspass`), then press **Sign in**.

### Environment flags (`/.env`)

| Variable                        | Effect                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DEBUG_AUTH=true`          | Fires `auth:debug-refresh` on every silent token refresh, surfaced as an info toast.                                                                                         |
| `VITE_DEBUG_REQUEST_DELAY=true` | Artificially slows product-list requests by 2000 ms (pads the `delay` param) so the loading states and the debounced-search behavior can be verified on a "slow connection". |

### Other scripts

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run build`        | `tsc -b` type-check, then `vite build`.                  |
| `npm run preview`      | Serve the production build locally.                      |
| `npm run lint`         | ESLint over the whole repo (`eslint .`).                 |
| `npm run format`       | Prettier, writing fixes in place.                        |
| `npm run format:check` | Prettier in check mode — **fails** on unformatted files. |

### Local quality gates

- **commitlint** enforces Conventional Commits (types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`) via a Husky `commit-msg` hook.
- A Husky `pre-commit` hook runs `eslint .` and `prettier --check .` locally.
- The GitHub Actions workflow (`.github/workflows/ci.yml`) runs **lint → format:check → build** on `dev`/`main` and PRs into them, and can fail the pipeline.

---

## Project file structure

```
Clinic/
├── .editorconfig                  # cross-editor formatting stability
├── .github/workflows/ci.yml       # lint + format:check + build
├── .husky/
│   ├── pre-commit                 # npx eslint . && npx prettier --check .
│   └── commit-msg                 # npx --no -- commitlint --edit $1
├── .prettierrc                    # printWidth 100, double quotes, trailing commas
├── commitlint.config.js           # conventional-types values
├── eslint.config.js               # ESLint flat config, deliberate ruleset
├── vite.config.ts                 # Vite + React plugin + React Compiler (Babel)
├── tsconfig*.json                 # app + node TS project references
└── src/
    ├── App.tsx                    # providers + route table
    ├── index.css                  # ALL styles: design tokens + component classes
    ├── main.tsx                   # React entry point
    ├── lib/
    │   ├── client.ts              # data layer: HTTP, caching, auth/session lifecycle
    │   └── hooks.ts               # React bindings over client.ts (AsyncState hooks)
    ├── context/
    │   ├── AuthContext.tsx        # user + login/logout + session-refresh listeners
    │   └── ThemeContext.tsx       # light/dark theme, persisted to localStorage
    ├── routes/
    │   ├── Index.tsx              # "/" redirect: dashboard or /auth
    │   ├── Auth.tsx               # sign-in screen
    │   ├── Layout.tsx             # app shell
    │   ├── Dashboard.tsx          # stock informatics (stats + table + modals)
    │   ├── Products.tsx           # catalogue (search/sort/filter/grid/preview)
    │   ├── Product.tsx            # /products/:id detail, tabs, stock actions
    │   └── Profile.tsx            # current user
    ├── components/
    │   ├── ProtectedRoutes.tsx    # auth gate; saves/restores session position
    │   ├── NavBar.tsx, SideNav.tsx, ProductModal.tsx,
    │   ├── StockEditModal.tsx, ProductFormModal.tsx
    │   └── ui/                    # primitives: Button, Card, Input, Select, Modal,
    │                              #   Confirm, Toast, Pagination, CategoryPill,
    │                              #   Skeleton, Spinner, StatCard, EmptyState,
    │                              #   ErrorState, Icon, Avatar, ThemeToggle
    └── assets/
```

---

## Design principles

These are the design choices that shape the whole app. You can read this list and then predict where any UI behavior lives.

1. **The URL is the source of truth for every "view".** Anything a user might share, reload, or be restored to lives in the query string. Products: `/products?q=vit&categories=beauty,skin-care&sortBy=price&order=asc&page=2&preview=19`. Dashboard: `/dashboard?q=vit&threshold=20&order=desc&page=2`. Only truly ephemeral UI (the half-typed search text, an open modal) stays in React state, and even the search text box commits its term to the URL after a debounce.
2. **Cache to the data's churn rate.** Near-static reference data is cached (~persisted) aggressively; expensive but occasionally-changing payloads are cached with a short TTL; anything that must never go stale is re-fetched on demand. Details in [Fetching, caching, invalidation](#3-how-you-fetch-cache-and-invalidate-data).
3. **One async state model everywhere.** Every hook resolves to an `AsyncState<T>` — `idle | loading | success | error` — and the caller switches on `.status`. Screens therefore can't forget to handle a state, and the loading/empty/error surfaces are consistent across screens.
4. **Plain CSS with design tokens, no UI framework.** A single `index.css` holds the palette, type scale, radii, and shadows as CSS variables on `:root`, overridden for dark mode under `html.dark`. Components are styled with BEM-style classes; no Tailwind, no CSS-in-JS.
5. **Fail loudly, degrade gracefully.** Defensive code (storage, session refresh) keeps its graceful fallbacks but no longer swallows failures silently — they're logged and, where a user is affected, surfaced as a toast. Silent failure is treated as a bug, not a feature. See [Silent failures](#silent-failures).
6. **Keyboard- and narrow-screen-first.** Every interaction is a real `<button>`/`<a>`/native form control, focus is always drawn, and the layout collapses to a single column at 360 px.

---

## Color palette

Defined once on `:root` in `src/index.css` and flipped for dark mode under `html.dark` (dark overrides reuse the same variable names, so components need no theme logic of their own).

### Light theme

| Token                 | Hex       | Use                                        |
| --------------------- | --------- | ------------------------------------------ |
| `--ink`               | `#14171a` | Primary text (near-black)                  |
| `--ink-soft`          | `#4a5250` | Secondary text                             |
| `--paper`             | `#ffffff` | Page background                            |
| `--surface`           | `#f5f6f4` | Cards, panels                              |
| `--line`              | `#e1e4e0` | Borders, dividers                          |
| `--clinic-red`        | `#c23b26` | Destructive actions, errors, low-stock     |
| `--clinic-red-dark`   | `#e05038` | Red accent on dark surfaces                |
| `--clinic-green`      | `#2f8f5b` | Success, "in stock", primary accents       |
| `--clinic-green-dark` | `#49b87d` | Green accent on dark surfaces              |
| `--clinic-green-soft` | `#e3f3ea` | Tinted success backgrounds (pills, badges) |

### Dark theme

| Token                      | Hex       | Use                        |
| -------------------------- | --------- | -------------------------- |
| `--paper-dark`             | `#101312` | Page background            |
| `--surface-dark`           | `#1a1e1c` | Cards, panels, navbars     |
| `--line-dark`              | `#2a302d` | Borders, dividers          |
| `--card-dark`              | `#161a18` | Containers within surfaces |
| `--input-dark`             | `#171b19` | Input/select backgrounds   |
| `--toast-dark`             | `#1e2321` | Toast surface              |
| `--clinic-green-soft-dark` | `#173226` | Tinted success backgrounds |

Selection highlight is a translucent `rgb(47 143 91 / 0.25)` (the clinic-green at low alpha). The focus ring (see accessibility) is `#2f8f5b`.

---

## Other CSS variables (shared, app-wide)

These are the universal tokens in `src/index.css` that govern the whole app beyond the palette:

| Token            | Value                                      | Use                                     |
| ---------------- | ------------------------------------------ | --------------------------------------- |
| `--font-display` | `"Inter", system-ui, sans-serif`           | Headings                                |
| `--font-sans`    | `"Inter", system-ui, sans-serif`           | Body text                               |
| `--font-mono`    | `"IBM Plex Mono", ui-monospace, monospace` | Code-style / monospace spots            |
| `--shadow-panel` | `0 1px 2px 0 rgb(0 0 0 / 0.04)`            | Resting cards / surfaces                |
| `--shadow-pop`   | `0 8px 24px -8px rgb(0 0 0 / 0.18)`        | Floating layers (modals, preview panel) |

**Border radius** is _not_ tokenized yet — the same few values are used consistently across components rather than pulled from a variable:

| Radius   | Where                                         |
| -------- | --------------------------------------------- |
| `4px`    | Focus ring, focus-visible outline             |
| `6px`    | Buttons, inputs, selects, badges, table cells |
| `8px`    | Cards, panels, toasts                         |
| `10px`   | Preview panel                                 |
| `9999px` | Pills, category chips, avatars                |

Spacing is similar: a tight, repeated scale over `gap`/`padding` of **4, 6, 8, 10, 12, 14, 16, 20, 24 px** — no spacing tokens declared, the values are chosen from that ladder.

---

## 1. Components — how the screen is divided

The route tree in `src/App.tsx` wraps everything in four providers (**Theme → Toast → Router → Auth**), then routes through an auth gate:

```
<ThemeProvider>
  <ToastProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          "/"            → Index          (redirect to /dashboard or /auth)
          "/auth"        → Auth           (sign in)
          <ProtectedRoutes>              (bounces to /auth if signed out)
            <Layout>                     (app shell)
              "/dashboard"     → Dashboard
              "/products"      → Products
              "/products/:id"  → Product
              "/profile"       → Profile
          "*" → Index
```

**Screen division.** The app shell (`Layout`) is fixed: a top navbar (`NavBar`) and a left rail (`SideNav`) around a scrollable content column (`main.app-shell__main`). Each route renders only its own content into that column, so chrome stays constant while the view swaps underneath it.

**Component layers:**

- **Route screens** (`src/routes/*`): own the page's URL state and compose the lower layers. They are the only components that touch `useSearchParams` / `useNavigate`.
- **Composite/feature components** (`src/components/*`): cross-cutting UI that couples several primitives.
  - `ProtectedRoutes` — the auth gate (also owns session position via the snapshot).
  - `NavBar` / `SideNav` — chrome; `SideNav` hosts Sign Out.
  - `ProductModal` — the Products-grid preview panel (always fresh-fetches its fields).
  - `StockEditModal` — the in-place "set a new stock count" flow (Dashboard).
  - `ProductFormModal` — create/edit product (Dashboard + Product detail).
- **Primitives** (`src/components/ui/*`): presentational atoms with controlled styling — `Button`, `Card`, `Input`, `Select`, `Modal`, `Confirm`, `Toast`, `Pagination`, `CategoryPill`, `Skeleton`, `Spinner`, `StatCard`, `EmptyState`, `ErrorState`, `Icon`, `Avatar`, `ThemeToggle`. They accept local props / children and never talk to the data layer.
- **Data layer** (`src/lib/client.ts`) and **React bindings** (`src/lib/hooks.ts`): not components; see sections 2 and 3.

---

## 2. Where each piece of state lives

Three different kinds of state exist in this app, and the location of a piece of state is chosen by _who needs it and how long it must survive_:

### Server data — `src/lib/client.ts` caches, consumed via hooks

Fetched data never lives in React state. It lives (or is restored from) the cache layer in `client.ts`:

- `productListCache`, `productDetailCache`, `categoryProductCache` — in-memory `TtlCache`s.
- `categoriesMemo` + a `localStorage` copy — near-static reference data.
- Auth tokens and the current user — `sessionStorage` (`app.auth.*`).

Hooks (`src/lib/hooks.ts`) read and re-fetch through them and expose `AsyncState`. Components receive `{ status, data/error }` and render accordingly. _Why here:_ the cache layer is UI-agnostic (no React import), so it survives reloads, is shared by every subscriber (a product mutated on the dashboard invalidates the Products page), and can be exercised without mounting components.

### URL state — the query string, via `useSearchParams`

Anything that defines a _view_ that must be shareable / reloadable / restored lives in the URL:

- `Products`: `q` (search term), `categories` (comma-joined slugs), `sortBy`, `order`, `page`, `preview` (open product id).
- `Dashboard`: `q`, `threshold`, `order`, `page`.
- `Product`: `tab` (`info` | `reviews`).

_Why the URL:_ the "opening a copied URL on another machine restores the same view" requirement only holds if the view _is_ the URL. Products.tsx and Dashboard.tsx use a `useSearchParams`-backed `updateParams()` helper; the catch-all example is `/products?q=vit&categories=beauty,skin-care&sortBy=price&order=asc&page=2&preview=19`. Back/forward navigation works for free because the browser already tracks these URLs.

### Local UI state — React `useState`/`useContext`

State that has no reason to be shared, deep-linked, or restored sits in the nearest component:

- The search **text box** (`useState`) — so typing is instant; it commits to the URL after a `350ms` debounce. Products.tsx/Dashboard.tsx both resync the box from the URL on back/forward via a `prevUrlQuery` check.
- Which modal is open (`stockTarget`, `creating`, `editing`, `confirmingDelete`, preview panel from the `preview` URL param).
- Form field values in `StockEditModal` / `ProductFormModal`.
- Theme (`ThemeContext`, persisted to `localStorage`) and toasts (`ToastProvider`) — app-wide ephemeral concern, so a small context each.
- The session-expiry **snapshot** (`sessionStorage`, `app.session.snapshot`) — see below.

### Auth/session state — context + `sessionStorage`

`AuthContext` exposes `user`, `isAuthenticated`, `isLoading`, `login`, `logout`. The user derives from `sessionStorage` (`getStoredUser()` seeds the initial state), so a hard reload mid-session stays signed in. The **session position snapshot** is deliberately _storage, not React state_: a token expiry triggers a redirect to `/auth` (React state is torn down), and everything that must survive that redirect — search term, page, open product, filters — rides through `sessionStorage`, exactly as Decision Log #4 describes. The snapshot stores the full `path` (its query string _is_ the four fields); `Auth.tsx` restores it on re-login.

---

## 3. How you fetch, cache, and invalidate data

### The request layer

`client.ts` has a single `request<T>()` that sets JSON headers, attaches `Authorization: Bearer` when allowed, throws a typed `ApiError { status, body }` for non-2xx, and parses the body defensively. All hooks funnel through it.

### When a fetch happens (fetch on demand + TTL cache)

Each resource has its own lifetime policy (`CACHE_TTL`), which is the whole caching strategy:

| Resource                                             | TTL        | Storage                                                   |
| ---------------------------------------------------- | ---------- | --------------------------------------------------------- |
| Categories                                           | `Infinity` | `categoriesMemo` + `localStorage` (survives hard refresh) |
| Product list pages (`/products`, `/products/search`) | 2 min      | in-memory `productListCache`, keyed by full query string  |
| Product detail (`/products/:id`)                     | 10 min     | in-memory `productDetailCache`, keyed by `id::fields`     |
| Per-category full lists                              | 2 min      | in-memory `categoryProductCache`, keyed by slug           |

A hook (`useProducts`, `useProduct`, `useCategories`, `useLowStockProducts`, `useProductPreview`) calls its fetcher on mount / when its serialized params change, through `useAsyncState`. Details worth calling out:

- **Search** routes to `/products/search` with the `q` param. Because the cache key is the full query string, each committed search term is its own cache entry — so typing "vit" then "vits" never shows "vits" results for the stale "vit" request (the debounced URL commit also guards this).
- **Multi-category filtering** is served by `getProductsForCategories`: each slug is fetched (once per TTL) via `getCategoryProducts` and cached _independently_ under its slug. Removing a category from the filter is free (one fewer cached array in the merge); adding one may fetch only that slug. Everything is dedup'd by id, sorted, and paginated client-side.
- **The ProductModal preview deliberately bypasses the cache** (`useProductPreview` defaults `forceRefresh` to `true`) and fetches only `PRODUCT_PREVIEW_SELECT` fields. Reason: the grid's list data can be up to 2 minutes stale, and the panel shows price/stock/description _at the moment it's opened_ — a re-fetch guarantees the number the user sees is current. (The image itself is still browser-cached, which is the heavy part.)
- **Field limiting everywhere** (Decision Log #3): lists ask for `id/title/price/stock/thumbnail/category`, the preview panel adds `description`, and `getAllProductStockLevels` asks for `id/title/stock` only. The full payload (reviews, meta, dimensions) is only pulled on the item's own detail route.

### Invalidation

Because list pages are cheap to rebuild and share a cache, **any mutation blows away the list caches and prefix-invalidates the affected detail entries** (`invalidateProductCaches`):

```
addProduct / updateProduct / deleteProduct
  → productListCache.clear()          // membership/order may have changed
  → categoryProductCache.clear()      // category of the mutated item isn't reliably known
  → productDetailCache.invalidatePrefix(`${id}::`)  // that one detail entry only
```

`cacheControls` exposes manual knobs (clear a category's list, a single detail entry, or everything) for pull-to-refresh / debug tooling.

### The auth lifecycle

- `login()` → `POST /auth/login` → tokens to `sessionStorage`, user stored, `auth:login` emitted.
- `startSessionManager(tick)` runs a background loop: if the user was active since the last tick, it silently refreshes (`POST /auth/refresh`, emits `auth:refreshed`); if idle, it accrues an _inactivity strike_. After `MAX_INACTIVITY_STRIKES` (5) consecutive idle strikes it forces `logout()` and emits `auth:session-expired`.
- Refresh failures are **not silent**: `client.ts` logs them and emits `auth:refresh-failed`, which `AuthContext` surfaces as a toast (see [Silent failures](#silent-failures)).

---

## 4. Layout, spacing, color, and typography

**Layout.** The app-shell is a flex column (navbar) over a flex row (side rail + main). Within screens, structure is a mix of flex and CSS grid with `gap`-based spacing: the product grid goes `2 → 3 → 4 → 5` columns at `640 / 768 / 1024` px; detail pages use two-column grids when width allows; tables scroll horizontally inside a constrained wrapper rather than force the page wide. Cards, modals, and the preview panel share the same padding ladder (`16/20/24)` px.

**Spacing.** There are no spacing "tokens"; values are chosen from a consistent `4-6-8-10-12-14-16-20-24` px ladder and applied via `padding` / `gap`, so elements line up across screens.

**Color.** Palettes are the `:root` + `html.dark` tokens above. Semantics are encoded in the token names: text uses ink/paper, borders use line, success uses clinic-green and errors/destruction use clinic-red. Components never hard-code hex values in their own styles; they reference the variables.

**Typography.** Inter for both display and body (headings get `-0.025em` letter-spacing, `font-feature-settings: "ss01"` for nicer characters), IBM Plex Mono reserved for mono spots. The type scale is hand-picked per component (~11–30 px) rather than a rigid modular scale — section titles are 20–24 px, table/badge text 11–13 px, body 14 px.

This is a plain-CSS token system — deliberately **not** a third-party component/theme library. The trade-off (a single large `index.css`, some values repeated rather than tokenized) is accepted for full control and zero framework lock-in.

---

## 5. Accessibility approach

- **Native semantics everywhere.** Everything interactive is a real element: `<button>` for cards/paging/product cards, `<Link>` (react-router) for navigation, native `<select>`/`<input>`/`<form>` for controls, real `<table>` for the dashboard. The product grid cards are buttons so the whole card is one tab stop and Enter/Space activates it.
- **Appropriate roles/labels.** Modals render `role="dialog" aria-modal="true"` with an accessible name; icon-only buttons carry `aria-label` ("Close preview", "Dismiss notification", "Search products", "Edit `<title>` stock"); the toast region is `role="region" aria-label="Notifications"` with `role="status"` items; the discount toggle uses `aria-pressed`.
- **Keyboard-only use.** All flows are reachable: sign in (`Enter` on the form), browse (`Tab` through grids), open product (`Enter`), edit stock (modal buttons), delete (confirm dialog). Focus is never trapped in a non-initialized state — loading states render non-interactive skeletons so the tab order is never empty.
- **Visible focus.** `:focus-visible` draws a 2 px `#2f8f5b` outline with a 4 px radius everywhere. Disabled states are visually distinct (`not-allowed` cursor).
- **Responsive floor at 360 px.** Media queries at `640 / 768 / 1024` and a `max-width: 380px` refinement collapse the grid to one column, wrap the navbar meta, and keep modals within `90vw`.
- **Reduced motion.** A `prefers-reduced-motion: reduce` block drives all animations/transitions near-zero.
- **Color for meaning, not as the only signal.** Low-stock is red _and_ labeled ("X left", "Items left"), toasts carry an icon + text, form errors render inline text — status is never conveyed by hue alone.

---

## Silent failures

Error handling is deliberate: graceful fallbacks keep working (storage unavailable, non-JSON responses), but nothing fails invisibly.

| Failure                                              | Before                           | Now                                                                                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session refresh fails (`client.ts` `refreshSession`) | `catch { return null }` — silent | Logs `[auth] session refresh failed (status): message`, emits `auth:refresh-failed`; `AuthContext` surfaces a toast ("Session refresh failed … you'll be signed in until the current token expires") |
| Storage read/write/remove throws                     | `catch {}` / inline comment      | Logs `[storage] <op> failed for "<key>"` and keeps the graceful fallback                                                                                                                             |
| Theme storage unavailable                            | empty catch                      | Logs and falls back to system preference                                                                                                                                                             |

**Session-expiry behavior (the mid-session token expiry decision):** when the access token expires mid-session, the inactivity manager (`startSessionManager`) force-logs-out after 5 consecutive idle strikes and emits `auth:session-expired`. `AuthContext` clears the user and shows an error toast; `ProtectedRoutes` — now actually handing its snapshot the current `pathname + search` — redirects to `/auth`, and on re-login `Auth.tsx` navigates to that exact snapshot path. The user is returned to the identical screen (same search term, filters, sort, page, or open product), never a lost position or blank screen.

---

## Testing

All automated tests live in `src/lib/client.test.ts`, targeting the data layer — the stable, React-free core where caching, auth, query building, and merge logic live. This is the layer where a regression actually breaks the user's session or search results.

**Tooling:** Vitest 5 (Vite-native runner) + jsdom (real `sessionStorage`/`localStorage`) + `@vitest/coverage-v8`. HTTP is exercised via a stubbed global `fetch`; fake timers verify TTL expiry and session-manager intervals. No React component tests yet (would need `@testing-library/react`) — the data layer is pinned first because it carries the highest risk per line.

```bash
npm run test            # one-shot run
npm run test:watch      # reruns on change
npm run test:coverage   # coverage report (text + HTML in coverage/)
```

### What the 19 tests cover

| Suite                    | Tests | What it pins down                                                                                                                                                                                       |
| ------------------------ | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| product list fetching    |     5 | Query-string construction (undefined/empty dropped), search routes to `/products/search`, cache hit on repeated calls, different params = different entries, TTL expiry triggers re-fetch (fake timers) |
| multi-category filtering |     2 | Per-slug caching (fetch each slug once, serve later combos from cache), client-side merge / dedupe / sort / pagination                                                                                  |
| product detail caching   |     2 | Cache key includes id + selected fields (preview vs. full detail don't collide), `forceRefresh` bypasses cache                                                                                          |
| mutations & invalidation |     2 | PUT with stock payload (stock-correction flow), list cache cleared after mutation → re-fetches                                                                                                          |
| stock levels             |     1 | Lean stock snapshot reused from cache for the dashboard                                                                                                                                                 |
| auth                     |     4 | Login success (tokens stored, `auth:login` emitted), bad credentials → `ApiError`, network failure wrapped as `ApiError(status:0)`, logout clears tokens + caches + emits `auth:logout`                 |
| session snapshot         |     1 | `saveSessionSnapshot` / `getSessionSnapshot` / `clearSessionSnapshot` round-trip via real `sessionStorage`                                                                                              |
| session manager          |     1 | Refresh failure emits `auth:refresh-failed` (fake timers + mocked 401)                                                                                                                                  |
| categories               |     1 | Fetch once → memoized, re-fetch only after `clearAll`                                                                                                                                                   |

### CI pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR to `dev` or `main`:

```
install → lint → format:check → test → build
         ESLint   Prettier     Vitest  tsc + vite
```

All four must pass. To make tests a hard gate before merge to main, enable branch protection on `main` and require the **`ci`** status check.

---

## Decision Log

The five decisions below are the architectural convictions behind this project, preserved verbatim, expanded here with how the code realizes them.

### 1. React bundled with Vite (not Next.js)

> Use of react bundled with Vite - while Next.js is a better framework compared to plain react, it comes with a huge bundle size and often loading times are affected. Considering the scope of the project, there is no need for all the complexity included in Next.js, therefore, picking React with React compiler and React Router is a better option.

How it's realized:

- `vite.config.ts` wires `@vitejs/plugin-react` (JSX transform) plus `@rolldown/plugin-babel` with the **React Compiler preset**, so the compiler auto-memoizes rather than us scattering `useMemo`/`useCallback` everywhere.
- Routing is plain `react-router` (`BrowserRouter`, `Routes`) — no data loaders, no SSR, no middleware. `src/App.tsx` is ten lines of providers + route table.
- The production bundle is a single ~335 KB JS file (≈105 KB gzipped) — most of that is React + lucide icons — with no framework overhead.
- All data logic lives in `src/lib/client.ts`, UI-agnostic and React-free, so it could be lifted to any front-end without rewrites.

### 2. What to cache and what to recall

> What content to cache and which ones to recall. For instance, in the filters tab, the categories are mostly fixed, so we fetch once and persist, when it comes to user info, we fetch only when an authentication is done, then persist since this never really changes. Lastly, the product data, we can temporarily persist large pages that are expensive to fetch, mainly in the products page which will fetch 30 per page, so we can store pages that have been loaded to avoid re-fetching since the URL structure stays the same. For example, take a look at the ProductModal, it does not cache, while this causes a round trip, it maintains accuracy on information incase of change between initial fetch and re-opening since it contains crucial info, this is also viable since browser already caches the image, which is the largest size in traffic.

How it's realized:

- **Categories** — fetched once into `categoriesMemo` and mirrored to `localStorage` (key `app.cache.categories`) with an infinite TTL. `useCategories` thereafter resolves instantly, on any device, across hard reloads. Code: `getCategories()` in `client.ts`.
- **User** — persisted at login (`setStoredUser`), seeds the auth state on boot (`getStoredUser()`), and re-validated on demand via `/auth/me` (`useProfile`). Since it never changes mid-session, it's never re-fetched unless asked (Profile's "Refresh" button).
- **Product lists** — cached per unique URL (cache key = path + query string) with a 2-minute TTL. Consecutive pages, searches, and filter combinations reuse their cached responses instead of re-hitting the API; the Products page pulls 10 per page but the cache stores the fetched set. The dashboard's low-stock view reuses the same product-list cache.
- **ProductModal** — deliberately **no** list-cache reuse. `useProductPreview(id)` calls `getProductById(id, { select: PRODUCT_PREVIEW_SELECT, forceRefresh: true })` on every open, so price/stock/description can't be stale relative to the grid row the user just clicked. The round-trip is cheap because web browsers cache the thumbnail (the single largest payload), and correctness wins over a cached number.

### 3. Limiting fields to fetch, and only fetching full information when expanding

> Limiting fields to fetch for products, and only fetching full information when expanding.

How it's realized:

- `CATEGORY_PRODUCT_SELECT` (`id, title, price, stock, thumbnail, category`) — what the category-filter lists request.
- `getAllProductStockLevels()` — requests only `id, title, stock` for all products (`limit: 0, select: [...]`), the whole basis of the dashboard's low-stock table.
- `useProducts` passes nothing extra; grid rows render from the lean list shape.
- The **Product detail route** (`/products/:id`) is the "expand": it calls `getProductById(id)` with **no** `select`, pulling the full shape (reviews, dimensions, meta, images) — but only there, cached 10 minutes, so you pay the full payload once per item.

### 4. Handle general app states with context. Mainly an auth context that monitors expiration sessions

> Handle general app states with context. Mainly an auth context that monitors expiration sessions. It makes sense to have this file keep a handle caching of current app state in the event of a token expiration mid session, this, redirecting to login page does not destroy the current state, mainly kept these conditions:
>
> - Current content of search box (if present) or search term
> - Current page number (if in paginated products page)
> - Current open product in a page
> - Current filters applied for a search page

How it's realized:

- `AuthContext` wraps the app and exposes user state, `login`, `logout`, plus listeners for `auth:session-expired` and `auth:refreshed` (and now `auth:refresh-failed`). Its backing `useAuthSession()` subscribes to the pub/sub in `client.ts` and boots the session manager whenever a token exists — the "monitors expiration sessions" part.
- The four preserved conditions map to URL state on the pages that own them, so they're captured in one string:
  - search box content → `q`
  - current page → `page`
  - open product → `preview`
  - applied filters → `categories`, `sortBy`, `order`
- `ProtectedRoutes` is the boundary that keeps them: on `!isAuthenticated` it writes `saveSessionSnapshot({ path: location.pathname + location.search })` (the compact stand-in for the four fields — the query string _is_ them), then redirects to `/auth`. The snapshot lives in `sessionStorage`, so the full navigation to the login screen — state teardown included — leaves it untouched.
- After re-authentication, `Auth.tsx` reads the snapshot, clears it (one-shot resume), and navigates to the exact saved path — `navigate(snapshot?.path ?? location.state?.from ?? "/dashboard")`. Same search, same filters, same sort, same page, or the same open product. Nothing lost.

### 5. Stock-count threshold filter on the dashboard

> The dashboard filter was added for inventory management: help identify stock running low and order the table from least available to least at risk of running out, since that's the main theme of the app. The DummyJSON API had a limitation where it could not filter by stock size, so a manual client-side implementation was added.

How it's realized:

- `useLowStockProducts(threshold, order)` (`src/lib/hooks.ts`) calls `getAllProductStockLevels()` — a single `GET /products?limit=0` that pulls the full 194-item product list with only `id`, `title`, and `stock` fields, sorted by stock via the API. The response is cached for the list TTL, so switching the threshold never triggers a network call.
- The threshold filter (`stock < threshold`) runs client-side over the already-fetched, already-sorted array: `state.data.filter((p) => p.stock < threshold)`. Changing from `<10` to `<50` costs nothing — it's a cheap in-memory filter over a cached array. Code: `useLowStockProducts` in `src/lib/hooks.ts`.
- The dashboard reads `threshold` and `order` from the URL query string (`/dashboard?threshold=20&order=desc`), so any given stock view can be shared, reloaded, or restored after a session expiry — same as every other screen.
- The UI presents a `<Select>` with predefined thresholds (`10 / 20 / 50 / 100`), a sort order toggle (ascending by default, so lowest stock is always on top), and a per-row edit button (`StockEditModal`) that issues `PUT /products/{id}` with the new count.
