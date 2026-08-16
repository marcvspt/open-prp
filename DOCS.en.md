# Open PRP — Technical documentation

Architecture, development and contribution guide. For using the app as a product, see the [README.en.md](README.en.md).

## Table of contents

1. [Architecture](#architecture)
2. [Routing](#routing)
3. [Authentication / Middleware](#authentication--middleware)
4. [Database](#database)
5. [REST API](#rest-api)
6. [Types](#types)
7. [Modules](#modules)
8. [Centralized UI strings (i18n)](#centralized-ui-strings-i18n)
9. [Forms](#forms)
10. [Filters and URL state](#filters-and-url-state)
11. [Components](#components)
12. [Dashboard](#dashboard)
13. [Error handling](#error-handling)
14. [PWA](#pwa)
15. [Accessibility](#accessibility)
16. [Environment variables](#environment-variables)
17. [Deployment](#deployment)

## Architecture

```
client (browser) → Astro SSR → API Routes → Repositories → Turso (libSQL)
                          ↕
                    Clerk (Auth)
```

- **SSR-first**: Astro renders on the server; data is fetched via repositories in the `.astro` frontmatter and the page arrives pre-rendered to the client.
- **React 19** hydrates with `client:load` only where client-side interactivity is needed (islands). The dashboard content is 100% SSR, no islands.
- **REST API**: endpoints in `src/pages/api/*` built with factories in `src/lib/api-routes.ts` and helpers in `src/lib/api-helpers.ts`.
- **No ORM**: direct SQL queries with `@libsql/client/web` and `?` bind params.
- **Prefetch disabled**: `prefetch: false` in `astro.config.mjs` (the `ClientRouter` prefetches everything on hover by default, duplicating the SSR fetch on each navigation).

### Project structure

```
src/
  pages/
    [locale]/index.astro  → Public landing (prerendered)
    [locale]/app/*.astro  → App pages (SSR, protected)
    api/**/               → API Routes (CRUD per module, no locale prefix)
  components/
    ui/                   → Shared UI landing + app
    app/ui/               → App-specific UI
    app/{module}/         → Section-specific components
    landing/              → Landing components
  layouts/
    BaseLayout.astro      → <head>, ClientRouter, theme, title
    AppLayout.astro       → Sidebar + main + PWA
    LandingLayout.astro   → Header + slot + Footer
  lib/
    modules/{module}/     → Repositories and domain logic
    types/                → Types (one file per domain)
    api-routes.ts         → CRUD factories for the API
    api-helpers.ts        → API route helpers
    i18n/
      es.ts               → UI strings dictionary (Spanish) + `Locale` type
      en.ts               → UI strings dictionary (English)
      locale.ts           → `LOCALES`, `LocaleCode`, `getLocaleDict(code)`
      LocaleProvider.tsx  → `LocaleContext` + `useLocaleDict()` for React islands
      clerk-localizations.ts → `getClerkLocalization` (locale → `@clerk/localizations`)
      category-labels.ts  → displayCategoryName (system names → display)
      payment-method-labels.ts → displayPaymentMethodName (globals → display)
      form-fields.ts      → Form field helpers (parameterized with `t`)
      filter-fields.ts    → Filter constants (strings parameterized with `t`)
      general-fields.ts   → Button/CTA constants (strings parameterized with `t`)
    dashboard/            → load.ts (SSR) + api.ts (client)
    ui/                   → Browser logic (theme, currency, sidebar, hooks)
  middleware.ts           → Clerk + per-route locale
```

## Routing

i18n routing by `[locale]` directory (the `i18n` config in `astro.config.mjs`):
`prefixDefaultLocale: true` (all locales prefixed, including the default),
`redirectToDefaultLocale: true` (`/` redirects to `/es`) and `fallbackType: "redirect"`.
`Astro.currentLocale` resolves the URL locale; the standard pattern in pages is:

```ts
const locale = Astro.currentLocale ?? "es";
const t = getLocaleDict(locale);
```

```
/                          → Redirects to /es (default landing)
/es                        → Public landing (prerendered, Spanish)
/en                        → Public landing (English)
/es/app                    → Redirects to /es/app/dashboard (signed in) or /es/app/login
/en/app                    → Same, localized
/es/app/login              → Public
/es/app/dashboard          → Monthly summary (full SSR)
/es/app/{transactions, cards, installments, recurring-payments, cashback,
     shopping, pantry, tasks, notes, events, payment-methods, categories}
/en/app/...                → Same routes in English
/api/{module}/             → CRUD list (GET/POST)
/api/{module}/[id]         → CRUD single (GET/PATCH/PUT/DELETE)
/api/{module}/[id]/monthly → Nested sub-route (recurring-payments)
/api/card-monthly/…        → Debt calculation and history
```

- Internal links are generated with `getRelativeLocaleUrl(locale, "/app/...")` (import from `astro:i18n`) to keep the language prefix.
- `/api/*` routes have no locale prefix.
- **Language redirects**: `LocaleSwitcher` (`src/components/ui/LocaleSwitcher.tsx`, `client:load` island) uses the custom `Select` and navigates to `/{locale}{basePath}` preserving the query string.

Prerender rules: only the landing `[locale]/index.astro` is prerendered (`export const prerender = true` + `getStaticPaths`). Everything under `/app/*` is SSR because it depends on auth and the database.

## Authentication / Middleware

`src/middleware.ts` — `clerkMiddleware` from `@clerk/astro/server`:

1. Clerk validates the session.
2. `findOrCreate(clerkId)` creates the local user if it doesn't exist.
3. `needsSync` — if email or display_name is missing, syncs from the Clerk API (avoids the HTTP call on every request).
4. Injects `context.locals.userId` and `context.locals.createdAt`.
5. No session on `/app/*` or `/en/app/*` routes → redirects to a localized `/app/login` via `context.currentLocale` + `getRelativeLocaleUrl`.

Public routes: `/`, `/en`, `/app/login` and `/en/app/login`. React hooks from `@clerk/astro/react` (not `@clerk/clerk-react`).

### Localizing Clerk components

Clerk components (UserButton, SignIn/SignUp) are localized per language with `@clerk/localizations`. The locale → resource mapping lives in `getClerkLocalization(locale)` (`src/lib/i18n/clerk-localizations.ts`): `es` → `esES`, `en` → `enUS` (default `esES`). The `clerk()` integration in `astro.config.mjs` receives `localization: getClerkLocalization(DEFAULT_LOCALE)` as its default value (only affects embedded components, not the Account Portal) and `prefetchUI: false` (Clerk/ClerkUI is downloaded on demand when opening a modal-type component like SignIn/UserButton; the integration's `before-hydration` only waits for ClerkJS, not ClerkUI). `ClerkLocaleBridge` (`src/components/ui/ClerkLocaleBridge.tsx`, a `client:load` island in `AppLayout` and `LandingLayout`) adjusts the localization to the page locale with `updateClerkOptions({ localization })` from `@clerk/astro/client`.

## Database

### Connection (`src/lib/db/client.ts`)

```ts
getDb() → @libsql/client/web singleton client
```

### Helpers (`src/lib/db/utils.ts`)

- `nextSeq("table")` → `COALESCE(MAX(seq), 0) + 1`
- `scopedFindById`, `scopedDelete`, `insertRow`, `applyUpdate`, `now`, `SqlValue`

### Schema (`db/schemas/`)

14 modular files with numeric prefix, idempotent (`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`). They represent the final state for new deploys.

| # | File | Tables |
|---|---|---|
| 01 | `01-users.sql` | `users` |
| 02 | `02-cards.sql` | `cards` |
| 03 | `03-categories.sql` | `categories` |
| 04 | `04-installments.sql` | `installments` |
| 05 | `05-transactions.sql` | `transactions` |
| 06 | `06-pantry.sql` | `pantry` |
| 07 | `07-notes.sql` | `notes`, `note_tags`, `note_tag_links` |
| 08 | `08-events.sql` | `events` |
| 09 | `09-recurring-payments.sql` | `recurring_payments`, `recurring_payment_monthly` |
| 10 | `10-cashback.sql` | `cashback` |
| 11 | `11-shopping.sql` | `shopping_lists`, `shopping_items` |
| 12 | `12-tasks.sql` | `tasks` |
| 13 | `13-payment-methods.sql` | `payment_methods` |
| 14 | `14-card-monthly.sql` | `card_monthly` |

**Production changes**: deliver the migration SQL (`ALTER TABLE`, `CREATE INDEX`) to the user **and** update the corresponding `.sql` file in `db/schemas/` to reflect the final schema.

### Seed (`db/seed.js`)

ESM, runs with the latest Node version. Inserts 3 global payment methods (payroll, transfer, cash) and 27 predefined categories in 6 sections (pantry, tasks, transactions, installments, recurring-payments, events).

```sh
pnpm db:seed:dev    # uses .env.development
pnpm db:seed:prod   # uses .env.production
```

## REST API

### Factories (`src/lib/api-routes.ts`)

- **`createIdRoutes(repo, { get?, patch?, put?, delete?, notFoundMessage? })`** → `GET`/`PATCH`/`PUT`/`DELETE` handlers for `/api/*/[id]`. `repo` must expose `findById`/`update`/`delete` (scoped by `userId`). Variants: `{ get: false }` (payment-methods, categories), `{ patch: false }` (pantry), `{ patch: false, notFoundMessage: "No encontrado" }` (recurring-payments).
- **`createIndexRoutes(repo, { buildFilter?, validateCreate? })`** → `GET`/`POST` handlers for `/api/*/`. `buildFilter(params, context)` builds the repo filter; `validateCreate(body)` returns `string | null`. Without `buildFilter`, the GET calls `findAll(uid)` (payment-methods, recurring-payments, cards).

Usage: `export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new XRepository())`. Astro resolves the handlers by reading `mod[method]`.

All factory handlers are wrapped in `withErrorHandling` and read the body with `readJsonBody` (invalid body → `400 "Body inválido"`), casting `as unknown as U`/`C` to the repo's typed inputs.

### Custom routes (no factory)

`categories/index.ts` (dup-check 409 + section merge), `pantry/index.ts` (default `category_id`), `recurring-payment-monthly/index.ts` (by month, PATCH/DELETE via query param), `card-monthly/index.ts` (upsert/toggle) and `history.ts`, `notes/tags/*`, `pantry/categories/*`, `users/currency.ts`, `users/created-at.ts`, `shopping/toggle.ts`, `tasks/toggle.ts`, `shopping/lists/[id]/complete.ts`, `recurring-payments/[id]/monthly.ts`. All wrapped in `withErrorHandling` + `readJsonBody`.

### Special endpoints

| Route | Action |
|---|---|
| `POST /api/card-monthly/calculate` | Calculates card debt for a month |
| `GET /api/card-monthly/history` | Card payment history |
| `POST /api/recurring-payments/[id]/monthly` | Monthly snapshot upsert |
| `GET/PATCH/DELETE /api/recurring-payment-monthly` | Snapshots by month (`?month=`) |
| `POST /api/shopping/toggle` | Toggle item check |
| `POST /api/tasks/toggle` | Toggle task completion |
| `GET/POST /api/shopping/lists` | Shopping lists |
| `PATCH/DELETE /api/shopping/lists/[id]` | Rename / delete list |
| `POST /api/shopping/lists/[id]/complete` | Finish list |
| `GET/PUT /api/users/currency` | Currency preference |
| `GET /api/users/created-at` | User signup date |

### Helpers (`src/lib/api-helpers.ts`)

- `jsonResponse(data, status?)` — standard JSON response `{ success, data }`
- `errorResponse(message, status?)` — JSON error `{ success, error }`
- `requireUserId(context)` — extracts `locals.userId` or returns a 401 `Response`
- `getSearchParams(context)` — typed query params
- `parsePageParams(url)` — `page`/`pageSize` with clamps
- `parseBoolParam(value)` — `?x=true|false` → `boolean | undefined`
- `getDateRange(params, createdAt)` — "Last year" window (see [month filter](#month-filter))
- `withErrorHandling(handler)` — wraps an `APIRoute`; any throw → JSON `500 "Error interno del servidor"` with `console.error` (instead of Astro's HTML 500)
- `readJsonBody(context)` — parses the body as an object; `Record<string, unknown> | null` if malformed/array/primitive

## Types

16 files in `src/lib/types/`, one per domain. Conventions:

- All IDs are `string` (UUID, `TEXT PRIMARY KEY` in SQL)
- `category_id`, `payment_method_id`, `card_id`, `list_id`, `despensa_item_id` are `string | null` when optional
- `amount`, `total`, `balance` are `number`
- `created_at` is an ISO string
- `CategoryType`: `"global" | "personal"`; `PaymentMethodType`: `"global" | "personal" | "card"`
- No `any`, no `scope`, no `family_id`. Bind args: `(string | number | boolean | null)[]`

## Modules

Each module in `src/lib/modules/{name}/` contains `repository.ts` (CRUD + specific queries) and, optionally, extra logic.

### Repositories — patterns

- Queries with `db.execute({ sql, args })` and `?` bind params.
- `nextSeq("table")` for `seq`.
- **Categories**: `create()` checks for duplicate names (the API responds 409). No separate repo.
- **Recurring Payments**: `upsertMonthly()` snapshots `category_id` and `payment_method_id`.
- **Cards**: creating/updating/deleting a card syncs the associated `PaymentMethod`.
- **Shopping**: `ShoppingRepository` (items) + `ShoppingListRepository` (lists). `complete()` finishes the list and its items; `delete()` removes list + items. The list name is optional (the UI shows local date+time by default).

### Card Monthly (`calculator.ts`)

`calculateCardDebt(cardId, month)`:

```
Debt = SUM(month transactions)
       + SUM(monthly installment of active plans)
       + SUM(month recurring payments)
       - SUM(applied cashback)
```

### Categories

- `UNIQUE(user_id, name)` — no two categories with the same name.
- `type: "global"` (preloaded) or `"personal"` (user-created).
- `sections` (JSON) — in which modules the category appears.
- `displayCategoryName()` in `src/lib/i18n/category-labels.ts` separates the stored value (English, lowercase, hyphens) from the visual representation.

## Centralized UI strings (i18n)

- **One dictionary per language** in `src/lib/i18n/`: `es.ts` (defines the `Locale = typeof es` type) and `en.ts` (typed as `Locale`). `locale.ts` exports `LOCALES` (`["es", "en"]`), `LocaleCode` and `getLocaleDict(code)`. **No barrels or `index.ts`**.
- **Always consume with `t`**: in SSR/pages `const t = getLocaleDict(Astro.currentLocale ?? "es")`; in React islands pass `locale` as a prop and resolve with `getLocaleDict(locale)`, or use the `useLocaleDict()` context (the container wraps its tree in `<LocaleProvider locale={locale}>`). Never import `es` directly to read strings.
- **Shared strings**: an internal (unexported) `shared` dictionary with values repeated between sections; each section points to it with its own key (`field.category: shared.category`, `filter.allCategories: shared.allCategories`). Sections stay independent and can diverge by creating a different `shared` key. There are separate keys for singular/plural/title and for canonically different strings.
- **Never hardcode UI strings**: import the helper parameterized with `t` (`general-fields.ts`, `filter-fields.ts`, `form-fields.ts`) or access `t.*`. User data (names, descriptions) never goes into the dictionary.
- Dynamic strings as functions: `t.common.deleteConfirm(label)`, `t.shopping.toBuy(n)`, `t.error.message(msg)`.
- **System name mapping**: `displayCategoryName(cat, t)` (`category-labels.ts`) and `displayPaymentMethodName(pm, t)` (`payment-method-labels.ts`) read from `t.categoryLabels.*` / `t.paymentMethodLabels.*`.
- **Language switching**: `LocaleSwitcher.tsx` (in `Sidebar` and `Header`) navigates between locales preserving the URL and query params.

## Forms

Helpers in `src/lib/i18n/form-fields.ts` (all parameterized with `t`):

```ts
fieldType(t)              → type select (expense/income)
fieldTypeCurrency(t)      → currency select
paymentMethodField(t, pms) → payment methods select
categoryField(t, cats)     → categories select
cardField(t, cards)        → cards select
dateField(t, name?)        → date input
CURRENCY_OPTIONS / TYPE_OPTIONS → options
INPUT_CLASS / COLOR_CLASS → classes
```

- Button/CTA strings live in `general-fields.ts` (`BTN_EDIT(t)`, `BTN_SAVE(t)`, …) and filter strings in `filter-fields.ts` (`FILTER_ALL_MONTHS(t)`, `FILTER_SEARCH_DESC(t)`, `BTN_CLEAR(t)`, …); purely CSS constants (classes) stay static.

- Standard field order: **Date → Type → Description → Amounts → Currency → Payment method/Card → Category → Specific**.
- `required: true` → `NOT NULL` in the SQL schema.
- Decimals: raw string in `onChange`, convert to number in `handleSubmit`.
- Color picker: `w-full`, no reset button.
- Every label/input with `htmlFor`/`id`.

## Filters and URL state

- **The URL is the source of truth.** Tab, filters and search are restored from query params. No params → default values.
- Filter/tab changes don't reload: `history.pushState`/`replaceState` + client fetch.
- Filters at their default value don't add params; picking a specific one does. Active tab is always in `?tab=` (never `#hash`; old hashes are adopted in the client).
- Filters are interoperable (AND).
- `*Filterable` components use `useFilteredData` (`src/lib/ui/useFilteredData.ts`): it handles filters, fetch, URL and error state (`error`, shown as a `role="alert"` banner). The initial filter state is restored from the URL; it excludes `tab` (managed by `TabBar`).
- `TabBarWithMonth` dispatches `window.dispatchEvent(new CustomEvent("monthchange", { detail: { month } }))`. `RecurringPaymentsMonthly`, `RecurringPaymentsHistory`, `CreditCardSummary` and `CardsHistory` listen to it to refetch.

### Month filter

- Account age < 12 months: months from signup to the current one + the next one.
- Account age ≥ 12 months: last 12 months incl. the current one + the next one.
- "Last 12 months" option (`FILTER_ALL_MONTHS(t)`).
- **General summary** → current month by default. **History/records** → "Last 12 months" by default.
- Without `month`, APIs and SSR apply `lastYearWindow(createdAt)` (`src/lib/date.ts`) instead of the whole history. In SSR transactions with the default window, `limit: 200` is added.

## Components

### Shared UI (`src/components/ui/`)

| Component | Description |
|---|---|
| `ThemeToggle.tsx` | Light/dark/system toggle with localStorage persistence (accepts `locale`) |
| `Select.tsx` | Accessible combobox, portal dropdown `position: fixed`, viewport-aware. `fitWidest` prop. Strings via `useLocaleDict()` context |
| `MultiSelect.tsx` | Multi-select with checkboxes |
| `ErrorBoundary.tsx` | React error boundary (`role="alert"` with `t.error.message`) |
| `LocaleSwitcher.tsx` | Language switcher using the custom `Select` (navigates between locales preserving URL/query) |
| `ClerkLocaleBridge.tsx` | Applies the page locale to Clerk components via `updateClerkOptions` |

### App UI (`src/components/app/ui/`)

| Component | Description |
|---|---|
| `CrudModal.tsx` | Generic CRUD modal (triggered by `data-create="module"` / `data-edit-{module}="id"`) |
| `FormModal.tsx` | Base modal: focus trap, Escape, autofocus, ARIA |
| `ConfirmDelete.tsx` / `DeleteHandler.astro` | Delete confirmation without native `confirm()` |
| `ToggleHandler.astro` | Active/inactive toggle (try/catch + reload only on success) |
| `DataTable.astro` | Table with `ariaLabel` prop (`.astro`) |
| `TabBar.tsx` | APG tabs; become a custom Select on mobile |
| `TabBarWithMonth.tsx` | `TabBar` + `MonthSelector` + `monthchange` event |
| `MonthSelector.tsx` | Monthly navigation |
| `FilterSelect.tsx` | Select that navigates to an href with the filter |
| `FilterLinks.astro` | Filter pills with active state |
| `CurrencySelect.tsx` | Currency selector, syncs API + localStorage |
| `PageHeader.astro` | Title + CTA button (`createLabel`/`createModule`) |
| `Sidebar.astro` | Data-driven nav sidebar (`APP_LINKS`) + ThemeToggle + CurrencySelect + UserButton |

### Section components (`src/components/app/{module}/`)

- **Dashboard**: `DashboardHeader.tsx` (only `MonthSelector`).
- **Transactions**: `TransactionsFilterable.tsx`.
- **Installments**: `InstallmentsFilterable.tsx` + `InstallmentsSummary.tsx`.
- **Cashback**: `CashbackFilterable.tsx`.
- **Pantry**: `PantryFilterable.tsx`.
- **Cards**: `CreditCardSummary.tsx` + `CardsHistory.tsx`.
- **Recurring payments**: `RecurringPaymentsMonthly.tsx` + `RecurringPaymentsHistory.tsx`.
- **Shopping**: `ShoppingList.tsx`.

### Locale pattern in React islands

Every island (`client:load`) receives `locale` from the SSR page (`<X locale={locale} />`) and resolves its strings with `getLocaleDict(locale)`. Components using `useLocaleDict()` (Select, MultiSelect, MonthSelector) must be wrapped in `<LocaleProvider locale={locale}>` by their container (`TabBar`, `TabBarWithMonth`, `DashboardHeader`, `*Filterable`, `CrudModal`, `ConfirmDelete`, `ShoppingList`, etc.). `*Filterable` components also receive the SSR initial data as props.

### Select vs MultiSelect usage rules

- Month filter → always the custom `Select`.
- Any other filter with an option set → `MultiSelect`.
- Selecting all options → all records (no restriction).

### Tabs (APG pattern)

`role="tablist"` + `aria-label`; tabs with `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`, ←/→/Home/End navigation; panels with `role="tabpanel"` + `aria-labelledby` + `tabindex="0"`. Implemented in `TabBar.tsx` and duplicated in `ShoppingList.tsx`. On mobile, tabs become a custom Select (same line as the month filter).

## Dashboard

- Content **100% SSR** in `src/pages/[locale]/app/dashboard.astro` (no React content islands).
- `DashboardHeader.tsx` — only `MonthSelector`, aligned to the right of the title.
- Data from `src/lib/dashboard/load.ts` → `loadDashboardMonth(userId, month)`: the same queries as the API but via repositories (no HTTP). It doesn't recalculate debt or `upsert` `card_monthly` per visit (that happens on demand from the client via `/api/card-monthly/calculate` and from the cards page).
- `src/lib/dashboard/api.ts` → `payCardDebtFull` / `payCardDebtPartial` (payment mutations from the client).
- Metric cards: income, expenses, balance, credit cards, installments, recurring, pending tasks, upcoming events, active shopping lists.

## Error handling

- **API**: all handlers (factory and custom) wrapped in `withErrorHandling`; bodies parsed with `readJsonBody` (400 "Body inválido"). Errors → JSON with `console.error`, never HTML.
- **Client fetch**: `src/lib/safeFetch.ts` — `safeFetch<T>` (GET → data, mutation → boolean) and `fetchList<T>`. Logs errors with `console.error` instead of silently swallowing them.
- **`api-client.ts`** — `apiFetch<T>` throws an `Error` with the server message if `!res.ok`.
- **Hooks**: `useFilteredData` returns `error` (string) that `*Filterable` components show as a `role="alert"` banner. Never silence fetch errors.
- **React**: `ErrorBoundary` in `src/components/ui/`.
- **Delete confirmation**: `ConfirmDelete` (no native `confirm()`). Form errors inline with `role="alert"`.

## PWA

- Active only under `/es/app/*` and `/en/app/*`.
- `AppLayout` injects via `slot="head"`: manifest link, theme-color and meta tags.
- `public/sw.js` (cache `open-prp-v3`): does not precache HTML. Navigations (`mode: "navigate"` or `Accept: text/html`, including the `ClientRouter` fetch) always go to the network — SSR/auth HTML is never served from cache. Only static app assets (`/_astro/` and subresources under `/es/app/*` and `/en/app/*`) are cached with stale-while-revalidate, and old caches are purged on `activate`.
- `public/manifest.webmanifest`: `scope: "/"` (to cover `/es/app/*` and `/en/app/*`), `start_url: "/es/app/dashboard"`, `display: standalone`.

## Accessibility

- Global `:focus-visible` in `global.css`.
- Decorative icons: `aria-hidden="true"`.
- Navigation, inputs, buttons without visible text: `aria-label`.
- Modals: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape.
- Select/MultiSelect: `role="combobox"`, `aria-activedescendant`, `ariaLabel` prop.
- DataTable: `ariaLabel` prop.
- Labels/inputs linked with `htmlFor`/`id`.

## Environment variables

Declared with Astro's `envField` schema in `astro.config.mjs` (`env.schema`). Validates at build that required ones exist and provides types for `import.meta.env.*`.

| Variable | Context | Access | Description |
|---|---|---|---|
| `TURSO_DB_URL` | server | secret | Turso database URL |
| `TURSO_DB_TOKEN` | server | secret | Turso auth token |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | client | public | Clerk publishable key |
| `CLERK_SECRET_KEY` | server | secret | Clerk secret key |

## Deployment

- Build: `pnpm build` → `dist/`.
- Adapter: `@astrojs/netlify` (serverless functions).
- `@libsql/client/web` compatible with Netlify Functions.
- Site: `https://ophrp.marcvspt.tech`.
