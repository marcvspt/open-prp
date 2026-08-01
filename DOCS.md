# Open PRP — Documentación técnica

## Arquitectura

```
cliente (navegador) → Astro SSR → API Routes → Repositorios → Turso (libSQL)
                          ↕
                    Clerk (Auth)
```

- **SSR completo**: Astro renderiza en servidor, React se hidrata con `client:load`
- **API REST**: endpoints en `src/pages/api/*` con helpers `jsonResponse`, `errorResponse`, `requireUserId`
- **Sin ORM**: queries SQL directas con `@libsql/client/web` y bind params `?`

## Enrutamiento

```
/                          → Landing pública
/app/*                     → Protegida por middleware (Clerk)
/app/login                 → Excepción, pública
/app/dashboard             → Página principal autenticado
/app/{modulo}              → CRUD de cada módulo
/api/{modulo}/             → CRUD API (index + [id])
/api/{modulo}/[id]/monthly → Sub-rutas anidadas (recurring-payments)
/api/users/currency        → Preferencia de moneda
```

## Middleware (`src/middleware.ts`)

1. Clerk valida sesión
2. `findOrCreate()` crea usuario local si no existe
3. `needsSync()` actualiza email/display_name desde Clerk API si datos vacíos o >5 min
4. Inyecta `context.locals.userId`
5. Redirige a `/app/login` si no autenticado en ruta `/app/*`

## Base de datos

### Conexión (`src/lib/db/client.ts`)

```ts
getDb() → cliente singleton @libsql/client/web
```

### Helper (`src/lib/db/utils.ts`)

```ts
nextSeq("table") → COALESCE(MAX(seq), 0) + 1
```

### Schema (`db/schemas/`)

14 archivos modulares, idempotentes. Representan estado final para deploys nuevos.

| # | Archivo | Tabla principal |
|---|---|---|
| 01 | `01-users.sql` | `users` |
| 02 | `02-cards.sql` | `cards` |
| 03 | `03-categories.sql` | `categories` |
| 04 | `04-installments.sql` | `installments` |
| 05 | `05-transactions.sql` | `transactions` |
| 06 | `06-pantry.sql` | `pantry` + `pantry_categories` |
| 07 | `07-notes.sql` | `notes` + `note_tags`, `note_tag_links` |
| 08 | `08-events.sql` | `events` |
| 09 | `09-recurring-payments.sql` | `recurring_payments` + `recurring_payment_monthly` |
| 10 | `10-cashback.sql` | `cashback` |
| 11 | `11-shopping.sql` | `shopping` |
| 12 | `12-tasks.sql` | `tasks` |
| 13 | `13-payment-methods.sql` | `payment_methods` |
| 14 | `14-card-monthly.sql` | `card_monthly` |

### Seed (`db/seed.js`)

Inserta datos iniciales: 3 métodos de pago globales con emojis, 28 categorías predefinidas en 6 secciones.

## API REST

Todas las rutas API siguen el patrón:

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/api/{modulo}` | Listar (con paginación `?page=N`) |
| `GET` | `/api/{modulo}/[id]` | Obtener uno |
| `POST` | `/api/{modulo}` | Crear |
| `PUT` | `/api/{modulo}/[id]` | Actualizar |
| `DELETE` | `/api/{modulo}/[id]` | Eliminar |

Endpoints especiales:

| Ruta | Acción |
|---|---|
| `POST /api/card-monthly/calculate` | Calcula deuda de tarjeta en un mes |
| `GET /api/card-monthly/history` | Historial de pagos de tarjetas |
| `POST /api/recurring-payments/[id]/monthly` | Upsert snapshot mensual |
| `POST /api/shopping/toggle` | Toggle check de item |
| `POST /api/shopping/complete` | Completar todos los checked |
| `POST /api/tasks/toggle` | Toggle completado de tarea |
| `GET /api/users/currency` | Obtener moneda preferida |
| `PUT /api/users/currency` | Actualizar moneda preferida |

### Helpers API (`src/lib/api-helpers.ts`)

- `jsonResponse(data, status?)` — respuesta JSON estándar
- `errorResponse(message, status?)` — error JSON
- `requireUserId(context)` — extrae userId o lanza 401
- `getSearchParams(url)` — wrapper typed
- `parsePageParams(url)` — extrae `page` con default 1

## Tipos (`src/lib/types/`)

16 archivos, uno por dominio. Convenciones:

- Todos los IDs son `number`
- `category_id`, `payment_method_id`, `card_id` son `number | null` si opcionales
- `amount`, `total`, `balance` son `number`
- `created_at` es string ISO
- Sin `any`, sin `scope`, sin `family_id`

## Módulos

Cada módulo en `src/lib/modules/{name}/` contiene:

```
repository.ts      → CRUD + queries específicas
(opcional)
calculator.ts      → card-monthly: cálculo de deuda
categories.ts      → transactions: repo unificado de categorías
tags.ts            → notes: repo de tags
```

### Card Monthly

`calculator.ts` → `calculateCardDebt(cardId, month)`:

```
Deuda = SUM(transacciones del mes)
       + SUM(cuota mensual de plazos activos)
       + SUM(pagos recurrentes del mes)
       - SUM(cashback aplicado)
```

### Recurring Payments

- `findAll()` hace LEFT JOIN con `categories` + `payment_methods` para traer nombres e iconos
- `upsertMonthly()` copia `category_id` + `payment_method_id` como snapshot al generar mes

### Categories

- `UNIQUE(user_id, name)` — no dos categorías con mismo nombre
- `type: "global"` (precargadas, no editables) o `"personal"` (creadas por usuario)
- `sections: string[]` (JSON) — determina en qué módulos aparece la categoría

## Componentes

### UI Compartida (`src/components/ui/`)

| Componente | Descripción |
|---|---|
| `ThemeToggle.tsx` | Toggle claro/oscuro/sistema con persistencia localStorage |
| `Select.tsx` | Combobox accesible con teclado, dropdown portaleado `position: fixed` |
| `MultiSelect.tsx` | Selección múltiple con checkboxes, dropdown portaleado |
| `ErrorBoundary.tsx` | Error boundary React |

### UI de App (`src/components/app/ui/`)

| Componente | Descripción |
|---|---|
| `CrudModal.tsx` | Modal CRUD genérico, disparado por `data-create` / `data-edit` |
| `FormModal.tsx` | Modal base con focus trap, Escape, ARIA |
| `DataTable.astro` | Tabla tipada con slots para acciones |
| `FilterLinks.astro` | Pills de filtro con estado activo |
| `CurrencySelect.tsx` | Selector de moneda, sincroniza API + localStorage |
| `MonthSelector.tsx` | Navegación mensual |
| `Sidebar.astro` | Sidebar navegación data-driven |
| `PageHeader.astro` | Título + botón crear |
| `DeleteHandler.astro` | Maneja eliminación vía evento |
| `ToggleHandler.astro` | Maneja toggles vía evento |

### Dashboard

- `DashboardContent.tsx`: 6 tabs (Resumen, Tarjetas, Plazos, Eventos, Tareas, Historial)
- `StatCard.tsx`: card de métrica con label, valor, color, subtext opcional
- Datos: `fetchDashboardMonth(date)` y `fetchDashboardHistory(date)` desde `src/lib/dashboard/api.ts`
- Pagos: `payCardDebtFull(cardMonthlyId)` y `payCardDebtPartial(cardMonthlyId, amount)`

## PWA

- Solo activa en `/app/*`
- Manifest: `public/manifest.webmanifest` — `scope: "/app/"`, `display: standalone`
- Service Worker: `public/sw.js` — precachea rutas app, network-first con fallback cache
- Activación: AppLayout inyecta `<link rel="manifest">` + `<meta theme-color>` via `slot="head"` y registra el SW

## Formularios (`src/lib/form-fields.ts`)

Campos compartidos para CrudModal:

```ts
// Helpers
paymentMethodField(userId)  → select de métodos de pago
categoryField(userId, sections) → select de categorías filtrado por secciones
cardField(userId)  → select de tarjetas
dateField()  → input date

// Constantes
CURRENCY_OPTIONS → [{ value: "MXN", label: "MXN ($)" }, ...]
TYPE_OPTIONS → [{ value: "expense", label: "Gasto" }, ...]

// Clases
INPUT_CLASS → "w-full rounded-lg border border-border bg-surface..."
COLOR_CLASS → "w-full h-10 rounded-lg border border-border..."
```

**Orden estándar de campos**: Fecha → Tipo → Descripción → Monto → Moneda → Método pago → Tarjeta → Categoría → específicos.

## Eventos y Tareas (layout de cards)

No usan DataTable. Renderizan cards con:

- **Eventos**: descripción, badge de estado (color + icono), fechas inicio/fin, categoría, ubicación
- **Tareas**: checkbox, descripción, badge de prioridad (color + icono), categoría, fecha vencimiento

## Accesibilidad

- `:focus-visible` global en `global.css`
- Iconos decorativos: `aria-hidden="true"`
- Navegación, inputs, botones sin texto: `aria-label`
- Modales: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape
- Select/MultiSelect: `role="combobox"`, `aria-activedescendant`, `ariaLabel` prop
- DataTable: `ariaLabel` prop
- Labels/inputs vinculados con `htmlFor`/`id`

## Variables de entorno

| Variable | Contexto | Descripción |
|---|---|---|
| `TURSO_DB_URL` | server/secret | URL base de datos Turso |
| `TURSO_DB_TOKEN` | server/secret | Token de autenticación Turso |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | client/public | Publishable key de Clerk |
| `CLERK_SECRET_KEY` | server/secret | Secret key de Clerk |

## Despliegue

- Build: `pnpm build` → output en `dist/`
- Adapter: `@astrojs/netlify` (serverless functions)
- `@libsql/client/web` compatible con Netlify Functions
- Site: `https://ophrp.marcvspt.tech`
