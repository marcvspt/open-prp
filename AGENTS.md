## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project Structure

- **Routing**: `/` → redirects to `/dashboard` (logged in) or `/login` (not logged in). `/login` redirects to `/dashboard` if already authenticated. Middleware also redirects any route (except `/login`) to `/login` if not authenticated.
- **Pages**: each module has a page in `src/pages/*.astro` and API routes in `src/pages/api/*/`
- **Modules** (in `src/lib/modules/`): `transactions`, `card-monthly`, `cashback`, `credit-cards`, `events`, `installments`, `notes`, `pantry`, `payment-methods`, `recurring-payments`, `shopping`, `tasks`, `users`
- **React components**: use `client:load` directive for hydration
- **All imports**: use `@/` alias (e.g. `@/lib/db/client`, `@/components/ui/Select`)

## TypeScript

- **No `any`** types. SQL bind args use `(string | number | boolean | null)[]`.
- **Catch blocks**: omit unused error parameter (`catch {`), or use `catch (e: unknown)` and log.
- **CategoryType**: `"global" | "personal"` (no `"family"` or `"both"`)
- **PaymentMethodType**: `"global" | "personal" | "card"` (no `"family"` or `"both"`)
- No `scope` or `family_id` in any type or repository.

## Database

### Schema & Seeding

Schema SQL: `db/schema/*.sql` — archivos modulares (uno por módulo de negocio), con prefijo numérico para orden de creación. Cada archivo usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS` para ser idempotente.

- Tabla `categories` tiene `UNIQUE(user_id, name)` para evitar duplicados.
- Tabla `events` y `tasks` no tienen campo `title` — solo `description`.
- Tabla `recurring_payment_monthly` tiene columnas `category_id` y `payment_method_id` para snapshot al momento de creación.

- Seed: `pnpm db:seed` (carga `.env` + `.env.development`)
- Seed producción: `pnpm db:seed:prod` (carga `.env` + `.env.production`)
- El script usa `@libsql/client` (Node version) para ejecución directa.

### Repository layer

Each module in `src/lib/modules/*/repository.ts` uses `getDb()` from `src/lib/db/client.ts` which returns a raw `@libsql/client/web` instance. All queries use `db.execute({ sql, args })` with `?` bind parameters to prevent SQL injection.

- **Categories**: `create()` checks for existing name before inserting; if exists, returns existing (API prevents with 409).
- **Recurring Payments**: `upsertMonthly()` snapshots `category_id` and `payment_method_id` from the template at creation time.
- **findAll() on recurring-payments**: LEFT JOIN con `categories` y `payment_methods` para traer `category_name`, `payment_method_name`, `payment_method_icon`.

Common helpers:
- `nextSeq("table_name")` — gets `COALESCE(MAX(seq), 0) + 1` for a table via raw SQL
- `getDb()` — creates/returns a singleton `@libsql/client/web` client

## Auth & Middleware

- Uses `@clerk/astro` with `clerkMiddleware` in `src/middleware.ts`
- **Clerk user sync**: on every request, `needsSync()` checks if `email`/`display_name` are empty OR `updated_at` is older than 5 min. If so, calls Clerk API (`users.getUser`) and updates `email`/`display_name` in the local DB.
- React hooks from Clerk: import from `@clerk/astro/react` (e.g. `useAuth`), NOT from `@clerk/clerk-react` (not installed).
- The `UserButton` + "Mi cuenta" area is clickable as a whole via a forwarded click script.

## UI / Components

### Select & MultiSelect

- `Select.tsx` — combobox accesible con teclado. Used throughout the app.
- `MultiSelect.tsx` — multi-selection with checkboxes and "Todas las secciones" option.
- **Dark mode**: selected options use `bg-indigo-100/50 dark:bg-indigo-900/30` instead of hardcoded light colors.

### CrudModal

- `CrudModal.tsx` renders a generic CRUD form modal. Triggered by `data-create="{module}"` and `data-edit-{module}="{id}"` attributes.
- The `data-create` attribute uses `=` syntax (e.g. `data-create="categories"`), NOT hyphenated (`data-create-categories`).
- After save, calls `window.location.reload()`. Components using `history.replaceState` must preserve `location.pathname` (not fallback to `"/"`) to avoid reloading to root.

### Events & Tasks (cards layout)

- **Events** and **Tasks** pages use a grid of cards instead of DataTable.
- **Events** have no `title` field — only `description`. Cards show: description, status badge (with color + icon), start/end dates, category with icon, location.
- **Tasks** have no `title` field — only `description`. Cards show: checkbox, description, priority badge (with color + icon), category with icon, due date.

### Theme

- Dark mode toggle via `ThemeToggle.tsx`, stores preference in localStorage.
- CSS variables in `global.css` handle light/dark theming.
- Clerk components adapt automatically via `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark`.

## Deployment

Adaptador de Netlify configurado en `astro.config.mjs`. Conectar el repo en Netlify y configurar variables de entorno en el dashboard.

El cliente de BD (`@libsql/client/web`) funciona en Netlify Functions sin cambios.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
