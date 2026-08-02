# Open PRP — Documentación técnica

Guía de arquitectura, desarrollo y contribución. Para el uso de la app como producto, ver el [README](README.md).

## Índice

1. [Arquitectura](#arquitectura)
2. [Enrutamiento](#enrutamiento)
3. [Autenticación / Middleware](#autenticación--middleware)
4. [Base de datos](#base-de-datos)
5. [API REST](#api-rest)
6. [Tipos](#tipos)
7. [Módulos](#módulos)
8. [Textos UI centralizados](#textos-ui-centralizados)
9. [Formularios](#formularios)
10. [Filtros y estado en URL](#filtros-y-estado-en-url)
11. [Componentes](#componentes)
12. [Dashboard](#dashboard)
13. [Manejo de errores](#manejo-de-errores)
14. [PWA](#pwa)
15. [Accesibilidad](#accesibilidad)
16. [Variables de entorno](#variables-de-entorno)
17. [Despliegue](#despliegue)

## Arquitectura

```
cliente (navegador) → Astro SSR → API Routes → Repositorios → Turso (libSQL)
                          ↕
                    Clerk (Auth)
```

- **SSR-first**: Astro renderiza en servidor; los datos se obtienen vía repositorios en el frontmatter de la `.astro` y la página llega renderizada al cliente.
- **React 19** se hidrata con `client:load` únicamente donde hay interactividad en cliente (islas). El contenido del dashboard es 100% SSR, sin islas.
- **API REST**: endpoints en `src/pages/api/*` construidos con factories en `src/lib/api-routes.ts` y helpers en `src/lib/api-helpers.ts`.
- **Sin ORM**: queries SQL directas con `@libsql/client/web` y bind params `?`.
- **Prefetch deshabilitado**: `prefetch: false` en `astro.config.mjs` (el `ClientRouter` por defecto precarga todo en hover, duplicando el fetch SSR por navegación).

### Estructura del proyecto

```
src/
  pages/                  → Rutas
    index.astro           → Landing pública (prerenderizada)
    app/*.astro           → Páginas de la app (SSR, protegidas)
    api/**/               → API Routes (CRUD por módulo)
  components/
    ui/                   → UI compartida landing + app
    app/ui/               → UI propia de la app
    app/{modulo}/         → Componentes específicos por sección
    landing/              → Componentes de la landing
  layouts/
    BaseLayout.astro      → <head>, ClientRouter, tema, título
    AppLayout.astro       → Sidebar + main + PWA
    LandingLayout.astro   → Header + slot + Footer
  lib/
    modules/{modulo}/     → Repositorios y lógica de dominio
    types/                → Tipos (un archivo por dominio)
    api-routes.ts         → Factories CRUD de la API
    api-helpers.ts        → Helpers de rutas API
    labels.ts             → Todos los textos UI
    form-fields.ts        → Helpers de campos de formulario
    filter-fields.ts      → Constantes de filtros
    general-fields.ts     → Constantes de botones/CTAs
    dashboard/            → load.ts (SSR) + api.ts (cliente)
    ui/                   → Lógica browser (theme, currency, sidebar, hooks)
  middleware.ts           → Clerk
```

## Enrutamiento

```
/                          → Landing pública (prerender)
/app                       → Redirige a /app/dashboard (logueado) o /app/login
/app/login                 → Pública
/app/dashboard             → Resumen mensual (SSR completo)
/app/{transactions, cards, installments, recurring-payments, cashback,
     shopping, pantry, tasks, notes, events, payment-methods, categories}
/api/{modulo}/             → CRUD list (GET/POST)
/api/{modulo}/[id]         → CRUD single (GET/PATCH/PUT/DELETE)
/api/{modulo}/[id]/monthly → Sub-ruta anidada (recurring-payments)
/api/card-monthly/…        → Cálculo de deuda y historial
```

Reglas de prerender: solo la landing `/` está prerenderizada (`export const prerender = true`). Todo `/app/*` es SSR porque depende de auth y base de datos.

## Autenticación / Middleware

`src/middleware.ts` — `clerkMiddleware` desde `@clerk/astro/server`:

1. Clerk valida la sesión.
2. `findOrCreate(clerkId)` crea el usuario local si no existe.
3. `needsSync` — si falta email o display_name, sincroniza desde la API de Clerk (evita la llamada HTTP en cada request).
4. Inyecta `context.locals.userId` y `context.locals.createdAt`.
5. Redirige a `/app/login` si no hay sesión en rutas `/app/*`.

Rutas públicas: `/` y `/app/login`. Hooks de React desde `@clerk/astro/react` (no `@clerk/clerk-react`).

## Base de datos

### Conexión (`src/lib/db/client.ts`)

```ts
getDb() → cliente singleton @libsql/client/web
```

### Helpers (`src/lib/db/utils.ts`)

- `nextSeq("table")` → `COALESCE(MAX(seq), 0) + 1`
- `scopedFindById`, `scopedDelete`, `insertRow`, `applyUpdate`, `now`, `SqlValue`

### Schema (`db/schemas/`)

14 archivos modulares con prefijo numérico, idempotentes (`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`). Representan el estado final para deploys nuevos.

| # | Archivo | Tablas |
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

**Cambios en producción**: entregar al usuario el SQL de migración (`ALTER TABLE`, `CREATE INDEX`) **y** actualizar el `.sql` correspondiente en `db/schemas/` reflejando el esquema final.

### Seed (`db/seed.js`)

ESM, se ejecuta con la última versión de Node. Inserta 3 métodos de pago globales (payroll, transfer, cash) y 27 categorías predefinidas en 6 secciones (pantry, tasks, transactions, installments, recurring-payments, events).

```sh
pnpm db:seed:dev    # usa .env.development
pnpm db:seed:prod   # usa .env.production
```

## API REST

### Factories (`src/lib/api-routes.ts`)

- **`createIdRoutes(repo, { get?, patch?, put?, delete?, notFoundMessage? })`** → handlers `GET`/`PATCH`/`PUT`/`DELETE` para `/api/*/[id]`. `repo` debe exponer `findById`/`update`/`delete` (scope por `userId`). Variantes: `{ get: false }` (payment-methods, categories), `{ patch: false }` (pantry), `{ patch: false, notFoundMessage: "No encontrado" }` (recurring-payments).
- **`createIndexRoutes(repo, { buildFilter?, validateCreate? })`** → handlers `GET`/`POST` para `/api/*/`. `buildFilter(params, context)` construye el filtro del repo; `validateCreate(body)` devuelve `string | null`. Sin `buildFilter`, el GET llama `findAll(uid)` (payment-methods, recurring-payments, cards).

Uso: `export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new XRepository())`. Astro resuelve los handlers leyendo `mod[method]`.

Todos los handlers de factory están envueltos en `withErrorHandling` y leen el body con `readJsonBody` (body inválido → `400 "Body inválido"`), con cast `as unknown as U`/`C` a los inputs tipados del repo.

### Rutas custom (sin factory)

`categories/index.ts` (dup-check 409 + merge de secciones), `pantry/index.ts` (default `category_id`), `recurring-payment-monthly/index.ts` (by month, PATCH/DELETE por query param), `card-monthly/index.ts` (upsert/toggle) y `history.ts`, `notes/tags/*`, `pantry/categories/*`, `users/currency.ts`, `users/created-at.ts`, `shopping/toggle.ts`, `tasks/toggle.ts`, `shopping/lists/[id]/complete.ts`, `recurring-payments/[id]/monthly.ts`. Todas envueltas en `withErrorHandling` + `readJsonBody`.

### Endpoints especiales

| Ruta | Acción |
|---|---|
| `POST /api/card-monthly/calculate` | Calcula deuda de tarjeta en un mes |
| `GET /api/card-monthly/history` | Historial de pagos de tarjetas |
| `POST /api/recurring-payments/[id]/monthly` | Upsert snapshot mensual |
| `GET/PATCH/DELETE /api/recurring-payment-monthly` | Snapshots por mes (`?month=`) |
| `POST /api/shopping/toggle` | Toggle check de item |
| `POST /api/tasks/toggle` | Toggle completado de tarea |
| `GET/POST /api/shopping/lists` | Listas de compras |
| `PATCH/DELETE /api/shopping/lists/[id]` | Renombrar / eliminar lista |
| `POST /api/shopping/lists/[id]/complete` | Finalizar lista |
| `GET/PUT /api/users/currency` | Preferencia de moneda |
| `GET /api/users/created-at` | Fecha de alta del usuario |

### Helpers (`src/lib/api-helpers.ts`)

- `jsonResponse(data, status?)` — respuesta JSON estándar `{ success, data }`
- `errorResponse(message, status?)` — error JSON `{ success, error }`
- `requireUserId(context)` — extrae `locals.userId` o devuelve `Response` 401
- `getSearchParams(context)` — query params tipados
- `parsePageParams(url)` — `page`/`pageSize` con clamps
- `parseBoolParam(value)` — `?x=true|false` → `boolean | undefined`
- `getDateRange(params, createdAt)` — ventana "Último año" (ver [filtro de mes](#filtro-de-mes))
- `withErrorHandling(handler)` — envuelve un `APIRoute`; cualquier throw → JSON `500 "Error interno del servidor"` con `console.error` (en vez del HTML 500 de Astro)
- `readJsonBody(context)` — parsea el body como objeto; `Record<string, unknown> | null` si malformed/array/primitive

## Tipos

16 archivos en `src/lib/types/`, uno por dominio. Convenciones:

- Todos los IDs son `string` (UUID, `TEXT PRIMARY KEY` en SQL)
- `category_id`, `payment_method_id`, `card_id`, `list_id`, `despensa_item_id` son `string | null` si opcionales
- `amount`, `total`, `balance` son `number`
- `created_at` es string ISO
- `CategoryType`: `"global" | "personal"`; `PaymentMethodType`: `"global" | "personal" | "card"`
- Sin `any`, sin `scope`, sin `family_id`. Args de bind: `(string | number | boolean | null)[]`

## Módulos

Cada módulo en `src/lib/modules/{name}/` contiene `repository.ts` (CRUD + queries específicas) y, opcionalmente, lógica extra.

### Repositorios — patrones

- Queries con `db.execute({ sql, args })` y bind params `?`.
- `nextSeq("table")` para `seq`.
- **Categories**: `create()` verifica duplicado por nombre (la API responde 409). No hay repo separado.
- **Recurring Payments**: `upsertMonthly()` hace snapshot de `category_id` y `payment_method_id`.
- **Cards**: al crear/actualizar/eliminar una tarjeta, sincroniza el `PaymentMethod` asociado.
- **Shopping**: `ShoppingRepository` (artículos) + `ShoppingListRepository` (listas). `complete()` finaliza la lista y sus artículos; `delete()` borra lista + artículos. El nombre de lista es opcional (la UI muestra fecha+hora local por defecto).

### Card Monthly (`calculator.ts`)

`calculateCardDebt(cardId, month)`:

```
Deuda = SUM(transacciones del mes)
       + SUM(cuota mensual de plazos activos)
       + SUM(pagos recurrentes del mes)
       - SUM(cashback aplicado)
```

### Categories

- `UNIQUE(user_id, name)` — no dos categorías con el mismo nombre.
- `type: "global"` (precargadas) o `"personal"` (creadas por el usuario).
- `sections` (JSON) — en qué módulos aparece la categoría.
- `displayCategoryName()` en `src/lib/category-labels.ts` separa el valor almacenado (inglés, minúsculas, guiones) de la representación visual.

## Textos UI centralizados

- **`src/lib/labels.ts`** — diccionario `labels` con `as const` organizado por dominio (`common`, `field`, `table`, `empty`, `badge`, `stat`, `tabs`, `nav`, `theme`, `page`, `cta`, `singular`, `filter`, `currency`, `shopping`, `cards`, `recurring`, `dashboard`, `sections`, `select`, `error`). Estructura preparada para futuro i18n (**no implementar i18n**).
- **Nunca hardcodear textos UI**: importar `labels` o las constantes derivadas en `general-fields.ts` / `filter-fields.ts` / `form-fields.ts`. Los datos del usuario (nombres, descripciones) nunca van a labels.
- Strings dinámicos como funciones: `labels.common.deleteConfirm(label)`, `labels.shopping.toBuy(n)`, `labels.error.message(msg)`.

## Formularios

Helpers en `src/lib/form-fields.ts`:

```ts
FIELD_TYPE            → select tipo (expense/income)
FIELD_TYPE_CURRENCY   → select de moneda
paymentMethodField(pms) → select métodos de pago
categoryField(cats)     → select categorías
cardField(cards)        → select tarjetas
dateField(name?)        → input date
CURRENCY_OPTIONS / TYPE_OPTIONS → opciones
INPUT_CLASS / COLOR_CLASS → clases
```

- Orden estándar de campos: **Fecha → Tipo → Descripción → Montos → Moneda → Método pago/Tarjeta → Categoría → Específicos**.
- `required: true` → `NOT NULL` en schema SQL.
- Decimales: raw string en `onChange`, convertir a número en `handleSubmit`.
- Color picker: `w-full`, sin botón reset.
- Todo label/input con `htmlFor`/`id`.

## Filtros y estado en URL

- **La URL es la fuente de verdad.** Tab, filtros y search se restauran desde query params. Sin params → valores predeterminados.
- Cambios de filtro/tab no recargan: `history.pushState`/`replaceState` + fetch en cliente.
- Filtros en valor predeterminado no agregan params; al elegir uno específico, sí. Tab activa siempre en `?tab=` (nunca `#hash`; hashes viejos se adoptan en cliente).
- Filtros interoperables (AND).
- Los `*Filterable` usan `useFilteredData` (`src/lib/ui/useFilteredData.ts`): maneja filtros, fetch, URL y estado de error (`error`, mostrado como banner `role="alert"`). El estado inicial de filtros se restaura desde la URL; excluye `tab` (lo gestiona `TabBar`).
- `TabBarWithMonth` dispatchea `window.dispatchEvent(new CustomEvent("monthchange", { detail: { month } }))`. Lo escuchan `RecurringPaymentsMonthly`, `RecurringPaymentsHistory`, `CreditCardSummary`, `CardsHistory` para refetchear.

### Filtro de mes

- Antigüedad < 12 meses: meses desde el registro hasta el actual + el siguiente.
- Antigüedad ≥ 12 meses: últimos 12 meses incl. actual + el siguiente.
- Opción "Últimos 12 meses" (`FILTER_ALL_MONTHS`).
- **Resumen general** → mes actual por defecto. **Historial/registros** → "Últimos 12 meses" por defecto.
- Sin `month`, las APIs y SSR aplican `lastYearWindow(createdAt)` (`src/lib/date.ts`) en vez de todo el histórico. En SSR de transacciones con ventana por defecto se añade `limit: 200`.

## Componentes

### UI compartida (`src/components/ui/`)

| Componente | Descripción |
|---|---|
| `ThemeToggle.tsx` | Toggle claro/oscuro/sistema con persistencia localStorage |
| `Select.tsx` | Combobox accesible, dropdown portaleado `position: fixed`, viewport-aware. Prop `fitWidest` |
| `MultiSelect.tsx` | Selección múltiple con checkboxes |
| `ErrorBoundary.tsx` | Error boundary React (`role="alert"` con `labels.error.message`) |

### UI de App (`src/components/app/ui/`)

| Componente | Descripción |
|---|---|
| `CrudModal.tsx` | Modal CRUD genérico (disparado por `data-create="module"` / `data-edit-{module}="id"`) |
| `FormModal.tsx` | Modal base: focus trap, Escape, autofocus, ARIA |
| `ConfirmDelete.tsx` / `DeleteHandler.astro` | Confirmación de borrado sin `confirm()` nativo |
| `ToggleHandler.astro` | Toggle activo/inactivo (try/catch + reload solo en éxito) |
| `DataTable.astro` | Tabla con prop `ariaLabel` (`.astro`) |
| `TabBar.tsx` | Tabs APG; en móvil se convierten en Select custom |
| `TabBarWithMonth.tsx` | `TabBar` + `MonthSelector` + evento `monthchange` |
| `MonthSelector.tsx` | Navegación mensual |
| `FilterSelect.tsx` | Select que navega a un href con el filtro |
| `FilterLinks.astro` | Pills de filtro con estado activo |
| `CurrencySelect.tsx` | Selector de moneda, sincroniza API + localStorage |
| `PageHeader.astro` | Título + botón CTA (`createLabel`/`createModule`) |
| `Sidebar.astro` | Sidebar navegación data-driven (`APP_LINKS`) + ThemeToggle + CurrencySelect + UserButton |

### Componentes por sección (`src/components/app/{modulo}/`)

- **Dashboard**: `DashboardHeader.tsx` (solo `MonthSelector`).
- **Transacciones**: `TransactionsFilterable.tsx`.
- **Plazos**: `InstallmentsFilterable.tsx` + `InstallmentsSummary.tsx`.
- **Cashback**: `CashbackFilterable.tsx`.
- **Despensa**: `PantryFilterable.tsx`.
- **Tarjetas**: `CreditCardSummary.tsx` + `CardsHistory.tsx`.
- **Pagos recurrentes**: `RecurringPaymentsMonthly.tsx` + `RecurringPaymentsHistory.tsx`.
- **Compras**: `ShoppingList.tsx`.

### Reglas de uso Select vs MultiSelect

- Filtro de mes → siempre `Select` custom.
- Cualquier otro filtro con conjunto de opciones → `MultiSelect`.
- Seleccionar todas las opciones → todos los registros (sin restricción).

### Tabs (patrón APG)

`role="tablist"` + `aria-label`; tabs con `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`, navegación ←/→/Home/End; paneles `role="tabpanel"` + `aria-labelledby` + `tabindex="0"`. Implementado en `TabBar.tsx` y duplicado en `ShoppingList.tsx`. En móvil, las tabs se convierten en Select custom (misma línea que el filtro de mes).

## Dashboard

- Contenido **100% SSR** en `src/pages/app/dashboard.astro` (sin islas React de contenido).
- `DashboardHeader.tsx` — solo `MonthSelector`, alineado a la derecha del título.
- Datos desde `src/lib/dashboard/load.ts` → `loadDashboardMonth(userId, month)`: mismas queries que la API pero vía repositorios (sin HTTP). No recalcula deudas ni hace `upsert` de `card_monthly` por visita (eso ocurre bajo demanda desde cliente vía `/api/card-monthly/calculate` y desde la página de tarjetas).
- `src/lib/dashboard/api.ts` → `payCardDebtFull` / `payCardDebtPartial` (mutaciones de pago desde cliente).
- Cards de métricas: ingresos, gastos, saldo, tarjetas de crédito, cuotas, recurrentes, tareas pendientes, eventos próximos, compras activas.

## Manejo de errores

- **API**: todos los handlers (factory y custom) envueltos en `withErrorHandling`; bodies parseados con `readJsonBody` (400 "Body inválido"). Errores → JSON con `console.error`, nunca HTML.
- **Fetch en cliente**: `src/lib/safeFetch.ts` — `safeFetch<T>` (GET → data, mutación → boolean) y `fetchList<T>`. Loguea errores con `console.error` en vez de tragarlos silenciosamente.
- **`api-client.ts`** — `apiFetch<T>` lanza `Error` con el mensaje del servidor si `!res.ok`.
- **Hooks**: `useFilteredData` devuelve `error` (string) que los `*Filterable` muestran como banner `role="alert"`. Nunca silenciar errores de fetch.
- **React**: `ErrorBoundary` en `src/components/ui/`.
- **Confirmación de borrado**: `ConfirmDelete` (sin `confirm()` nativo). Errores de formulario inline con `role="alert"`.

## PWA

- Activa solo en `/app/*`.
- `AppLayout` inyecta vía `slot="head"`: manifest link, theme-color y meta tags.
- `public/sw.js`: precachea rutas `/app/*`, network-first con fallback a cache.
- `public/manifest.webmanifest`: `scope: "/app/"`, `start_url: "/app/dashboard"`, `display: standalone`.

## Accesibilidad

- `:focus-visible` global en `global.css`.
- Iconos decorativos: `aria-hidden="true"`.
- Navegación, inputs, botones sin texto visible: `aria-label`.
- Modales: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape.
- Select/MultiSelect: `role="combobox"`, `aria-activedescendant`, prop `ariaLabel`.
- DataTable: prop `ariaLabel`.
- Labels/inputs vinculados con `htmlFor`/`id`.

## Variables de entorno

Declaradas con el schema `envField` de Astro en `astro.config.mjs` (`env.schema`). Valida en build que existan las obligatorias y da tipos para `import.meta.env.*`.

| Variable | Contexto | Acceso | Descripción |
|---|---|---|---|
| `TURSO_DB_URL` | server | secret | URL base de datos Turso |
| `TURSO_DB_TOKEN` | server | secret | Token de autenticación Turso |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | client | public | Publishable key de Clerk |
| `CLERK_SECRET_KEY` | server | secret | Secret key de Clerk |

## Despliegue

- Build: `pnpm build` → `dist/`.
- Adapter: `@astrojs/netlify` (serverless functions).
- `@libsql/client/web` compatible con Netlify Functions.
- Site: `https://ophrp.marcvspt.tech`.
