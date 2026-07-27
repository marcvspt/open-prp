# Open PRP

**Personal Resource Planning** — Aplicación web para gestión financiera y organización personal. Centraliza el registro de transacciones, plazos, tarjetas de crédito, pagos recurrentes, compras, despensa, notas, tareas, eventos, cashback y más en un solo lugar.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | [Astro](https://astro.build) (SSR) |
| UI (React) | [React 19](https://react.dev) con `client:load` |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com) |
| Base de datos | [Turso](https://turso.tech) (libSQL) |
| Cliente BD | [@libsql/client](https://www.npmjs.com/package/@libsql/client) |
| Auth | [Clerk](https://clerk.com) |
| Despliegue | Netlify |
| Paquetería | [pnpm](https://pnpm.io) |

## Stack frontend

- **Astro SSR**: renderizado en servidor con hidratación progresiva de componentes React
- **Ruteo protegido**: `/` es landing page pública con CTA a `/app`; `/app` redirige a `/app/dashboard` (logueado) o `/app/login` (no logueado). Middleware protege toda ruta `/app/*` excepto `/app/login`.
- **Layouts**: `BaseLayout.astro` (contiene `<html>`, `<head>`, meta, favicon, dark mode inline script) como base compartida. `AppLayout.astro` y `LandingLayout.astro` lo extienden.
- **Sidebar**: fija en escritorio (`w-64`), oculta en móvil (slide-in drawer con overlay + backdrop). Navegación data-driven (`APP_LINKS`), GitHub link, ThemeToggle, CurrencySelect, y área de usuario (UserButton + "Mi cuenta").
- **Separación lógica/UI**: la lógica sin dependencias de framework vive en `src/lib/` (reutilizable aunque la capa de UI migre):
  - `src/lib/ui/` — lógica de browser en vanilla TS: `theme.ts`, `currency.ts`, `sidebar.ts`, `tabs.ts`
  - `src/lib/dashboard/api.ts` — carga de datos y pagos del dashboard
  - `src/lib/format.ts` — `formatCurrency`; `src/lib/safeFetch.ts` — `safeFetch` + `fetchList`
- **Tipos**: todos los tipos de dominio en `src/lib/types/` (un archivo por dominio). Imports con alias `@/` y extensión explícita (`.ts`, `.tsx`, `.astro`, `.svg`).
- **Select personalizado**: componente combobox accesible con teclado, usado en toda la app
- **MultiSelect**: componente propio para selección múltiple de secciones (checkboxes + "Todas")
- **Modal CRUD genérico**: `CrudModal.tsx` que escucha eventos `data-create` / `data-edit` y renderiza formularios dinámicamente
- **Componentes compartidos**: `StatCard.tsx` (cards de métricas del dashboard), `FilterLinks.astro` (filtros tipo pill de las páginas), `FeatureCard.astro` (landing)
- **Tema oscuro/claro/sistema** con persistencia en localStorage; Clerk se adapta vía `color-scheme`
- **Título**: `"Open PRP | {title}"` generado por BaseLayout; sidebar muestra "OPRP"
- **Iconos SVG**: 18 archivos en `src/assets/` (kebab-case: `card.svg`, `home.svg`, etc.), importados vía `@/assets/*` con `vite-plugin-svgr`; el identificador importado es PascalCase con sufijo `Icon`
- **Landing page**: header con links data-driven (`LANDING_LINKS`), CTA "Ir a la app", GitHub icon, ThemeToggle; features renderizadas desde `FEATURES_INFO`; footer con GitHub + marcvspt.tech
- **Colores semánticos**: `primary`, `success`, `danger`, `warning`, `info` como `@theme` tokens con variantes `-hover`, `-text`, `-bg`, `-border` y valores oscuros

## Stack backend

- **API REST**: endpoints en `src/pages/api/*` (Astro API Routes)
- **Repositorios**: cada módulo tiene su `repository.ts` con métodos `findAll`, `create`, `update`, `delete`
- **SQL directo**: todas las queries usan `db.execute({ sql, args })` con bind parameters `?`
- **Helpers**: `nextSeq()` para ordenamiento, `getDb()` singleton
- **Middleware**: sincroniza perfil de Clerk (email, display_name) en cada request si `needsSync()` detecta datos vacíos o más de 5 min desde el último sync
- **Tipos**: sin `any`, imports con alias `@/`, catch tipados

## Primeros pasos

### 1. Clonar e instalar

```sh
git clone <tu-fork>
cd open-prp
pnpm install
```

### 2. Configurar variables de entorno

Crea los archivos de entorno:

```sh
# Variables de desarrollo
.env.development
# Variables de producción
.env.production
```

Agrega las siguientes variables:

```env
TURSO_DB_URL=libsql://<tu-db>.turso.io
TURSO_DB_TOKEN=<tu-token>
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_********************
CLERK_SECRET_KEY=sk_********************
```

### 3. Turso — Base de datos

1. Regístrate en [turso.tech](https://turso.tech)
2. Instala la CLI:
   ```sh
   pnpm add -g @turso/cli
   ```
3. Inicia sesión:
   ```sh
   turso auth login
   ```
4. Crea una base de datos:
   ```sh
   turso db create open-prp
   ```
5. Obtén las credenciales:
   ```sh
   turso db show open-prp --url        # → TURSO_DB_URL
   turso db tokens create open-prp     # → TURSO_DB_TOKEN
   ```
6. Agrega al `.env`:
   ```env
   TURSO_DB_URL=libsql://<tu-db>.turso.io
   TURSO_DB_TOKEN=<tu-token>
   ```

### 4. Clerk — Autenticación

1. Regístrate en [clerk.com](https://clerk.com)
2. Crea una nueva aplicación
3. En las **API Keys** de la aplicación, copia:
   - `PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_*)
   - `CLERK_SECRET_KEY` (sk_*)
4. Agrega al `.env`:
   ```env
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_********************
   CLERK_SECRET_KEY=sk_********************
   ```

5. En el dashboard de Clerk, configura las **redirect URLs**:
   - `http://localhost:4321` (desarrollo)
   - `https://<tu-dominio>` (producción)

### 5. Sembrar la base de datos

```sh
# Desarrollo (carga .env + .env.development)
pnpm db:seed:dev

# Producción (carga .env + .env.production)
pnpm db:seed:prod
```

Esto crea las tablas y los datos iniciales:
- 3 métodos de pago globales con emojis  
- 28 categorías predefinidas con iconos, distribuidas en 6 secciones (sin duplicados por nombre)

### 6. Iniciar servidor de desarrollo

```sh
pnpm dev
# o en background:
astro dev --background
# Ver logs:
astro dev logs
# Detener:
astro dev stop
```

## Estructura del proyecto

```
src/
├── assets/                     # 18 SVG icons (kebab-case), importados vía @/assets/* con svgr
├── components/
│   ├── app/                    # Componentes de la aplicación
│   │   ├── dashboard/          # DashboardContent.tsx (tabs + MonthSelector) + StatCard.tsx
│   │   ├── recurring-payments/ # RecurringPaymentsMonthly.tsx (grid de cards mensual)
│   │   ├── shopping/           # ShoppingList.tsx (tabs lista/historial)
│   │   └── ui/                 # UI específica de la app
│   │       ├── CrudModal.tsx       # Modal CRUD genérico
│   │       ├── DataTable.astro     # Tabla con tipado
│   │       ├── FilterLinks.astro   # Filtros tipo pill compartidos
│   │       ├── FormModal.tsx       # Modal base
│   │       ├── MonthSelector.tsx
│   │       ├── CurrencySelect.tsx
│   │       ├── PageHeader.astro
│   │       ├── DeleteHandler.astro
│   │       ├── ToggleHandler.astro
│   │       └── Sidebar.astro       # Sidebar con APP_LINKS, GitHub, ThemeToggle, UserButton
│   ├── ui/                     # Componentes compartidos (app + landing)
│   │   ├── ThemeToggle.tsx
│   │   ├── Select.tsx          # Combobox accesible
│   │   ├── MultiSelect.tsx     # Select multisección
│   │   └── ErrorBoundary.tsx   # Límite de error React
│   └── landing/                # Componentes de landing page
│       ├── Header.astro        # Nav con LANDING_LINKS + GitHub + ThemeToggle
│       ├── Hero.astro
│       ├── FeatureCard.astro   # Card de característica (usada desde FEATURES_INFO)
│       └── Footer.astro        # Footer con GitHub + marcvspt.tech
├── layouts/
│   ├── BaseLayout.astro        # <html>, <head>, meta, favicon, dark mode script
│   ├── AppLayout.astro         # Sidebar + main + login screen
│   └── LandingLayout.astro     # Header + slot + Footer
├── lib/
│   ├── api-client.ts           # Helper fetch client-side
│   ├── api-helpers.ts          # jsonResponse, errorResponse, requireUserId
│   ├── date.ts                 # Utilerías de fecha
│   ├── format.ts               # formatCurrency
│   ├── safeFetch.ts            # safeFetch + fetchList (normaliza arrays y PaginatedResponse)
│   ├── ui/                     # Lógica de browser sin framework
│   │   ├── theme.ts            # Tema claro/oscuro/sistema
│   │   ├── currency.ts         # Moneda preferida
│   │   ├── sidebar.ts          # Drawer móvil + forward click
│   │   └── tabs.ts             # Tabs genéricas con hash en URL
│   ├── dashboard/
│   │   └── api.ts              # Carga de datos y pagos del dashboard
│   ├── db/
│   │   ├── client.ts           # Cliente singleton @libsql/client/web
│   │   └── utils.ts            # nextSeq() para ordenamiento
│   ├── modules/                # Módulos de negocio (cada uno con repository.ts)
│   │   ├── transactions/       # Incluye categories.ts (repositorio unificado)
│   │   ├── card-monthly/       # Incluye calculator.ts
│   │   ├── cashback/
│   │   ├── cards/
│   │   ├── events/
│   │   ├── installments/
│   │   ├── notes/              # Incluye tags.ts
│   │   ├── pantry/
│   │   ├── payment-methods/
│   │   ├── recurring-payments/ # Incluye upsertMonthly()
│   │   ├── shopping/
│   │   ├── tasks/
│   │   └── users/
│   └── types/                  # 1 archivo por módulo, sin `any`
├── pages/
│   ├── api/                    # API REST endpoints
│   ├── index.astro             # Landing page pública con CTA a /app
│   └── app/                    # Páginas protegidas de la aplicación
│       ├── index.astro         # Redirige a /app/dashboard o /app/login
│       ├── dashboard.astro     # Dashboard principal (tabs + MonthSelector)
│       ├── login.astro         # Pantalla de login
│       ├── cashback.astro
│       ├── categories.astro
│       ├── cards.astro
│       ├── events.astro
│       ├── installments.astro
│       ├── notes.astro
│       ├── pantry.astro
│       ├── payment-methods.astro
│       ├── recurring-payments.astro
│       ├── shopping.astro
│       ├── tasks.astro
│       └── transactions.astro
├── middleware.ts               # Clerk middleware + auth redirect + sync de perfil
├── env.d.ts                    # Tipos de entorno
└── styles/global.css           # Tailwind v4 + @theme tokens + color-scheme
db/
├── schema/                     # SQL modular, 1 archivo por módulo
│   ├── 01-users.sql
│   ├── 02-cards.sql
│   ├── 03-categories.sql
│   ├── 04-installments.sql
│   ├── 05-transactions.sql
│   ├── 06-pantry.sql
│   ├── 07-notes.sql
│   ├── 08-events.sql
│   ├── 09-recurring-payments.sql
│   ├── 10-cashback.sql
│   ├── 11-shopping.sql
│   ├── 12-tasks.sql
│   ├── 13-payment-methods.sql
│   └── 14-card-monthly.sql
└── seed.js                     # Script de siembra con emojis
```

## Sistema de categorías unificado

Todas las categorías viven en una sola tabla `categories`. Cada categoría tiene un campo `sections` (JSON array) que determina en qué secciones aparece:

```json
["despensa", "tareas"]        // Aparece en Despensa y Tareas
["transacciones", "plazos"]   // Aparece en Transacciones y Plazos
```

**Categorías globales** (`type = "global"`): vienen precargadas con el seed, no se pueden editar ni eliminar.
**Categorías personales** (`type = "personal"`): creadas por el usuario, editables y eliminables.

**Unicidad por nombre**: no se pueden crear dos categorías con el mismo nombre (ni global ni personal). El schema tiene `UNIQUE(user_id, name)` y la API valida antes de crear. Si el nombre ya existe, la API responde con error 409.

La gestión se hace desde `/app/categories`.

## Tipos de categoría y método de pago

- **CategoryType**: `"global" | "personal"` (sin `"family"` ni `"both"`)
- **PaymentMethodType**: `"global" | "personal" | "card"` (sin `"family"` ni `"both"`)

## Despliegue

### Build

```sh
pnpm build    # Genera dist/
```

### Netlify

El adaptador ya está configurado en `astro.config.mjs`. Conectar el repo en Netlify y agregar estas variables de entorno en el dashboard:

- `TURSO_DB_URL`
- `TURSO_DB_TOKEN`
- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

> El cliente `@libsql/client/web` funciona en Netlify Functions sin cambios.

## Comandos útiles

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `astro dev --background` | Dev en background |
| `astro dev logs` | Logs del dev server |
| `astro dev stop` | Detener dev server |
| `pnpm build` | Build de producción |
| `pnpm preview` | Vista previa del build de producción |
| `pnpm db:seed:dev` | Seed (desarrollo) |
| `pnpm db:seed:prod` | Seed (producción) |

## Créditos

Desarrollado con [OpenCode](https://opencode.ai) — un asistente de IA para ingeniería de software que colaboró en el diseño, refactorización y documentación del proyecto.

---

**Open PRP** — Personal Resource Planning
