# Open PRP — Guía para agentes

## Desarrollo

```bash
astro dev --background
astro dev stop | status | logs
```

- **Builds**: el **usuario** ejecuta el build (`pnpm build`) y comparte la salida. El agente NO corre builds (node vive en fnm, fuera del PATH del shell).

## Estructura del proyecto

- **Ruteo**: `/` → landing pública. `/app` → redirige a `/app/dashboard` (logueado) o `/app/login` (no logueado). Middleware protege `/app/*` excepto `/app/login`.
- **Páginas**: `src/pages/app/*.astro` + API en `src/pages/api/*/`
- **Módulos**: `src/lib/modules/` — `transactions`, `card-monthly`, `cards`, `cashback`, `events`, `installments`, `notes`, `pantry`, `payment-methods`, `recurring-payments`, `recurring-payment-monthly`, `shopping`, `tasks`, `users`
- **Componentes React**: directiva `client:load`
- **Imports**: alias `@/` con **extensión explícita** (`.ts`, `.tsx`, `.astro`, `.svg`)
- **Tipos**: `src/lib/types/` (1 archivo por dominio). Nunca tipos inline.
- **Separación lógica/UI**:
  - `src/lib/ui/` — lógica browser vanilla TS: `theme.ts`, `currency.ts`, `sidebar.ts`, `tabs.ts`
  - `src/lib/dashboard/api.ts` — fetch datos + mutaciones dashboard
  - `src/lib/dashboard/load.ts` — `loadDashboardMonth()` SSR: mismas queries vía repositorios (sin HTTP), usado en `dashboard.astro`
- **SSR initial data**: las islas React reciben datos del primer render vía props (`initialData={JSON.stringify(...)}` desde repositorios en frontmatter). Re-fetch solo al cambiar filtros (`useRef` con mes/valor cargado) o tras mutaciones. Aplica a: `DashboardContent`, `ShoppingList`, `RecurringPaymentsMonthly`, `CurrencySelect` (moneda desde `UserRepository` en Sidebar), `*Filterable` (vía `useFilteredData`)
  - `src/lib/format.ts` — `formatCurrency`
  - `src/lib/safeFetch.ts` — `safeFetch` + `fetchList`
  - `src/lib/form-fields.ts` — config campos formulario para CrudModal (`CURRENCY_OPTIONS`, `TYPE_OPTIONS`, helpers `paymentMethodField()`, `categoryField()`, `cardField()`, `dateField()`)
    - **Siempre** usar helpers en vez de fields inline
    - **Orden estándar**: Fecha → Tipo → Descripción → Montos → Moneda → Método pago/Tarjeta → Categoría → específicos
    - **required=true** → `NOT NULL` en schema SQL (auditado, todo OK)
- **Tags `<script>`**: importar funciones init desde `src/lib/ui/`
- **UI compartida vs app**: `src/components/ui/` (ThemeToggle, Select, MultiSelect, ErrorBoundary); `src/components/app/ui/` (CrudModal, DataTable, FormModal, FilterLinks, CurrencySelect, MonthSelector, etc.)

### Assets

- 18 SVGs en `src/assets/` (kebab-case), importados vía `@/assets/*` con `vite-plugin-svgr`. Identificador PascalCase + `Icon`.
- En `.tsx` usar sufijo `?react` para componente React.

### Layouts

- `BaseLayout.astro` — `<html>`, `<head>`, meta, favicon, dark mode inline script, título `"Open PRP | {title}"`, `<slot name="head" />`
- `AppLayout.astro` — extiende BaseLayout. Inyecta manifest PWA + theme-color vía `slot="head"`. Sidebar + main + pantalla login. Registra service worker.
- `LandingLayout.astro` — extiende BaseLayout. Header + slot + Footer.

### Sidebar

- Fija `w-64` desktop, oculta en móvil (drawer con overlay + backdrop)
- Navegación data-driven: `APP_LINKS` (grupos `{ title?, links: [{ href, label, icon }] }`), activo vía `currentPath.startsWith(href)`
- Footer: GitHub icon, ThemeToggle, CurrencySelect (moneda vía `UserRepository` SSR), UserButton (`@clerk/astro/components`) + "Mi cuenta"
  - UserButton envuelto en caja fija `h-8 w-8 rounded-full bg-surface-alt` (placeholder) + `appearance.userButtonAvatarBox` 2rem: ClerkJS monta el avatar asíncrono (CDN); sin la caja, el footer crece tarde y salta el layout

## TypeScript

- **Sin `any`**. Bind args: `(string | number | boolean | null)[]`.
- Catch: `catch { }` o `catch (e: unknown)` + log.
- **CategoryType**: `"global" | "personal"`
- **PaymentMethodType**: `"global" | "personal" | "card"`
- Sin `scope` ni `family_id`.

## Base de datos

### Schema (db/schema/*.sql)

14 archivos modulares, prefijo numérico, idempotentes (`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).

**Cambios en producción**: entregar SQL de migración (`ALTER TABLE`, `CREATE INDEX`) al usuario + actualizar schema `.sql`.

### Repositorios

`src/lib/modules/*/repository.ts` usa `getDb()` de `@libsql/client/web`. Queries con `db.execute({ sql, args })` y `?` bind params.

- `nextSeq("table")` — `COALESCE(MAX(seq), 0) + 1`
- Categories: `create()` verifica duplicado por nombre (API responde 409)
- Recurring Payments: `upsertMonthly()` hace snapshot de `category_id` y `payment_method_id`
- `findAll()` en recurring-payments: LEFT JOIN con categories y payment_methods

## Auth / Middleware

- `@clerk/astro` con `clerkMiddleware` en `src/middleware.ts`
- `needsSync()` — sync perfil si email/name vacío o >5 min desde último sync
- Hooks React desde `@clerk/astro/react` (NO `@clerk/clerk-react`)
- UserButton con `afterSignOutUrl="/app/login"` y `client:load`
- Clerk redirects configurados en `astro.config.mjs`: `afterSignInUrl`, `afterSignUpUrl`, `afterSignOutUrl`

## UI / Componentes

### Tema

- ThemeToggle con persistencia localStorage, icons como `options[].icon`
- CSS tokens `@theme`: `primary`, `success`, `danger`, `warning`, `info` con variantes `-hover`, `-text`, `-bg`, `-border`
- Colores base: `surface`, `surface-alt`, `panel`, `border`, `border-light`, `string`, `string-muted`, `nav`, `nav-hover`, `nav-active`, `nav-active-text`, `overlay`
- `color-scheme: light` en `:root`, `color-scheme: dark` en `.dark`

### Select / MultiSelect

- Dropdown portaleado a `body` con `position: fixed`, viewport-aware (maxHeight dinámico).
- `ariaLabel` prop, `aria-activedescendant`, `role="combobox"`.

### CrudModal

- Modal CRUD genérico. Se dispara con `data-create="module"` y `data-edit-{module}="id"`.
- Campos `required: true` muestran `*` rojo.
- Decimal: raw string en onChange, se convierte a número en `handleSubmit`.
- Color picker: `w-full`, sin botón reset.
- `htmlFor`/`id` en todos los labels/inputs.

### FormModal

- `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape handler, autofocus.

### DataTable

- `ariaLabel` prop.

### Dashboard

- `DashboardContent.tsx`: 6 tabs (Resumen, Tarjetas, Plazos, Eventos, Tareas, Historial) + MonthSelector.
- Datos desde `src/lib/dashboard/api.ts` en estado `monthData: DashboardMonthData`.
- StatCard: `label`, `value`, `colorClass`, `sub`.
- FilterLinks: `filters: { value, label, href }[]` + `active`.

### PWA

- Solo en `/app/*`: manifest link + theme-color + meta tags inyectados en AppLayout vía `slot="head"`.
- Service Worker (`public/sw.js`): precachea rutas `/app/*`, estrategia network-first con fallback a cache.
- Manifest (`public/manifest.webmanifest`): `scope: "/app/"`, `start_url: "/app/dashboard"`, `display: standalone`.

### Accesibilidad

- `:focus-visible` global, contraste mejorado en colores oscuros.
- `aria-hidden="true"` en iconos decorativos (Hero, Sidebar, Header, Select).
- `aria-label` en nav, inputs, botones sin texto visible.
- `role="dialog"`, `aria-modal`, `aria-labelledby` en modales.

### Landing

- `LandingLayout.astro` → Header + slot + Footer.
- Header: hamburger menu móvil con animación, links data-driven (`LANDING_LINKS`), CTA, GitHub, ThemeToggle.
- Login buttons: `SignInButton`/`SignUpButton` con `asChild` + Tailwind styling.
- `FeatureCard.astro` desde array `FEATURES_INFO`.
- Footer: GitHub + marcvspt.tech.

## Despliegue

- Netlify adapter en `astro.config.mjs`.
- `@libsql/client/web` funciona en Netlify Functions.
- Variables de entorno: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

## Convenciones importantes

- Sin `key={}` en elementos HTML en `.astro`.
- `data-create` usa sintaxis con `=` (`data-create="categories"`), no con guiones.
- `FetchEvent` de service worker usa `new URL(e.request.url)` para examinar path.
